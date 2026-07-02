import { supabase } from '../services/supabase';

export interface TimeSlot {
  time: string; // "HH:MM"
  available: boolean;
}

export interface Doctor {
  id: string;
  name: string;
  crm: string;
  specialty: string;
  objectives?: string[];
  bio: string;
  avatar_url: string | null;
  photo_url?: string | null;
  consultation_duration: number;
  price: number;
  consultation_price?: number;
  platform_fee_percent?: number;
  rating: number;
  total_consultations: number;
}

export interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  type: 'initial' | 'followup' | 'prescription_renewal';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  room_id: string;
  price: number;
  notes: string | null;
  started_at: string | null;
  ended_at: string | null;
  rating: number | null;
  rating_comment: string | null;
  consent_at: string | null;
  doctors?: { name: string; specialty: string; crm: string };
  reschedule_proposals?: { date: string }[] | null;
  reschedule_message?: string | null;
  reschedule_status?: 'pending' | 'accepted' | 'rejected' | null;
}

function generateSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  bookedConsultations: { scheduled_at: string; duration_minutes: number }[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let current = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;

  while (current + durationMinutes <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    const timeStr = `${h}:${m}`;

    // Check conflict with booked consultations
    const hasConflict = bookedConsultations.some(b => {
      const bookedStart = new Date(b.scheduled_at);
      const bookedStartMin = bookedStart.getHours() * 60 + bookedStart.getMinutes();
      const bookedEndMin = bookedStartMin + (b.duration_minutes || 30);
      return current < bookedEndMin && current + durationMinutes > bookedStartMin;
    });

    slots.push({ time: timeStr, available: !hasConflict });
    current += durationMinutes;
  }

  return slots;
}

export async function getAvailableDoctors(objective?: string): Promise<Doctor[]> {
  console.log('🔍 [scheduling.ts] Buscando médicos disponíveis...', objective ? `objetivo: ${objective}` : '');

  let query = supabase
    .from('doctors')
    .select('*')
    .eq('status', 'approved')
    .order('rating', { ascending: false });

  if (objective) {
    query = query.contains('objectives', [objective]);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ [scheduling.ts] Erro ao buscar médicos:', error);
    throw error;
  }

  // Normalizar dados: mapear consultation_price para price
  const doctors = (data || []).map(doc => ({
    ...doc,
    price: doc.consultation_price || doc.price || 249,
    avatar_url: doc.photo_url || doc.avatar_url,
    rating: doc.rating || 4.5,
    total_consultations: doc.total_consultations || 0,
  }));

  console.log('✅ [scheduling.ts] Médicos encontrados:', doctors.length);
  console.table(doctors);

  return doctors;
}

export async function getAvailableSlots(
  doctorId: string,
  date: Date
): Promise<TimeSlot[]> {
  const dayOfWeek = date.getDay();
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  console.log('🕒 [scheduling.ts] Buscando horários disponíveis...');
  console.log('  - Doctor ID:', doctorId);
  console.log('  - Data:', date.toLocaleDateString('pt-BR'));
  console.log('  - Dia da semana:', days[dayOfWeek], `(${dayOfWeek})`);

  // 1. Get ALL doctor availabilities for this day (supports multiple slots)
  const { data: availabilities, error: availError } = await supabase
    .from('doctor_availability')
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true);

  if (availError) {
    console.error('❌ [scheduling.ts] Erro ao buscar disponibilidade:', availError);
  }

  if (!availabilities || availabilities.length === 0) {
    console.warn(`⚠️  [scheduling.ts] NENHUMA disponibilidade para ${days[dayOfWeek]}`);
    return [];
  }

  console.log(`✅ [scheduling.ts] ${availabilities.length} blocos de disponibilidade encontrados para ${days[dayOfWeek]}`);

  // 2. Get doctor info for duration
  const { data: doctor } = await supabase
    .from('doctors')
    .select('consultation_duration')
    .eq('id', doctorId)
    .single();

  const duration = doctor?.consultation_duration || 30;
  console.log('⏱️  [scheduling.ts] Duração da consulta:', duration, 'minutos');

  // 3. Get existing consultations for this date to mark slots as unavailable
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: booked, error: bookedError } = await supabase
    .from('consultations')
    .select('scheduled_at, duration_minutes')
    .eq('doctor_id', doctorId)
    .gte('scheduled_at', startOfDay.toISOString())
    .lte('scheduled_at', endOfDay.toISOString())
    .not('status', 'in', '("cancelled","no_show")');

  if (bookedError) {
    console.error('❌ [scheduling.ts] Erro ao buscar consultas:', bookedError);
  }

  console.log('📅 [scheduling.ts] Consultas existentes no dia:', booked?.length || 0);

  // 4. Generate time slots from EACH availability block and merge
  const allSlots: TimeSlot[] = [];
  const seenTimes = new Set<string>();

  for (const avail of availabilities) {
    const blockSlots = generateSlots(
      avail.start_time,
      avail.end_time,
      duration,
      booked || []
    );

    for (const slot of blockSlots) {
      if (!seenTimes.has(slot.time)) {
        seenTimes.add(slot.time);
        allSlots.push(slot);
      }
    }
  }

  // Sort chronologically
  allSlots.sort((a, b) => a.time.localeCompare(b.time));

  console.log('🕐 [scheduling.ts] Total de slots gerados:', allSlots.length);
  console.log('   Slots disponíveis:', allSlots.filter(s => s.available).length);

  const isToday = new Date().toDateString() === date.toDateString();
  if (isToday) {
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const filteredSlots = allSlots.map(s => {
      const [h, m] = s.time.split(':').map(Number);
      return { ...s, available: s.available && (h * 60 + m) > nowMinutes };
    });
    console.log('🕐 [scheduling.ts] Slots após filtro de horário atual:', filteredSlots.filter(s => s.available).length);
    return filteredSlots;
  }

  return allSlots;
}

