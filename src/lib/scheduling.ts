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
  bio: string;
  avatar_url: string | null;
  consultation_duration: number;
  price: number;
  rating: number;
  total_consultations: number;
}

export interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  consultation_type: 'initial' | 'followup' | 'prescription_renewal';
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

export async function getAvailableDoctors(): Promise<Doctor[]> {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('status', 'approved')
    .order('rating', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAvailableSlots(
  doctorId: string,
  date: Date
): Promise<TimeSlot[]> {
  const dayOfWeek = date.getDay();

  // 1. Get doctor availability for this day
  const { data: availability } = await supabase
    .from('doctor_availability')
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .maybeSingle();

  if (!availability) return [];

  // 2. Get doctor info for duration
  const { data: doctor } = await supabase
    .from('doctors')
    .select('consultation_duration')
    .eq('id', doctorId)
    .single();

  const duration = doctor?.consultation_duration || 30;

  // 3. Get already booked consultations
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: booked } = await supabase
    .from('consultations')
    .select('scheduled_at, duration_minutes')
    .eq('doctor_id', doctorId)
    .gte('scheduled_at', startOfDay.toISOString())
    .lte('scheduled_at', endOfDay.toISOString())
    .not('status', 'in', '("cancelled","no_show")');

  // 4. Filter out past slots if date is today
  const slots = generateSlots(
    availability.start_time,
    availability.end_time,
    duration,
    booked || []
  );

  const isToday = new Date().toDateString() === date.toDateString();
  if (isToday) {
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    return slots.map(s => {
      const [h, m] = s.time.split(':').map(Number);
      return { ...s, available: s.available && (h * 60 + m) > nowMinutes };
    });
  }

  return slots;
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

  // Get doctor price
  const { data: doctor } = await supabase
    .from('doctors')
    .select('price, platform_fee_percent, consultation_duration')
    .eq('id', doctorId)
    .single();

  if (!doctor) throw new Error('Médico não encontrado');

  const price = doctor.price;
  const platformFee = price * (doctor.platform_fee_percent / 100);
  const doctorPayout = price - platformFee;
  const roomId = crypto.randomUUID();

  const scheduledAt = new Date(`${date}T${time}:00`);

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
      consultation_type: consultationType,
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

  const { data } = await supabase
    .from('consultations')
    .select('*, doctors(name, specialty, crm)')
    .eq('patient_id', patientId)
    .gte('scheduled_at', start.toISOString())
    .lte('scheduled_at', end.toISOString())
    .eq('status', 'scheduled')
    .maybeSingle();

  return data || null;
}

export async function cancelConsultation(consultationId: string, patientId: string): Promise<void> {
  const { error } = await supabase
    .from('consultations')
    .update({ status: 'cancelled' })
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