export async function bookConsultation(params: {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  consultationType: 'initial' | 'followup' | 'prescription_renewal';
  consentGiven: boolean;
}): Promise<Consultation> {
  const { patientId, doctorId, date, time, consultationType, consentGiven } = params;

  // Get doctor price and duration
  const { data: doctor } = await supabase
    .from('doctors')
    .select('consultation_price, consultation_duration')
    .eq('id', doctorId)
    .single();

  if (!doctor) throw new Error('Médico não encontrado');

  // Get global platform fee
  const { data: feeSetting } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'default_platform_fee')
    .single();

  const globalFee = feeSetting ? parseFloat(feeSetting.value) : 25;

  const price = doctor.consultation_price || 249;
  const platformFee = price * (globalFee / 100);
  const doctorPayout = price - platformFee;
  const roomId = crypto.randomUUID();

  // Fix timezone: construir a data com offset local para evitar shift de UTC
  const localOffset = new Date().getTimezoneOffset(); // minutos, negativo no Brasil
  const offsetSign = localOffset > 0 ? '-' : '+';
  const offsetH = Math.floor(Math.abs(localOffset) / 60).toString().padStart(2, '0');
  const offsetM = (Math.abs(localOffset) % 60).toString().padStart(2, '0');
  const scheduledAt = new Date(`${date}T${time}:00${offsetSign}${offsetH}:${offsetM}`);

  // Crédito ativo do paciente: a data agendada deve estar DENTRO da validade
  // (janela de 30 dias). Não se pode agendar para uma data além do vencimento.
  const { data: activeCredit } = await supabase
    .from('consultation_credits')
    .select('id, expires_at')
    .eq('user_id', patientId)
    .eq('status', 'disponivel')
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (activeCredit && scheduledAt > new Date(activeCredit.expires_at)) {
    const limite = new Date(activeCredit.expires_at).toLocaleDateString('pt-BR');
    throw new Error(`A data escolhida está fora do período do seu crédito. Agende até ${limite}.`);
  }

  // Race condition: verify slot still available
  const startOfSlot = scheduledAt.toISOString();
  const endOfSlot = new Date(scheduledAt.getTime() + doctor.consultation_duration * 60000).toISOString();

  const { data: conflict } = await supabase
    .from('consultations')
    .select('id')
    .eq('doctor_id', doctorId)
    .gte('scheduled_at', startOfSlot)
    .lt('scheduled_at', endOfSlot)
    .not('status', 'in', '("cancelled","no_show")')
    .maybeSingle();

  if (conflict) throw new Error('Este horário acabou de ser reservado. Por favor, escolha outro.');

  const { data, error } = await supabase
    .from('consultations')
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: doctor.consultation_duration,
      type: consultationType,
      status: 'scheduled',
      room_id: roomId,
      price,
      platform_fee: platformFee,
      doctor_payout: doctorPayout,
      consent_at: consentGiven ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) throw error;

  // Vincula o crédito ao agendamento (disponivel → agendada). Isso protege o
  // crédito da expiração: uma vez agendado dentro do prazo, é honrado.
  if (activeCredit) {
    const { creditService } = await import('../services/billingService');
    await creditService.markAsScheduled(activeCredit.id, data.id, doctorId);
  }

  return data;
}

export async function getPatientConsultations(patientId: string): Promise<Consultation[]> {
  const { data, error } = await supabase
    .from('consultations')
    .select('*, doctors(name, specialty, crm)')
    .eq('patient_id', patientId)
    .order('scheduled_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTodayConsultation(patientId: string): Promise<Consultation | null> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  // Inclui no_show para a home poder avisar "você perdeu a consulta" e
  // oferecer a remarcação — antes o banner simplesmente sumia (ou pior,
  // continuava mostrando "Entrar" para um horário que já passou).
  const { data } = await supabase
    .from('consultations')
    .select('*, doctors(name, specialty, crm)')
    .eq('patient_id', patientId)
    .gte('scheduled_at', start.toISOString())
    .lte('scheduled_at', end.toISOString())
    .in('status', ['scheduled', 'in_progress', 'no_show'])
    .order('scheduled_at', { ascending: true });

  if (!data || data.length === 0) return null;
  // Prioriza a consulta ainda válida; senão mostra a perdida mais recente.
  const active = data.find(c => c.status === 'scheduled' || c.status === 'in_progress');
  return active ?? data[data.length - 1];
}

/**
 * Oficializa uma consulta perdida (paciente não entrou até 30 min após o
 * horário): marca no_show e processa o crédito — 1ª falta libera um novo
 * crédito para remarcar uma única vez; 2ª falta perde o crédito do mês.
 * Idempotente e à prova de corrida com o cron server-side: o UPDATE é
 * condicionado a status='scheduled', então só um dos lados processa.
 */
export async function processMissedConsultation(
  consultationId: string,
  patientId: string
): Promise<{ creditLost: boolean; alreadyProcessed: boolean }> {
  const { data: updated, error } = await supabase
    .from('consultations')
    .update({ status: 'no_show' })
    .eq('id', consultationId)
    .eq('patient_id', patientId)
    .eq('status', 'scheduled')
    .select('id, scheduled_at');

  if (error) throw error;
  if (!updated || updated.length === 0) {
    // Cron (ou outra aba) já processou — o crédito já foi tratado lá.
    return { creditLost: false, alreadyProcessed: true };
  }

  const { data: credit } = await supabase
    .from('consultation_credits')
    .select('id')
    .eq('appointment_id', consultationId)
    .maybeSingle();

  if (!credit) return { creditLost: false, alreadyProcessed: false };

  const { creditService } = await import('../services/billingService');
  const { creditLost } = await creditService.handleAppointmentCancellation(
    credit.id,
    consultationId,
    updated[0].scheduled_at // horário no passado → conta como falta/cancelamento tardio
  );
  return { creditLost, alreadyProcessed: false };
}

export async function cancelConsultation(consultationId: string, patientId: string): Promise<void> {
  // Buscar dados da consulta antes de cancelar (precisamos do scheduled_at)
  const { data: consultation, error: fetchError } = await supabase
    .from('consultations')
    .select('scheduled_at, status')
    .eq('id', consultationId)
    .eq('patient_id', patientId)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from('consultations')
    .update({ status: 'cancelled' })
    .eq('id', consultationId)
    .eq('patient_id', patientId);

  if (error) throw error;

  // Verificar se existe um crédito de consulta vinculado a este agendamento
  const { data: credit } = await supabase
    .from('consultation_credits')
    .select('id')
    .eq('appointment_id', consultationId)
    .maybeSingle();

  if (credit && consultation) {
    // Import dinâmico para evitar dependência circular
    const { creditService } = await import('../services/billingService');
    await creditService.handleAppointmentCancellation(
      credit.id,
      consultationId,
      consultation.scheduled_at
    );
  }
}

// Paciente aceita uma das propostas de reagendamento do médico
export async function acceptRescheduleProposal(consultationId: string, chosenDate: string): Promise<void> {
  const { error } = await supabase
    .from('consultations')
    .update({
      scheduled_at: chosenDate,
      reschedule_status: 'accepted',
      reschedule_proposals: null,
      reschedule_message: null,
    })
    .eq('id', consultationId);

  if (error) throw error;
}

// Paciente recusa todas as propostas → consulta cancelada automaticamente
export async function rejectAllRescheduleProposals(consultationId: string, patientId: string): Promise<void> {
  const { error } = await supabase
    .from('consultations')
    .update({
      status: 'cancelled',
      reschedule_status: 'rejected',
      reschedule_proposals: null,
      reschedule_message: null,
    })
    .eq('id', consultationId)
    .eq('patient_id', patientId);

  if (error) throw error;
}

export async function rateConsultation(
  consultationId: string,
  patientId: string,
  rating: number,
  comment?: string
): Promise<void> {
  const { error } = await supabase
    .from('consultations')
    .update({ rating, rating_comment: comment || null })
    .eq('id', consultationId)
    .eq('patient_id', patientId);

  if (error) throw error;
}

export async function getPatientPrescriptions(patientId: string) {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*, doctors(name, specialty)')
    .eq('patient_id', patientId)
    .order('issued_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getDoctorMessage(patientId: string) {
  const { data } = await supabase
    .from('doctor_messages')
    .select('*, doctors(name)')
    .eq('patient_id', patientId)
    .gte('visible_until', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data && !data.seen_at) {
    await supabase
      .from('doctor_messages')
      .update({ seen_at: new Date().toISOString() })
      .eq('id', data.id);
  }

  return data;
}

export async function getLatestGoalAdjustment(patientId: string) {
  const { data } = await supabase
    .from('doctor_plan_adjustments')
    .select('*, doctors(name)')
    .eq('patient_id', patientId)
    .order('applied_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
