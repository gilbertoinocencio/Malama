// =====================================================
// Malama — Portal do Médico: Serviço Supabase
// =====================================================

import { supabase } from './supabase';
import type {
  Doctor,
  DoctorAvailability,
  Consultation,
  Prescription,
  DoctorPlanAdjustment,
  DoctorMessage,
  Payout,
  PlatformSetting,
  PatientSummary,
  PatientFullProfile,
  DashboardSummary,
  AdminDashboardSummary,
  FinancialSummary,
  PendingPayout,
  DoctorStatus,
  ConsultationStatus,
  ConsultationType,
  PayoutStatus,
  ClinicalNote,
  ClinicalNoteFormData,
  AppointmentChat,
  ChatMessage,
  PatientExam,
  CanCloseResult,
  PatientFullHistory,
  DiaryEntry,
} from '../types/doctorPortal';
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_ORIGIN = (() => {
  try { return new URL(import.meta.env.VITE_SUPABASE_URL).origin; } catch { return ''; }
})();

const safeLegacyStorageUrl = (value: string): string | null => {
  if (!value.startsWith('https://')) return null;
  try {
    const parsed = new URL(value);
    return parsed.origin === SUPABASE_ORIGIN && parsed.pathname.startsWith('/storage/v1/object/')
      ? value
      : null;
  } catch { return null; }
};

async function signStoragePaths<T extends { file_url: string | null }>(
  bucket: 'chat-files' | 'patient-exams',
  rows: T[],
): Promise<T[]> {
  const paths = [...new Set(rows
    .map(row => row.file_url)
    .filter((path): path is string => !!path && !path.startsWith('http'))
  )];
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 60);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
    }
  }
  return rows.map(row => ({
    ...row,
    file_url: row.file_url
      ? (signed.get(row.file_url) ?? safeLegacyStorageUrl(row.file_url))
      : null,
  }));
}

// =====================================================
// MÉDICOS
// =====================================================

export const doctorService = {
  // Buscar médico logado
  async getOwnDoctorProfile(): Promise<Doctor | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data;
  },

  // Criar médico (registro inicial)
  async createDoctor(doctor: Partial<Doctor>): Promise<Doctor> {
    const { data, error } = await supabase
      .from('doctors')
      .insert([doctor])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Atualizar médico
  async updateDoctor(id: string, updates: Partial<Doctor>): Promise<Doctor> {
    const { data, error } = await supabase
      .from('doctors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Buscar médico por token de convite
  async getDoctorByInviteToken(token: string): Promise<Pick<Doctor, 'id' | 'email'> | null> {
    const { data, error } = await supabase
      .rpc('get_doctor_invite_preview', { p_token: token })
      .maybeSingle();

    if (error) return null;
    return data as Pick<Doctor, 'id' | 'email'> | null;
  },

  // Gerar token de convite único (para médicos)
  generateInviteToken(): string {
    return `invite_${uuidv4().replace(/-/g, '')}`;
  },

  // Obter ou criar token de indicação de paciente
  async getOrCreatePatientReferralToken(doctorId: string): Promise<string> {
    const { data: doctor, error: fetchError } = await supabase
      .from('doctors')
      .select('patient_referral_token')
      .eq('id', doctorId)
      .single();

    if (fetchError) throw fetchError;

    if (doctor?.patient_referral_token) {
      return doctor.patient_referral_token;
    }

    const token = `ref_${uuidv4().replace(/-/g, '')}`;
    const { error: updateError } = await supabase
      .from('doctors')
      .update({ patient_referral_token: token })
      .eq('id', doctorId);

    if (updateError) throw updateError;
    return token;
  },

  // Buscar médico por token de indicação de paciente
  async getDoctorByReferralToken(token: string): Promise<Pick<Doctor, 'id' | 'name' | 'specialty' | 'specialty_custom' | 'photo_url' | 'bio'> | null> {
    const { data, error } = await supabase
      .rpc('get_doctor_referral_preview', { p_token: token })
      .maybeSingle();

    if (error) return null;
    return data as Pick<Doctor, 'id' | 'name' | 'specialty' | 'specialty_custom' | 'photo_url' | 'bio'> | null;
  },

  // Admin: Buscar todos os médicos
  async getAllDoctors(filters?: {
    status?: DoctorStatus | 'all';
    specialty?: string;
    tipo?: 'medico' | 'psicologo';
  }): Promise<Doctor[]> {
    let query = supabase.from('doctors').select('*');

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.specialty) {
      query = query.eq('specialty', filters.specialty);
    }
    // Registro legado sem tipo_profissional é médico — mesma convenção do
    // scheduling.ts e da migration 20260802.
    if (filters?.tipo === 'psicologo') {
      query = query.eq('tipo_profissional', 'psicologo');
    } else if (filters?.tipo === 'medico') {
      query = query.or('tipo_profissional.eq.medico,tipo_profissional.is.null');
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Admin: Aprovar médico
  async approveDoctor(doctorId: string): Promise<Doctor> {
    const { data, error } = await supabase
      .from('doctors')
      .update({ status: 'approved' })
      .eq('id', doctorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Admin: Suspender médico
  async suspendDoctor(doctorId: string): Promise<Doctor> {
    const { data, error } = await supabase
      .from('doctors')
      .update({ status: 'suspended' })
      .eq('id', doctorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Admin: Buscar médicos pendentes
  async getPendingDoctors(): Promise<Doctor[]> {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

// =====================================================
// DISPONIBILIDADE
// =====================================================

export const availabilityService = {
  // Buscar disponibilidade de um médico (com filtro opcional por período)
  async getDoctorAvailability(
    doctorId: string,
    startDate?: string,
    endDate?: string
  ): Promise<DoctorAvailability[]> {
    let query = supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId);

    // Se tiver filtro de data, buscar apenas disponibilidades no período
    if (startDate && endDate) {
      query = query.or(`date.is.null,date.gte.${startDate},date.lte.${endDate}`);
    }

    const { data, error } = await query.order('date', { ascending: true }).order('day_of_week').order('start_time');

    if (error) throw error;
    return data || [];
  },

  // Criar ou atualizar disponibilidade (upsert)
  async upsertAvailability(availabilities: DoctorAvailability[]): Promise<DoctorAvailability[]> {
    // Separar registros novos (sem id) e existentes (com id)
    const newAvailabilities = availabilities.filter(a => !a.id || a.id.startsWith('temp-'));
    const existingAvailabilities = availabilities.filter(a => a.id && !a.id.startsWith('temp-'));

    const results: DoctorAvailability[] = [];

    // Inserir registros novos (sem id, o banco vai gerar automaticamente)
    if (newAvailabilities.length > 0) {
      const { id, ...rest } = newAvailabilities[0]; // Remove id do primeiro para exemplo
      const toInsert = newAvailabilities.map(({ id, ...rest }) => rest);

      const { data: insertedData, error: insertError } = await supabase
        .from('doctor_availability')
        .insert(toInsert)
        .select();

      if (insertError) throw insertError;
      if (insertedData) results.push(...insertedData);
    }

    // Atualizar registros existentes
    if (existingAvailabilities.length > 0) {
      const { data: updatedData, error: updateError } = await supabase
        .from('doctor_availability')
        .upsert(existingAvailabilities, {
          onConflict: 'doctor_id,day_of_week,start_time,end_time,date'
        })
        .select();

      if (updateError) throw updateError;
      if (updatedData) results.push(...updatedData);
    }

    return results;
  },

  // Deletar disponibilidade
  async deleteAvailability(id: string): Promise<void> {
    const { error } = await supabase
      .from('doctor_availability')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// =====================================================
// CONSULTAS
// =====================================================

export const consultationService = {
  // Buscar consultas do médico
  async getDoctorConsultations(doctorId: string, options?: {
    status?: ConsultationStatus;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }): Promise<Consultation[]> {
    let query = supabase
      .from('consultations')
      .select('*')
      .eq('doctor_id', doctorId);

    if (options?.status) {
      query = query.eq('status', options.status);
    }
    if (options?.fromDate) {
      query = query.gte('scheduled_at', options.fromDate);
    }
    if (options?.toDate) {
      query = query.lte('scheduled_at', options.toDate);
    }

    query = query.order('scheduled_at', { ascending: true });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Buscar nomes dos pacientes via profiles (authenticated role não acessa auth.users)
    const patientIds = [...new Set((data || []).map((c: any) => c.patient_id))];
    const profileMap: Record<string, any> = {};
    if (patientIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', patientIds);
      for (const p of (profiles || [])) profileMap[p.id] = p;
    }

    return (data || []).map((c: any) => ({
      ...c,
      patient_name: profileMap[c.patient_id]?.display_name || 'Paciente',
      patient_photo: profileMap[c.patient_id]?.avatar_url || null,
      patient_age: null,
      patient_gender: null,
    }));
  },

  // Buscar próxima consulta
  async getNextConsultation(doctorId: string): Promise<Consultation | null> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .single();

    if (error) return null;
    return data;
  },

  // Buscar consultas de hoje
  async getTodayConsultations(doctorId: string): Promise<Consultation[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', tomorrow.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Buscar consultas da semana
  async getWeekConsultations(doctorId: string): Promise<Consultation[]> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', startOfWeek.toISOString())
      .lt('scheduled_at', endOfWeek.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Cancelar consulta (médico)
  // Cancelamento pelo médico é sempre tratado como antecedência >= 24h:
  // o paciente recebe novo crédito disponível.
  async cancelConsultation(consultationId: string, reason?: string): Promise<Consultation> {
    const { data, error } = await supabase
      .from('consultations')
      .update({ status: 'cancelled', notes: reason })
      .eq('id', consultationId)
      .select('id, scheduled_at')
      .single();

    if (error) throw error;

    // Verificar se existe crédito vinculado e liberar para reagendamento
    const { data: credit } = await supabase
      .from('consultation_credits')
      .select('id')
      .eq('appointment_id', consultationId)
      .maybeSingle();

    if (credit && data) {
      // Import dinâmico para evitar dependência circular
      const { creditService } = await import('./billingService');
      // Força 24h+ de antecedência (cancelamento pelo médico → paciente não perde crédito)
      const futureDate = new Date(Date.now() + 48 * 3600_000).toISOString();
      await creditService.handleAppointmentCancellation(credit.id, futureDate);
    }

    return data as unknown as Consultation;
  },

  /**
   * Registra falta do paciente (no_show) com a regra de penalidade real:
   * 1ª falta libera novo crédito para remarcação única; 2ª falta perde o
   * crédito do mês. Diferente de cancelConsultation, que é sem penalidade.
   * Idempotente: se o cron ou o app do paciente já oficializou, não reprocessa.
   */
  async markNoShow(consultationId: string): Promise<void> {
    const { data, error } = await supabase
      .from('consultations')
      .update({ status: 'no_show', notes: 'Paciente não compareceu' })
      .eq('id', consultationId)
      .eq('status', 'scheduled')
      .select('id, scheduled_at');

    if (error) throw error;
    if (!data || data.length === 0) return; // já processado (cron/paciente)

    const { data: credit } = await supabase
      .from('consultation_credits')
      .select('id')
      .eq('appointment_id', consultationId)
      .maybeSingle();

    if (credit) {
      const { creditService } = await import('./billingService');
      // scheduled_at no passado → cai no ramo de falta/cancelamento tardio
      await creditService.handleAppointmentCancellation(
        credit.id,
        data[0].scheduled_at
      );
    }
  },

  // Médico propõe até 3 novas datas para o paciente escolher
  async proposeReschedule(consultationId: string, proposals: string[], message?: string): Promise<Consultation> {
    const { data, error } = await supabase
      .from('consultations')
      .update({
        reschedule_proposals: proposals.map(d => ({ date: d })),
        reschedule_message: message || null,
        reschedule_status: 'pending',
      })
      .eq('id', consultationId)
      .select('*, patient_id')
      .single();

    if (error) throw error;

    // Notificar o paciente com as opções
    if (data?.patient_id) {
      const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      const optionsList = proposals.map((p, i) => `Opção ${i + 1}: ${fmtDate(p)}`).join(' | ');
      await supabase.from('patient_notifications').insert({
        user_id: data.patient_id,
        type: 'appointment_reschedule_request',
        title: 'Seu médico quer reagendar',
        body: `${proposals.length} opções disponíveis. ${optionsList}${message ? ` — "${message}"` : ''}`,
        data: { consultation_id: consultationId, proposals },
      }).select().maybeSingle();
    }

    return data as unknown as Consultation;
  },

  // Criar consulta
  async createConsultation(consultation: Partial<Consultation>): Promise<Consultation> {
    const { data, error } = await supabase
      .from('consultations')
      .insert([consultation])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Atualizar status de uma consulta
  async updateStatus(consultationId: string, status: ConsultationStatus): Promise<void> {
    const updates: Record<string, unknown> = { status };
    if (status === 'in_progress') updates.started_at = new Date().toISOString();
    if (status === 'completed')   updates.ended_at   = new Date().toISOString();

    const { error } = await supabase
      .from('consultations')
      .update(updates)
      .eq('id', consultationId);

    if (error) throw error;

    // O crédito é marcado como 'realizada' pelo trigger
    // trg_realizar_credito_da_consulta. Era feito aqui, mas a RLS de
    // consultation_credits barra UPDATE de médico (0 linhas, sem erro), então
    // consulta encerrada nunca entrava na base de repasse. No banco também
    // vale para quem encerra pela sala de vídeo, que não passa por aqui.
  },

  // Buscar consultas por dia
  async getConsultationsByDay(doctorId: string, date: string): Promise<Consultation[]> {
    // Fix timezone: forçar início e fim do dia no fuso local
    // new Date('YYYY-MM-DD') trata como UTC midnight e shift o dia em UTC-3
    const [y, m, d] = date.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('doctor_id', doctorId)
      .gte('scheduled_at', dayStart.toISOString())
      .lte('scheduled_at', dayEnd.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const patientIds = [...new Set(data.map((c: any) => c.patient_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', patientIds);

    const profileMap: Record<string, { display_name: string; avatar_url: string | null }> = {};
    for (const p of (profiles || [])) profileMap[p.id] = p;

    return data.map((c: any) => ({
      ...c,
      patient_name: profileMap[c.patient_id]?.display_name || null,
      patient_photo: profileMap[c.patient_id]?.avatar_url || null,
    }));
  }
};

// =====================================================
// RECEITAS
// =====================================================

export const prescriptionService = {
  async getDoctorPrescriptions(doctorId: string): Promise<Prescription[]> {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('issued_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createPrescription(prescription: Partial<Prescription>): Promise<Prescription> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (prescription.validity_days || 90));

    const { data, error } = await supabase
      .from('prescriptions')
      .insert([{ ...prescription, expires_at: expiresAt.toISOString() }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePrescription(id: string, updates: Partial<Prescription>): Promise<Prescription> {
    const { data, error } = await supabase
      .from('prescriptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// =====================================================
// AJUSTES DE PLANO
// =====================================================

export const planAdjustmentService = {
  async createAdjustment(adjustment: Partial<DoctorPlanAdjustment>): Promise<DoctorPlanAdjustment> {
    const { data, error } = await supabase
      .from('doctor_plan_adjustments')
      .insert([adjustment])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getPatientAdjustments(patientId: string): Promise<DoctorPlanAdjustment[]> {
    const { data, error } = await supabase
      .from('doctor_plan_adjustments')
      .select('*')
      .eq('patient_id', patientId)
      .order('applied_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

// =====================================================
// MENSAGENS
// =====================================================

export const messageService = {
  async sendMessage(message: Partial<DoctorMessage>): Promise<DoctorMessage> {
    const { data, error } = await supabase
      .from('doctor_messages')
      .insert([message])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getPatientMessages(patientId: string): Promise<DoctorMessage[]> {
    const { data, error } = await supabase
      .from('doctor_messages')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

// =====================================================
// REPASSES
// =====================================================

export interface DoctorEarnings {
  realizedCount: number;        // total de consultas realizadas (créditos 'realizada')
  unpaidCount: number;          // realizadas ainda não incluídas em um repasse
  nivel: 'nivel_1' | 'nivel_2' | 'nivel_3';
  valuePerConsultation: number; // valor bruto do nível, por consulta
  transactionFeePercent: number;// taxa de transação do gateway, em %
  netPerConsultation: number;   // o que cai na conta por consulta (bruto - taxa)
  pendingReceivable: number;    // unpaidCount * líquido por consulta
  pendingFee: number;           // taxa estimada sobre o que está a receber
  realizedCredits: { id: string; realized_at: string | null; paid: boolean }[];
}

export const payoutService = {
  async getDoctorPayouts(doctorId: string): Promise<Payout[]> {
    const { data, error } = await supabase
      .from('payouts')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /** Ganhos do médico no modelo de créditos: realizadas, a receber e valor por nível. */
  async getDoctorEarnings(doctorId: string): Promise<DoctorEarnings> {
    const {
      loadNivelValues, valueForNivel, loadTransactionFeePercent, applyTransactionFee,
    } = await import('./billingService');
    const [creditsRes, doctorRes, nivelValues, transactionFeePercent] = await Promise.all([
      supabase
        .from('consultation_credits')
        .select('id, realized_at')
        .eq('doctor_id', doctorId)
        .eq('status', 'realizada')
        .order('realized_at', { ascending: false }),
      supabase.from('doctors').select('nivel, tipo_profissional').eq('id', doctorId).single(),
      loadNivelValues(),
      loadTransactionFeePercent(),
    ]);

    const credits = creditsRes.data ?? [];
    const ids = credits.map((c: any) => c.id);
    let paidIds = new Set<string>();
    if (ids.length) {
      const { data: items } = await supabase
        .from('payout_items')
        .select('consultation_credit_id')
        .in('consultation_credit_id', ids);
      paidIds = new Set((items ?? []).map((i: any) => i.consultation_credit_id));
    }

    const nivel = ((doctorRes.data as any)?.nivel ?? 'nivel_2') as 'nivel_1' | 'nivel_2' | 'nivel_3';
    const tipo = (doctorRes.data as any)?.tipo_profissional ?? null;
    const valuePerConsultation = valueForNivel(nivelValues, nivel, tipo);
    const realizedCredits = credits.map((c: any) => ({
      id: c.id,
      realized_at: c.realized_at,
      paid: paidIds.has(c.id),
    }));
    const unpaidCount = realizedCredits.filter((c) => !c.paid).length;

    // O repasse chega com a taxa de transação já descontada. A projeção do
    // "a receber" aplica a taxa sobre o total do período, como o
    // process-payouts faz — não consulta a consulta, que arredondaria
    // diferente e mostraria um valor que não bate com o PIX.
    const grossPending = unpaidCount * valuePerConsultation;
    const { fee: pendingFee, net: pendingReceivable } =
      applyTransactionFee(grossPending, transactionFeePercent);
    const { net: netPerConsultation } =
      applyTransactionFee(valuePerConsultation, transactionFeePercent);

    return {
      realizedCount: credits.length,
      unpaidCount,
      nivel,
      valuePerConsultation,
      transactionFeePercent,
      netPerConsultation,
      pendingReceivable,
      pendingFee,
      realizedCredits,
    };
  },

  /**
   * Admin: repasses. Sem filtro, traz TODOS os status.
   *
   * Antes esta função filtrava `status = 'pending'` mas a tela usava o
   * resultado como se fosse a lista completa: filtrava 'paid' para somar
   * repasses do mês (sempre 0), 'paid' para o extrato (sempre vazio) e
   * 'failed' para o alerta de falha — que por isso nunca aparecia. Com
   * repasses falhados no banco, o admin não tinha como vê-los nem
   * reprocessá-los.
   */
  async getPayouts(status?: PayoutStatus): Promise<PendingPayout[]> {
    let query = supabase
      .from('payouts')
      .select(`
        *,
        doctor:doctor_id (
          name,
          pix_key
        )
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((p: any) => {
      // payouts.amount é o LÍQUIDO — exatamente o que sai por PIX. Bruto e
      // taxa são gravados pelo process-payouts no momento do split
      // (migration 20260816) e apenas lidos aqui.
      //
      // Antes esta tela tratava amount como bruto e descontava 25%
      // (default_platform_fee, que é comissão de suplemento e não tem nada
      // a ver com repasse): o admin via R$75 num repasse de R$100 real.
      //
      // Repasses anteriores à migration foram transferidos pelo valor cheio
      // e ficam com taxa zero — o fallback preserva isso.
      const netAmount   = Number(p.amount) || 0;
      const grossAmount = p.gross_amount != null ? Number(p.gross_amount) : netAmount;
      const feeAmount   = p.fee_amount   != null ? Number(p.fee_amount)   : 0;
      const feePercent  = p.fee_percent  != null ? Number(p.fee_percent)  : 0;

      return {
        id: p.id,
        doctor_id: p.doctor_id,
        doctor_name: p.doctor?.name || '',
        period_start: p.period_start,
        period_end: p.period_end,
        consultations_count: p.consultations_count,
        gross_amount: grossAmount,
        fee_percent: feePercent,
        fee_amount: feeAmount,
        net_amount: netAmount,
        pix_key: p.doctor?.pix_key || p.pix_key,
        status: p.status,
        paid_at: p.paid_at ?? null,
        // Vieram na migration 20260417 e ficaram de fora deste mapeamento:
        // a tela de repasses não conseguia mostrar o motivo de uma falha de
        // transferência porque o campo nunca chegava nela.
        asaas_transfer_id: p.asaas_transfer_id ?? null,
        processing_error: p.processing_error ?? null,
      };
    });
  },

  // Admin: Marcar repasse como pago
  async markAsPaid(payoutId: string): Promise<Payout> {
    const { data, error } = await supabase
      .from('payouts')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', payoutId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Admin: resumo financeiro. Ver MODELO_FINANCEIRO.md.
   *
   * A receita vem das faturas B2B (empresa paga por assento) e a saída vem
   * dos repasses efetivamente transferidos. Antes esta função somava
   * consultations.price / platform_fee / doctor_payout — resquícios do
   * modelo B2C extinto, em que o paciente pagava por consulta e a
   * plataforma tirava comissão. Hoje o paciente não paga nada: usa crédito
   * do assento. Aqueles campos descreviam dinheiro que não existe, e o
   * "total repassado" que produziam contradizia o repasse real por nível.
   *
   * `opts.since` limita a janela; sem ele, é o acumulado.
   */
  async getFinancialSummary(opts?: { since?: string }): Promise<FinancialSummary> {
    let faturasQuery = supabase
      .from('empresa_faturas')
      .select('valor, pago_em')
      .eq('status', 'pago');
    if (opts?.since) faturasQuery = faturasQuery.gte('pago_em', opts.since);

    let paidQuery = supabase
      .from('payouts')
      .select('amount, paid_at')
      .eq('status', 'paid');
    if (opts?.since) paidQuery = paidQuery.gte('paid_at', opts.since);

    const [faturasRes, paidRes, pendingRes] = await Promise.all([
      faturasQuery,
      paidQuery,
      supabase.from('payouts').select('amount').eq('status', 'pending'),
    ]);

    if (faturasRes.error) throw faturasRes.error;

    const soma = (rows: any[] | null, campo: string) =>
      (rows ?? []).reduce((s: number, r: any) => s + (Number(r[campo]) || 0), 0);

    const grossRevenue = soma(faturasRes.data, 'valor');
    const totalPaid    = soma(paidRes.data, 'amount');

    return {
      grossRevenue,
      // Margem realizada: o que entrou menos o que saiu no mesmo recorte.
      // Não é comissão — não existe comissão por consulta neste modelo.
      platformFee: grossRevenue - totalPaid,
      totalPaid,
      pendingPayouts: soma(pendingRes.data, 'amount'),
    };
  }
};

// =====================================================
// CONFIGURAÇÕES DA PLATAFORMA
// =====================================================

/**
 * Chaves que nunca devem chegar ao navegador, nem no painel admin.
 *
 * platform_settings guarda o 'service_role_key_for_cron' — a service role key,
 * que ignora toda a RLS. A RLS já bloqueia a leitura para quem não é super
 * admin (migration 20260811), mas o admin AINDA leria: cairia no estado do
 * React, na aba de rede e no payload do "Salvar", que reescreveria a chave a
 * cada save. Nada na tela de configurações precisa dela.
 */
const CHAVES_SENSIVEIS = /key|secret|token|password|senha|api/i;

export const settingsService = {
  async getSetting(key: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) return null;
    return data?.value || null;
  },

  /** Sem as chaves sensíveis — ver CHAVES_SENSIVEIS acima. */
  async getAllSettings(): Promise<PlatformSetting[]> {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*');

    if (error) throw error;
    return (data || []).filter(s => !CHAVES_SENSIVEIS.test(s.key));
  },

  async updateSetting(key: string, value: string): Promise<void> {
    const { error } = await supabase.rpc('admin_update_setting', {
      p_key: key,
      p_value: value,
    });

    if (error) throw error;
  }
};

// =====================================================
// ATIVIDADES FÍSICAS DO PACIENTE
// =====================================================

export interface PatientActivity {
  id: string;
  service: string;
  activity_type: string;
  name: string;
  calories_burned: number;
  duration_seconds: number;
  distance_meters: number | null;
  activity_date: string;
}

export interface PatientDailyMetric {
  metric_date: string;
  steps: number | null;
  active_calories: number | null;
  total_calories: number | null;
  distance_meters: number | null;
  resting_heart_rate: number | null;
  avg_heart_rate: number | null;
  sleep_minutes: number | null;
  body_fat_pct: number | null;
  weight_kg: number | null;
}

export const patientActivitiesService = {
  async getPatientActivities(patientId: string, days = 30): Promise<PatientActivity[]> {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data } = await supabase
      .from('activities')
      .select('id, service, activity_type, name, calories_burned, duration_seconds, distance_meters, activity_date')
      .eq('user_id', patientId)
      .gte('activity_date', since)
      .order('activity_date', { ascending: false });
    return (data ?? []) as PatientActivity[];
  },

  // Sinais diários de wearable / Google Health Connect (passos, FC, sono, % gordura).
  // A RLS de health_daily_metrics libera o médico via consultations + doctors.
  async getPatientDailyMetrics(patientId: string, days = 30): Promise<PatientDailyMetric[]> {
    const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from('health_daily_metrics')
      .select('metric_date, steps, active_calories, total_calories, distance_meters, resting_heart_rate, avg_heart_rate, sleep_minutes, body_fat_pct, weight_kg')
      .eq('user_id', patientId)
      .gte('metric_date', since)
      .order('metric_date', { ascending: true });
    return (data ?? []) as PatientDailyMetric[];
  },

  async getActivityHealthInsights(patientId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('activity-health-insights', {
      body: { patient_id: patientId },
    });
    if (error) throw error;
    return (data as { insights: string }).insights ?? '';
  },
};

// =====================================================
// PACIENTES
// =====================================================

export const patientService = {
  // Buscar pacientes únicos que tiveram consulta com o médico
  async getDoctorPatients(doctorId: string, search?: string): Promise<PatientSummary[]> {
    // Step 1: IDs via consultations + IDs via referral (em paralelo)
    // Nota: não fazemos join com auth.users porque authenticated role não tem permissão
    // de leitura na tabela auth.users — nomes vêm de profiles.display_name
    const [{ data: consultations }, { data: referredProfiles }] = await Promise.all([
      supabase
        .from('consultations')
        .select('patient_id, scheduled_at')
        .eq('doctor_id', doctorId)
        .order('scheduled_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, display_name, avatar_url, age, gender, weight, height, glp1_mode, glp1_phase')
        .eq('referred_by_doctor_id', doctorId),
    ]);

    // Step 2: build consultation date map
    const consultationMap = new Map<string, { last: string | null; next: string | null }>();
    const now = new Date();
    for (const c of (consultations || [])) {
      const pid = c.patient_id;
      if (!consultationMap.has(pid)) consultationMap.set(pid, { last: null, next: null });
      const entry = consultationMap.get(pid)!;
      const dt = new Date(c.scheduled_at);
      if (dt < now) {
        if (!entry.last || dt > new Date(entry.last)) entry.last = c.scheduled_at;
      } else {
        if (!entry.next || dt < new Date(entry.next)) entry.next = c.scheduled_at;
      }
    }

    // Step 3: merge IDs — consultation patients + referred patients
    const consultationIds = new Set((consultations || []).map(c => c.patient_id));
    const referredMap = new Map((referredProfiles || []).map((p: any) => [p.id, p]));

    // Fetch profiles for consultation-only patients (referred ones already fetched)
    const consultOnlyIds = [...consultationIds].filter(id => !referredMap.has(id));
    const { data: consultProfiles } = consultOnlyIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, age, gender, weight, height, glp1_mode, glp1_phase')
          .in('id', consultOnlyIds)
      : { data: [] };

    const profileMap = new Map([
      ...(consultProfiles || []).map((p: any) => [p.id, p] as [string, any]),
      ...referredMap.entries(),
    ]);

    // Union of all unique patient IDs
    const allIds = [...new Set([...consultationIds, ...referredMap.keys()])];
    if (allIds.length === 0) return [];

    let patients: PatientSummary[] = allIds.map(pid => {
      const p = profileMap.get(pid) as any;
      const imc = p?.weight && p?.height
        ? p.weight / ((p.height / 100) ** 2)
        : null;
      const dates = consultationMap.get(pid) ?? { last: null, next: null };
      return {
        id: pid,
        name: p?.display_name || 'Paciente',
        photo_url: p?.avatar_url || null,
        lastConsultation: dates.last,
        nextConsultation: dates.next,
        imc,
        age: p?.age || null,
        gender: p?.gender || null,
        is_glp1_active: p?.glp1_mode || false,
        glp1_phase: p?.glp1_phase || null,
      };
    });

    // Ordenar: quem tem consulta primeiro, depois por data de última consulta
    patients.sort((a, b) => {
      if (a.lastConsultation && !b.lastConsultation) return -1;
      if (!a.lastConsultation && b.lastConsultation) return 1;
      if (a.lastConsultation && b.lastConsultation) {
        return new Date(b.lastConsultation).getTime() - new Date(a.lastConsultation).getTime();
      }
      return 0;
    });

    if (search) {
      patients = patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return patients;
  },

  // Buscar perfil completo de um paciente
  async getPatientFullProfile(patientId: string, doctorId: string): Promise<PatientFullProfile | null> {
    // Buscar consultas do paciente com este médico
    // Nota: não há join com auth.users (authenticated role não tem acesso)
    const { data: consultations, error: consultError } = await supabase
      .from('consultations')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('patient_id', patientId)
      .order('scheduled_at', { ascending: false });

    if (consultError) throw consultError;

    // Buscar ajustes de plano
    const { data: adjustments } = await supabase
      .from('doctor_plan_adjustments')
      .select('*')
      .eq('patient_id', patientId)
      .order('applied_at', { ascending: false })
      .limit(1);

    // Real data fetching: Profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, date_of_birth, gender, weight, height, activity_level, meals_per_day, eating_window_start, eating_window_end, diet_type, dietary_restrictions, dietary_restrictions_detail, additional_goals, eating_location, habit_changes, drinks_enough_water, target_calories, target_protein, target_carbs, target_fats, target_fiber, glp1_mode, glp1_phase, glp1_medication, goal')
      .eq('id', patientId)
      .single();

    if (profileError) {
      console.error("Erro ao buscar profile do paciente (RLS?):", profileError);
    }

    // Resolve display name — fallback via SECURITY DEFINER function (acessa auth.users)
    let resolvedName = profile?.display_name || '';
    if (!resolvedName) {
      const { data: nameData } = await supabase.rpc('get_patient_name_for_doctor', { p_patient_id: patientId });
      resolvedName = nameData || 'Paciente';
    }

    // Check for active AI Nutritional Plan overriding profiles
    const { data: activePlan, error: planError } = await supabase
      .from('quarterly_plans')
      .select('content')
      .eq('user_id', patientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planError) {
      console.error("Erro ao buscar quarterly_plans do paciente (RLS?):", planError);
    }

    let cal = profile?.target_calories || 2000;
    let prot = profile?.target_protein || 100;
    let carb = profile?.target_carbs || 250;
    let fat = profile?.target_fats || 65;

    if (activePlan?.content) {
      cal = activePlan.content.calories || cal;
      prot = activePlan.content.macros?.protein || prot;
      carb = activePlan.content.macros?.carbs || carb;
      fat = activePlan.content.macros?.fats || fat;
    }

    // Get latest water goal
    const { data: latestLog } = await supabase
      .from('daily_logs')
      .select('water_goal')
      .eq('user_id', patientId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Default water goal: weight * 35 if not found
    const water = latestLog?.water_goal || Math.round((profile?.weight || 70) * 35);

    // Calculate IMC
    let imc: number | null = null;
    let imc_classification: string | null = null;
    if (profile?.weight && profile?.height) {
      imc = profile.weight / ((profile.height / 100) * (profile.height / 100));
      imc_classification = 'Normal'; // Can be adjusted by frontend calculation logic
    }

    // Fetch last 56 days of meals for history & adherence
    const fiftySixDaysAgo = new Date();
    fiftySixDaysAgo.setDate(fiftySixDaysAgo.getDate() - 56);
    fiftySixDaysAgo.setHours(0, 0, 0, 0);

    const { data: allMeals } = await supabase
      .from('meals')
      .select('created_at, calories, protein, carbs, fats')
      .eq('user_id', patientId)
      .gte('created_at', fiftySixDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Weight history (last 90 days from weight_logs)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: weightLogs } = await supabase
      .from('weight_logs')
      .select('logged_at, weight_kg')
      .eq('user_id', patientId)
      .gte('logged_at', ninetyDaysAgo.toISOString())
      .order('logged_at', { ascending: true });

    // WeightEntry.target_weight é opcional (number). Antes o map fixava null,
    // o que tipava a lista inteira como incompatível com WeightEntry[].
    let weight_history: import('../types/doctorPortal').WeightEntry[] = (weightLogs || [])
      .filter((w: any) => w.weight_kg)
      .map((w: any) => ({ date: w.logged_at.split('T')[0], weight: w.weight_kg }));

    // Fallback: use current profile weight as a single data point
    if (weight_history.length === 0 && profile?.weight) {
      weight_history = [{ date: new Date().toISOString().split('T')[0], weight: profile.weight }];
    }

    // Group meals by date dynamically (same structure as flow_stats)
    const mapByDate = new Map<string, any>();
    for (const m of (allMeals || [])) {
      if (!m.created_at) continue;
      const dStr = m.created_at.split('T')[0];
      if (!mapByDate.has(dStr)) {
        mapByDate.set(dStr, { date: dStr, calories_consumed: 0, protein_consumed: 0, carbs_consumed: 0, fats_consumed: 0 });
      }
      const stat = mapByDate.get(dStr);
      stat.calories_consumed += (m.calories || 0);
      stat.protein_consumed += (m.protein || 0);
      stat.carbs_consumed += (m.carbs || 0);
      stat.fats_consumed += (m.fats || 0);
    }

    const allStats = Array.from(mapByDate.values());

    // Calculate Adherence (last 30 days)
    const thirtyDaysAgoDate = new Date();
    thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);
    const thirtyDaysStr = thirtyDaysAgoDate.toISOString().split('T')[0];

    const thirtyDaysStats = (allStats || []).filter(s => s.date >= thirtyDaysStr);
    const activeDays = thirtyDaysStats.length;
    const adherencePercent = Math.round((activeDays / 30) * 100);
    const avgCal = activeDays > 0 ? Math.round(thirtyDaysStats.reduce((acc, s) => acc + (s.calories_consumed || 0), 0) / activeDays) : 0;
    const avgProt = activeDays > 0 ? Math.round(thirtyDaysStats.reduce((acc, s) => acc + (s.protein_consumed || 0), 0) / activeDays) : 0;

    // Calculate Weekly History (8 weeks)
    const weekly_history: import('../types/doctorPortal').WeeklyNutritionHistory[] = [];
    const now = new Date();
    // Move backwards conceptually from today, chunks of 7
    for (let i = 0; i < 8; i++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      const weekEndStr = weekEnd.toISOString().split('T')[0];
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const daysInWeek = (allStats || []).filter(s => s.date >= weekStartStr && s.date <= weekEndStr);
      const displayDate = `${weekStart.getDate().toString().padStart(2, '0')}/${(weekStart.getMonth() + 1).toString().padStart(2, '0')}`;

      if (daysInWeek.length > 0) {
        const avgC = Math.round(daysInWeek.reduce((acc, s) => acc + (s.calories_consumed || 0), 0) / daysInWeek.length);
        const avgP = Math.round(daysInWeek.reduce((acc, s) => acc + (s.protein_consumed || 0), 0) / daysInWeek.length);
        const avgCb = Math.round(daysInWeek.reduce((acc, s) => acc + (s.carbs_consumed || 0), 0) / daysInWeek.length);
        const avgF = Math.round(daysInWeek.reduce((acc, s) => acc + (s.fats_consumed || 0), 0) / daysInWeek.length);
        const adh = Math.round((daysInWeek.length / 7) * 100);

        weekly_history.push({
          week_start: displayDate,
          avg_calories: avgC,
          avg_protein: avgP,
          avg_carbs: avgCb,
          avg_fat: avgF,
          adherence_percent: adh,
          avg_weight: profile?.weight ? `${profile.weight}kg` : '-'
        });
      } else {
        weekly_history.push({
          week_start: displayDate,
          avg_calories: 0,
          avg_protein: 0,
          avg_carbs: 0,
          avg_fat: 0,
          adherence_percent: 0,
          avg_weight: profile?.weight ? `${profile.weight}kg` : '-'
        });
      }
    }

    // Fetch diary entries from daily_logs (patient diary: notes, energy, mood)
    const { data: diaryRows } = await supabase
      .from('daily_logs')
      .select('date, energy_level, mood, notes, photo_url')
      .eq('user_id', patientId)
      .order('date', { ascending: false })
      .limit(60);

    const formattedCheckins: import('../types/doctorPortal').SymptomCheckin[] = [];

    const diary_entries: DiaryEntry[] = (diaryRows || [])
      .filter(r => r.notes || r.energy_level || r.mood)
      .map(r => {
        const [year, month, day] = (r.date || '').split('-');
        const formattedDate = day && month ? `${day}/${month}/${year}` : r.date;
        return {
          date: formattedDate,
          energy_level: r.energy_level || null,
          mood: r.mood || null,
          notes: r.notes || null,
          photo_url: r.photo_url || null,
        };
      });

    return {
      id: patientId,
      name: resolvedName,
      photo_url: profile?.avatar_url || null,
      age: (() => {
        if (!profile?.date_of_birth) return null;
        const birth = new Date(profile.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
      })(),
      gender: profile?.gender || null,
      height: profile?.height || null,
      activity_level: profile?.activity_level || null,
      meals_per_day: profile?.meals_per_day || null,
      eating_window_start: profile?.eating_window_start || null,
      eating_window_end: profile?.eating_window_end || null,
      diet_type: profile?.diet_type || null,
      dietary_restrictions: profile?.dietary_restrictions || [],
      dietary_restrictions_detail: profile?.dietary_restrictions_detail || null,
      additional_goals: profile?.additional_goals || [],
      eating_location: profile?.eating_location || null,
      habit_changes: profile?.habit_changes || [],
      drinks_enough_water: profile?.drinks_enough_water || null,
      health_goal: (() => {
        const goalLabels: Record<string, string> = {
          aesthetic: 'Perda de peso',
          performance: 'Ganho de massa',
          health: 'Saúde geral',
          perder_peso: 'Perda de peso',
          ganhar_peso: 'Ganho de massa',
          manter_peso: 'Manter peso',
          saude_geral: 'Saúde geral',
        };
        return profile?.goal ? (goalLabels[profile.goal] ?? profile.goal) : null;
      })(),
      imc,
      imc_classification,
      is_glp1_active: profile?.glp1_mode || false,
      glp1_phase: profile?.glp1_phase || null,
      glp1_medication: profile?.glp1_medication || null,
      current_weight: profile?.weight || null,
      weight_history,
      current_goals: {
        calories: cal,
        protein: prot,
        carbs: carb,
        fat: fat,
        fiber: profile?.target_fiber || 25,
        water: water
      },
      adherence: {
        registration_percentage: adherencePercent,
        average_calories: avgCal,
        calorie_goal: cal,
        average_protein: avgProt,
        protein_goal: prot
      },
      weekly_history: weekly_history,
      symptom_checkins: formattedCheckins,
      diary_entries: diary_entries,
      past_consultations: consultations || [],
      doctor_adjustments: adjustments || []
    };
  }
};

// =====================================================
// DASHBOARD
// =====================================================

export const dashboardService = {
  async getSummary(doctorId: string): Promise<DashboardSummary> {
    const todayConsultations = await consultationService.getTodayConsultations(doctorId);
    const weekConsultations = await consultationService.getWeekConsultations(doctorId);

    // A receber = consultas realizadas (créditos) ainda não repassadas × valor do nível
    const earnings = await payoutService.getDoctorEarnings(doctorId);
    const pendingReceivable = earnings.pendingReceivable;

    // Calcular tempo médio de consulta (consultas completadas)
    const { data: completedConsultations } = await supabase
      .from('consultations')
      .select('started_at, ended_at')
      .eq('doctor_id', doctorId)
      .eq('status', 'completed');
      
    let totalTime = 0;
    let validConsultations = 0;

    if (completedConsultations) {
      completedConsultations.forEach(c => {
        if (c.started_at && c.ended_at) {
          const start = new Date(c.started_at).getTime();
          const end = new Date(c.ended_at).getTime();
          const diffMinutes = (end - start) / (1000 * 60);
          if (diffMinutes > 0 && diffMinutes < 300) { // Sanity check (max 5 hours)
            totalTime += diffMinutes;
            validConsultations++;
          }
        }
      });
    }
    
    const averageConsultationTime = validConsultations > 0 ? Math.round(totalTime / validConsultations) : 0;

    // Calcular pacientes novos vs recorrentes
    const { data: allConsultations } = await supabase
      .from('consultations')
      .select('patient_id')
      .eq('doctor_id', doctorId);
      
    const patientCounts: Record<string, number> = {};
    let newPatientsCount = 0;
    let recurringPatientsCount = 0;
    
    if (allConsultations) {
       allConsultations.forEach(c => {
         patientCounts[c.patient_id] = (patientCounts[c.patient_id] || 0) + 1;
       });
       
       const patients = Object.values(patientCounts);
       patients.forEach(count => {
         if (count === 1) newPatientsCount++;
         else if (count > 1) recurringPatientsCount++;
       });
    }

    const totalPatients = newPatientsCount + recurringPatientsCount;
    const newPatientsPercentage = totalPatients > 0 ? Math.round((newPatientsCount / totalPatients) * 100) : 0;
    const recurringPatientsPercentage = totalPatients > 0 ? Math.round((recurringPatientsCount / totalPatients) * 100) : 0;

    return {
      todayConsultations: todayConsultations.length,
      weekConsultations: weekConsultations.length,
      pendingReceivable,
      newPatientsCount,
      newPatientsPercentage,
      recurringPatientsCount,
      recurringPatientsPercentage,
      averageConsultationTime
    };
  },

  async getAdvancedData(doctorId: string): Promise<import('../types/doctorPortal').AdvancedDashboardData> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Buscar todos os IDs de pacientes do médico
    const { data: allConsults } = await supabase
      .from('consultations')
      .select('patient_id, type')
      .eq('doctor_id', doctorId);

    const allPatientIds = [...new Set((allConsults || []).map(c => c.patient_id))];

    // Mapa de patient_id → { name, photo_url } via profiles
    const patientInfoMap: Record<string, { name: string; photo_url: string | null }> = {};
    if (allPatientIds.length > 0) {
      const { data: ptProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', allPatientIds);
      for (const p of (ptProfiles || [])) {
        patientInfoMap[p.id] = { name: p.display_name || 'Paciente', photo_url: p.avatar_url || null };
      }
    }


    // 2. Funil de conversão — indicados pelo link do médico
    const { data: referredProfiles } = await supabase
      .from('profiles')
      .select('id, created_at')
      .eq('referred_by_doctor_id', doctorId);

    const totalReferred = referredProfiles?.length || 0;
    const referredIds = (referredProfiles || []).map(p => p.id);
    const referredThisMonth = (referredProfiles || []).filter(p =>
      new Date(p.created_at) >= firstOfMonth
    ).length;

    let referredScheduled = 0;
    if (referredIds.length > 0) {
      const { count } = await supabase
        .from('consultations')
        .select('patient_id', { count: 'exact', head: true })
        .in('patient_id', referredIds);
      // count the unique referred patients who booked
      const { data: bookedReferred } = await supabase
        .from('consultations')
        .select('patient_id')
        .in('patient_id', referredIds);
      referredScheduled = new Set((bookedReferred || []).map(c => c.patient_id)).size;
    }
    const conversionRate = totalReferred > 0 ? Math.round((referredScheduled / totalReferred) * 100) : 0;

    // 3. Taxa de retenção — pacientes com consulta do tipo follow_up
    const followUpPatients = new Set((allConsults || []).filter(c => c.type === 'follow_up').map(c => c.patient_id));
    const retentionRate = allPatientIds.length > 0
      ? Math.round((followUpPatients.size / allPatientIds.length) * 100)
      : 0;

    // Early return se não há pacientes
    if (allPatientIds.length === 0) {
      return {
        alertPatients: [],
        avgWeightLossKg: 0,
        retentionRate: 0,
        avgAdherence: 0,
        avgMood: 0,
        totalReferred,
        referredScheduled,
        conversionRate,
        referredThisMonth,
      };
    }

    // 4. Métricas de peso dos pacientes (últimos 30 dias)
    const { data: weightLogs } = await supabase
      .from('daily_logs')
      .select('user_id, date, weight')
      .in('user_id', allPatientIds)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .not('weight', 'is', null)
      .order('date', { ascending: true });

    let avgWeightLossKg = 0;
    if (weightLogs && weightLogs.length > 0) {
      const byPatient: Record<string, { first: number; last: number }> = {};
      for (const log of weightLogs) {
        if (!log.weight) continue;
        if (!byPatient[log.user_id]) byPatient[log.user_id] = { first: log.weight, last: log.weight };
        byPatient[log.user_id].last = log.weight;
      }
      const losses = Object.values(byPatient).map(p => p.first - p.last).filter(l => l > 0);
      avgWeightLossKg = losses.length > 0 ? parseFloat((losses.reduce((a, b) => a + b, 0) / losses.length).toFixed(1)) : 0;
    }

    // 5. Engajamento — adesão média (refeições registradas nos últimos 30 dias)
    const { data: mealLogs } = await supabase
      .from('meals')
      .select('user_id, created_at')
      .in('user_id', allPatientIds)
      .gte('created_at', thirtyDaysAgo.toISOString());

    let avgAdherence = 0;
    if (mealLogs && mealLogs.length > 0) {
      const daysByPatient: Record<string, Set<string>> = {};
      for (const meal of mealLogs) {
        if (!daysByPatient[meal.user_id]) daysByPatient[meal.user_id] = new Set();
        daysByPatient[meal.user_id].add(meal.created_at.split('T')[0]);
      }
      const adherences = Object.values(daysByPatient).map(days => Math.min(100, Math.round((days.size / 30) * 100)));
      avgAdherence = Math.round(adherences.reduce((a, b) => a + b, 0) / adherences.length);
    }

    // 6. Humor médio dos pacientes (últimos 7 dias)
    const { data: checkins } = await supabase
      .from('daily_checkins')
      .select('user_id, checkin_date, mood, symptoms')
      .in('user_id', allPatientIds)
      .gte('checkin_date', sevenDaysAgo.toISOString().split('T')[0]);

    let avgMood = 0;
    if (checkins && checkins.length > 0) {
      const moods = checkins.map(c => c.mood).filter(Boolean) as number[];
      avgMood = moods.length > 0 ? parseFloat((moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1)) : 0;
    }

    // 7. Alertas de atenção
    const alertPatients: import('../types/doctorPortal').AlertPatient[] = [];

    // 7a. Sintomas críticos (últimos 7 dias)
    const criticalSymptomKeywords = ['náusea severa', 'vômito', 'dor abdominal', 'tontura forte', 'desmaio', 'febre'];
    if (checkins) {
      for (const checkin of checkins) {
        const symptoms: string[] = Array.isArray(checkin.symptoms)
          ? checkin.symptoms
          : (typeof checkin.symptoms === 'string' ? JSON.parse(checkin.symptoms || '[]') : []);
        const hasCritical = symptoms.some(s =>
          criticalSymptomKeywords.some(k => s.toLowerCase().includes(k))
        );
        if (hasCritical && !alertPatients.find(a => a.id === checkin.user_id)) {
          const info = patientInfoMap[checkin.user_id];
          alertPatients.push({
            id: checkin.user_id,
            name: info?.name || 'Paciente',
            photo_url: info?.photo_url || null,
            alertType: 'symptom',
            detail: `Sintoma crítico: ${symptoms.filter(s => criticalSymptomKeywords.some(k => s.toLowerCase().includes(k))).join(', ')}`,
          });
        }
      }
    }

    // 7b. Baixa adesão (menos de 3 dias de registro nos últimos 10 dias)
    const { data: recentMeals } = await supabase
      .from('meals')
      .select('user_id, created_at')
      .in('user_id', allPatientIds)
      .gte('created_at', tenDaysAgo.toISOString());

    const daysByPatientRecent: Record<string, Set<string>> = {};
    (recentMeals || []).forEach(m => {
      if (!daysByPatientRecent[m.user_id]) daysByPatientRecent[m.user_id] = new Set();
      daysByPatientRecent[m.user_id].add(m.created_at.split('T')[0]);
    });

    const lowAdherenceIds = allPatientIds.filter(id => (daysByPatientRecent[id]?.size || 0) < 3);
    lowAdherenceIds.forEach(id => {
      if (!alertPatients.find(a => a.id === id)) {
        const info = patientInfoMap[id];
        const days = daysByPatientRecent[id]?.size || 0;
        alertPatients.push({
          id,
          name: info?.name || 'Paciente',
          photo_url: info?.photo_url || null,
          alertType: 'low_adherence',
          detail: `Apenas ${days} dias com registro nos últimos 10 dias`,
        });
      }
    });

    // 7c. Estagnação de peso (peso não reduziu nas últimas 3 pesagens)
    const { data: recentWeights } = await supabase
      .from('daily_logs')
      .select('user_id, date, weight')
      .in('user_id', allPatientIds)
      .not('weight', 'is', null)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    const weightsByPatient: Record<string, number[]> = {};
    (recentWeights || []).forEach(log => {
      if (!weightsByPatient[log.user_id]) weightsByPatient[log.user_id] = [];
      if (weightsByPatient[log.user_id].length < 3) weightsByPatient[log.user_id].push(log.weight);
    });

    const stagnantIds = Object.entries(weightsByPatient)
      .filter(([, weights]) => weights.length >= 3 && weights[0] >= weights[2])
      .map(([id]) => id);

    stagnantIds.forEach(id => {
      if (!alertPatients.find(a => a.id === id)) {
        const info = patientInfoMap[id];
        const weights = weightsByPatient[id];
        alertPatients.push({
          id,
          name: info?.name || 'Paciente',
          photo_url: info?.photo_url || null,
          alertType: 'weight_stagnation',
          detail: `Peso estagnado: ${weights[weights.length - 1]}kg → ${weights[0]}kg`,
        });
      }
    });

    return {
      alertPatients,
      avgWeightLossKg,
      retentionRate,
      avgAdherence,
      avgMood,
      totalReferred,
      referredScheduled,
      conversionRate,
      referredThisMonth,
    };
  }
};

// =====================================================
// INFLUENCIADORES
// =====================================================

export type Influencer = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  instagram_handle: string | null;
  pix_key: string | null;
  referral_token: string;
  setup_token: string | null; // null após ativação da conta
  commission_per_referral: number;
  status: 'active' | 'paused' | 'cancelled';
  notes: string | null;
  link_visits: number;         // visitas ao link /i/:token
  created_at: string;
  updated_at: string;
};

export type InfluencerReferral = {
  id: string;
  influencer_id: string;
  user_id: string | null;
  commission_amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
  created_at: string;
};

export type InfluencerSummary = Influencer & {
  total_referrals: number;
  pending_referrals: number;
  total_earned: number;   // paid + pending
  pending_amount: number; // só pending
};

export const influencerService = {
  // Listar todos com métricas agregadas
  async getAll(): Promise<InfluencerSummary[]> {
    const { data: influencers, error } = await supabase
      .from('influencers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!influencers?.length) return [];

    const ids = influencers.map(i => i.id);
    const { data: refs } = await supabase
      .from('influencer_referrals')
      .select('influencer_id, commission_amount, status')
      .in('influencer_id', ids);

    return influencers.map(inf => {
      const myRefs = refs?.filter(r => r.influencer_id === inf.id) ?? [];
      const pendingRefs = myRefs.filter(r => r.status === 'pending');
      return {
        ...inf,
        total_referrals: myRefs.length,
        pending_referrals: pendingRefs.length,
        total_earned: myRefs.reduce((s, r) => s + r.commission_amount, 0),
        pending_amount: pendingRefs.reduce((s, r) => s + r.commission_amount, 0),
      };
    });
  },

  // Criar influenciador com conta auth criada pelo admin (via Edge Function)
  // O admin define a senha — o influenciador faz login direto, sem fluxo de ativação
  async createWithAuth(data: Partial<Influencer>): Promise<Influencer> {
    const { data: result, error } = await supabase.functions.invoke('create-influencer-user', {
      body: data,
    });
    if (error) throw new Error(error.message);
    if (result?.error) throw new Error(result.error);
    return result as Influencer;
  },

  // Criar influenciador sem conta auth (legado — mantido para compatibilidade)
  async create(data: Partial<Influencer>): Promise<Influencer> {
    const referral_token = `inf_${uuidv4().replace(/-/g, '')}`;
    const setup_token = `setup_${uuidv4().replace(/-/g, '')}`;
    const { data: created, error } = await supabase
      .from('influencers')
      .insert([{ ...data, referral_token, setup_token }])
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  // Atualizar influenciador
  async update(id: string, data: Partial<Influencer>): Promise<Influencer> {
    const { data: updated, error } = await supabase
      .from('influencers')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  },

  // Buscar por token (landing page — não requer auth)
  async getByToken(token: string): Promise<Pick<Influencer, 'id' | 'name' | 'instagram_handle' | 'commission_per_referral'> | null> {
    const { data, error } = await supabase
      .rpc('get_influencer_referral_preview', { p_token: token })
      .maybeSingle();

    if (error) return null;
    return data as Pick<Influencer, 'id' | 'name' | 'instagram_handle' | 'commission_per_referral'> | null;
  },

  // Buscar referrals de um influenciador
  async getReferrals(influencerId: string): Promise<InfluencerReferral[]> {
    const { data, error } = await supabase
      .from('influencer_referrals')
      .select('*')
      .eq('influencer_id', influencerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  // Registrar conversão (chamado em applyReferralData) — idempotente: ignora se já existe
  async registerReferral(influencerId: string): Promise<void> {
    const { error } = await supabase.rpc('register_influencer_referral', {
      p_influencer_id: influencerId,
    });

    if (error) throw error;
  },

  // Incrementar contador de visitas ao link /i/:token (chamado na landing page)
  async incrementVisit(token: string): Promise<void> {
    // Falhas silenciosas — não bloquear a experiência do usuário
    await supabase.rpc('increment_influencer_visits', { p_token: token });
  },

  // Buscar influenciador por setup_token (página de ativação)
  async getBySetupToken(token: string): Promise<Pick<Influencer, 'id' | 'name' | 'email'> | null> {
    const { data, error } = await supabase
      .rpc('get_influencer_setup_preview', { p_token: token })
      .maybeSingle();

    if (error) return null;
    return data as Pick<Influencer, 'id' | 'name' | 'email'> | null;
  },

  // Vincular conta do app ao influenciador e invalidar setup_token
  async activateAccount(setupToken: string): Promise<void> {
    const { data, error } = await supabase.rpc('activate_influencer_account', {
      p_setup_token: setupToken,
    });

    if (error) throw error;
    if (!data) throw new Error('Link invalido, expirado ou vinculado a outro e-mail.');
  },

  // Buscar influenciador pelo user_id (dashboard do influenciador)
  async getByUserId(userId: string): Promise<(Influencer & { pending_amount: number; total_referrals: number; total_earned: number }) | null> {
    const { data: inf, error } = await supabase
      .from('influencers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !inf) return null;

    const { data: refs } = await supabase
      .from('influencer_referrals')
      .select('commission_amount, status')
      .eq('influencer_id', inf.id);

    const pending = refs?.filter(r => r.status === 'pending') ?? [];
    return {
      ...inf,
      total_referrals: refs?.length ?? 0,
      total_earned: refs?.reduce((s, r) => s + r.commission_amount, 0) ?? 0,
      pending_amount: pending.reduce((s, r) => s + r.commission_amount, 0),
    };
  },

  // Marcar todas as comissões pendentes de um influenciador como pagas
  async markPaid(influencerId: string): Promise<void> {
    const { error } = await supabase
      .from('influencer_referrals')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('influencer_id', influencerId)
      .eq('status', 'pending');

    if (error) throw error;
  },
};

// =====================================================
// ADMIN
// =====================================================

// =====================================================
// TIPOS INTERNOS — USUÁRIOS (ADMIN)
// =====================================================

export type AdminUserSummary = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  whatsapp: string | null;
  created_at: string;
  acquisition_channel: string | null;
  referred_by_doctor_id: string | null;
  referred_by_doctor_name: string | null;
  consultations_count: number;
  ltv: number; // total gasto em consultas concluídas
  // Dados demográficos (para gráficos)
  age: number | null;
  gender: string | null;
  goal: string | null;
};

export type AdminUserDetail = AdminUserSummary & {
  age: number | null;
  gender: string | null;
  weight: number | null;
  height: number | null;
  goal: string | null;
  level: number;
  total_xp: number;
  current_streak: number;
  consultations: Array<{
    id: string;
    scheduled_at: string;
    doctor_name: string | null;
    status: string;
    price: number | null;
    type: string;
  }>;
};

export type AdminDoctorKpis = {
  aprovados: number;
  pendentes: number;
  consultas_mes: number;
  media_consultas_dia: number;
  cancelamentos_mes: number;
  taxa_cancelamento: number;
  pacientes_unicos_mes: number;
  medicos_ativos_mes: number;
};

export type AdminColaboradorB2B = {
  id: string;
  empresa_id: string;
  empresa_nome: string;
  user_id: string | null;
  email: string;
  whatsapp: string | null;
  status: 'convidado' | 'ativo' | 'removido';
  data_adicao: string;
  data_ativacao: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

// Saúde do loop clínico (RLHF): quanto sinal de supervisão médica o modelo
// está de fato recebendo. O gargalo do aprendizado é ai_report_feedback vazio.
export type ClinicalLoopHealth = {
  total_reports: number;          // relatórios de IA gerados (briefings + planos)
  reports_with_feedback: number;  // quantos receberam veredito do médico
  awaiting_feedback: number;      // total_reports - reports_with_feedback
  supervision_rate: number;       // % de relatórios supervisionados
  verdict_accept: number;
  verdict_accept_with_edits: number;
  verdict_reject: number;
  active_reviewers: number;       // médicos distintos que já deram feedback
  conducts_total: number;         // condutas registradas no ledger
  conducts_with_outcome: number;  // condutas com desfecho já calculado
};

// =====================================================
// ADMIN
// =====================================================

export const adminService = {
  // KPIs da rede médica (mês corrente)
  async getDoctorKpis(): Promise<AdminDoctorKpis> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysElapsed = Math.max(1, now.getDate());

    const [doctorsRes, consultsRes] = await Promise.all([
      supabase.from('doctors').select('id, status'),
      supabase.from('consultations')
        .select('patient_id, doctor_id, status')
        .gte('scheduled_at', startOfMonth.toISOString()),
    ]);

    const doctors = doctorsRes.data ?? [];
    const consults = consultsRes.data ?? [];

    const completed  = consults.filter(c => c.status === 'completed');
    const cancelled  = consults.filter(c => c.status === 'cancelled' || c.status === 'no_show');

    return {
      aprovados:          doctors.filter(d => d.status === 'approved').length,
      pendentes:          doctors.filter(d => d.status === 'pending').length,
      consultas_mes:      completed.length,
      media_consultas_dia: +(completed.length / daysElapsed).toFixed(1),
      cancelamentos_mes:  cancelled.length,
      taxa_cancelamento:  consults.length > 0 ? Math.round(cancelled.length / consults.length * 100) : 0,
      pacientes_unicos_mes: new Set(completed.map(c => c.patient_id)).size,
      medicos_ativos_mes:   new Set(completed.map(c => c.doctor_id)).size,
    };
  },

  // Saúde do loop clínico (RLHF): mede o sinal de supervisão médica que o
  // modelo recebe. Usa head-count queries (head:true) para não puxar linhas.
  async getClinicalLoopHealth(): Promise<ClinicalLoopHealth> {
    const countOf = async (
      table: string,
      apply?: (q: any) => any
    ): Promise<number> => {
      let q = supabase.from(table).select('id', { count: 'exact', head: true });
      if (apply) q = apply(q);
      const { count } = await q;
      return count ?? 0;
    };

    const [
      total_reports,
      conducts_total,
      verdict_accept,
      verdict_accept_with_edits,
      verdict_reject,
    ] = await Promise.all([
      countOf('ai_clinical_reports'),
      countOf('clinical_conduct_events'),
      countOf('ai_report_feedback', q => q.eq('verdict', 'accept')),
      countOf('ai_report_feedback', q => q.eq('verdict', 'accept_with_edits')),
      countOf('ai_report_feedback', q => q.eq('verdict', 'reject')),
    ]);

    // Relatórios distintos com feedback e revisores distintos: precisam das linhas.
    const { data: feedbackRows } = await supabase
      .from('ai_report_feedback')
      .select('report_id, doctor_id');

    const reports_with_feedback = new Set((feedbackRows ?? []).map(r => r.report_id)).size;
    const active_reviewers = new Set((feedbackRows ?? []).map(r => r.doctor_id).filter(Boolean)).size;

    // clinical_outcomes tem N linhas por conduta (horizontes 7/30/90d); contamos
    // condutas DISTINTAS que já têm ao menos um desfecho calculado.
    const { data: outcomeRows } = await supabase
      .from('clinical_outcomes')
      .select('conduct_event_id');
    const conducts_with_outcome = new Set((outcomeRows ?? []).map(r => r.conduct_event_id)).size;

    return {
      total_reports,
      reports_with_feedback,
      awaiting_feedback: Math.max(0, total_reports - reports_with_feedback),
      supervision_rate: total_reports > 0
        ? Math.round((reports_with_feedback / total_reports) * 100)
        : 0,
      verdict_accept,
      verdict_accept_with_edits,
      verdict_reject,
      active_reviewers,
      conducts_total,
      conducts_with_outcome,
    };
  },

  // Buscar todos os usuários com dados de LTV
  async getAllUsers(search?: string): Promise<AdminUserSummary[]> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        avatar_url,
        whatsapp,
        created_at,
        acquisition_channel,
        referred_by_doctor_id,
        age,
        gender,
        goal
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!profiles?.length) return [];

    // Excluir gestores de empresa e médicos: cada um tem sua própria aba.
    // O vínculo com auth.users (= profiles.id) é doctors.user_id, não
    // doctors.id, que é PK própria da tabela — comparar pelo id nunca
    // casava e todo médico aparecia aqui como se fosse paciente.
    const [{ data: rhRows }, { data: doctorRows }] = await Promise.all([
      supabase.from('rh_usuarios').select('user_id'),
      supabase.from('doctors').select('user_id'),
    ]);
    const excludedIds = new Set([
      ...(rhRows ?? []).map((r: any) => r.user_id),
      ...(doctorRows ?? []).map((d: any) => d.user_id),
    ].filter(Boolean));
    const patientProfiles = profiles.filter(p => !excludedIds.has(p.id));
    if (!patientProfiles.length) return [];

    const doctorIds = [...new Set(patientProfiles.map(p => p.referred_by_doctor_id).filter(Boolean))];
    let doctorMap: Record<string, string> = {};
    if (doctorIds.length) {
      const { data: doctors } = await supabase
        .from('doctors')
        .select('id, name')
        .in('id', doctorIds as string[]);
      doctors?.forEach(d => { doctorMap[d.id] = d.name; });
    }

    const patientIds = patientProfiles.map(p => p.id);
    const { loadNivelValues, valueForNivel } = await import('./billingService');
    const [{ data: consultations }, { data: todosProfissionais }, nivelValues] = await Promise.all([
      supabase
        .from('consultations')
        .select('patient_id, doctor_id, status')
        .in('patient_id', patientIds),
      supabase.from('doctors').select('id, nivel, tipo_profissional'),
      loadNivelValues(),
    ]);

    // Custo de atendimento, não receita: no modelo B2B quem paga é a
    // empresa (por assento), então somar preço de consulta por paciente
    // media dinheiro que ninguém desembolsou. O número útil por
    // colaborador é quanto custou atendê-lo — consultas realizadas ×
    // valor do nível do profissional. Ver MODELO_FINANCEIRO.md.
    const nivelPorMedico: Record<string, { nivel: string; tipo: string | null }> = {};
    for (const d of (todosProfissionais ?? []) as any[]) {
      nivelPorMedico[d.id] = { nivel: d.nivel, tipo: d.tipo_profissional ?? null };
    }

    const consultMap: Record<string, { count: number; ltv: number }> = {};
    consultations?.forEach((c: any) => {
      if (!consultMap[c.patient_id]) consultMap[c.patient_id] = { count: 0, ltv: 0 };
      consultMap[c.patient_id].count++;
      if (c.status === 'completed') {
        const prof = c.doctor_id ? nivelPorMedico[c.doctor_id] : undefined;
        consultMap[c.patient_id].ltv += valueForNivel(nivelValues, prof?.nivel, prof?.tipo);
      }
    });

    // Buscar emails via RPC (acessa auth.users com SECURITY DEFINER)
    const { data: emailRows } = await supabase.rpc('admin_get_all_users');
    const emailMap: Record<string, string> = {};
    if (emailRows) {
      (emailRows as any[]).forEach(r => { if (r.email) emailMap[r.id] = r.email; });
    }

    const result: AdminUserSummary[] = patientProfiles.map(p => ({
      id: p.id,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      email: emailMap[p.id] ?? null,
      whatsapp: p.whatsapp ?? null,
      created_at: p.created_at,
      acquisition_channel: p.acquisition_channel,
      referred_by_doctor_id: p.referred_by_doctor_id,
      referred_by_doctor_name: p.referred_by_doctor_id ? doctorMap[p.referred_by_doctor_id] ?? null : null,
      consultations_count: consultMap[p.id]?.count ?? 0,
      ltv: consultMap[p.id]?.ltv ?? 0,
      age: p.age ?? null,
      gender: p.gender ?? null,
      goal: p.goal ?? null,
    }));

    if (search) {
      const q = search.toLowerCase();
      return result.filter(u =>
        u.display_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.whatsapp?.toLowerCase().includes(q) ||
        u.referred_by_doctor_name?.toLowerCase().includes(q)
      );
    }

    return result;
  },

  // Buscar ficha completa de um usuário
  async getUserDetail(userId: string): Promise<AdminUserDetail | null> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id, display_name, avatar_url, whatsapp, created_at,
        acquisition_channel, referred_by_doctor_id,
        age, gender, weight, height, goal,
        level, total_xp, current_streak
      `)
      .eq('id', userId)
      .single();

    if (error || !profile) return null;

    // Médico indicador
    let referred_by_doctor_name: string | null = null;
    if (profile.referred_by_doctor_id) {
      const { data: doc } = await supabase
        .from('doctors')
        .select('name')
        .eq('id', profile.referred_by_doctor_id)
        .single();
      referred_by_doctor_name = doc?.name ?? null;
    }

    // Consultas detalhadas
    const { data: consults } = await supabase
      .from('consultations')
      .select('id, scheduled_at, doctor_id, status, type')
      .eq('patient_id', userId)
      .order('scheduled_at', { ascending: false });

    const doctorIds = [...new Set(consults?.map(c => c.doctor_id).filter(Boolean) ?? [])];
    let docNameMap: Record<string, string> = {};
    let docNivelMap: Record<string, { nivel: string; tipo: string | null }> = {};
    if (doctorIds.length) {
      const { data: docs } = await supabase
        .from('doctors')
        .select('id, name, nivel, tipo_profissional')
        .in('id', doctorIds);
      docs?.forEach((d: any) => {
        docNameMap[d.id] = d.name;
        docNivelMap[d.id] = { nivel: d.nivel, tipo: d.tipo_profissional ?? null };
      });
    }

    // Custo de atendimento (não receita) — ver getAllUsers e MODELO_FINANCEIRO.md
    const { loadNivelValues, valueForNivel } = await import('./billingService');
    const nivelValues = await loadNivelValues();
    const totalLtv = (consults ?? [])
      .filter((c: any) => c.status === 'completed')
      .reduce((sum: number, c: any) => {
        const prof = c.doctor_id ? docNivelMap[c.doctor_id] : undefined;
        return sum + valueForNivel(nivelValues, prof?.nivel, prof?.tipo);
      }, 0);

    // E-mail via RPC (acessa auth.users com SECURITY DEFINER) — mesma fonte
    // usada em getAllUsers.
    const { data: emailRows } = await supabase.rpc('admin_get_all_users');
    const email = (emailRows as any[] | null)?.find(r => r.id === userId)?.email ?? null;

    return {
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      email,
      whatsapp: profile.whatsapp,
      created_at: profile.created_at,
      acquisition_channel: profile.acquisition_channel,
      referred_by_doctor_id: profile.referred_by_doctor_id,
      referred_by_doctor_name,
      consultations_count: consults?.length ?? 0,
      ltv: totalLtv,
      age: profile.age,
      gender: profile.gender,
      weight: profile.weight,
      height: profile.height,
      goal: profile.goal,
      level: profile.level ?? 1,
      total_xp: profile.total_xp ?? 0,
      current_streak: profile.current_streak ?? 0,
      consultations: consults?.map((c: any) => ({
        id: c.id,
        scheduled_at: c.scheduled_at,
        doctor_name: docNameMap[c.doctor_id] ?? null,
        status: c.status,
        // Custo da consulta pelo nível do profissional. `consultations.price`
        // é o preço do modelo B2C extinto e não é exibido em lugar nenhum.
        price: c.status === 'completed'
          ? valueForNivel(
              nivelValues,
              c.doctor_id ? docNivelMap[c.doctor_id]?.nivel : undefined,
              c.doctor_id ? docNivelMap[c.doctor_id]?.tipo : undefined,
            )
          : null,
        type: c.type,
      })) ?? [],
    };
  },

  // Mapa user_id → empresa_nome para usuários B2B ativos
  async getVinculosEmpresa(): Promise<Record<string, string>> {
    const { data } = await supabase
      .from('empresa_colaboradores')
      .select('user_id, empresas(nome)')
      .eq('status', 'ativo')
      .not('user_id', 'is', null);
    const map: Record<string, string> = {};
    (data ?? []).forEach((c: any) => {
      if (c.user_id) map[c.user_id] = c.empresas?.nome ?? '';
    });
    return map;
  },

  // Todos os colaboradores B2B (ativos + convidados) com dados de perfil
  async getAllColaboradoresB2B(): Promise<AdminColaboradorB2B[]> {
    const { data, error } = await supabase
      .from('empresa_colaboradores')
      .select('*, empresas(nome)')
      .neq('status', 'removido')
      .order('data_adicao', { ascending: false });
    if (error) throw error;

    const userIds = (data ?? []).filter(c => c.user_id).map(c => c.user_id as string);
    const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);
      (profiles ?? []).forEach(p => { profileMap[p.id] = p; });
    }

    return (data ?? []).map((c: any) => ({
      id: c.id,
      empresa_id: c.empresa_id,
      empresa_nome: c.empresas?.nome ?? '—',
      user_id: c.user_id,
      email: c.email,
      whatsapp: c.whatsapp ?? null,
      status: c.status,
      data_adicao: c.data_adicao,
      data_ativacao: c.data_ativacao,
      display_name: c.user_id ? (profileMap[c.user_id]?.display_name ?? null) : null,
      avatar_url: c.user_id ? (profileMap[c.user_id]?.avatar_url ?? null) : null,
    }));
  },

  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    // Profissionais aprovados, separados por tipo. Legado sem
    // tipo_profissional é médico (mesma convenção do resto do sistema).
    const { data: approvedDoctors, error: doctorsError } = await supabase
      .from('doctors')
      .select('id, tipo_profissional')
      .eq('status', 'approved');

    // Consultas do mês que de fato aconteceram. Sem o filtro de status, o
    // card contava cancelada, no-show e até as ainda agendadas para os
    // próximos dias — e a receita da plataforma era calculada em cima disso.
    // Mesmo critério do getDoctorKpis.
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: monthConsultations, error: consultError } = await supabase
      .from('consultations')
      .select('id')
      .eq('status', 'completed')
      .gte('scheduled_at', startOfMonth.toISOString());

    // Buscar médicos pendentes
    const pendingDoctors = await doctorService.getPendingDoctors();

    // Receita do mês = faturas B2B pagas no mês. Antes era
    // `soma(consultations.price) * 0.25` — a comissão do modelo B2C extinto
    // sobre um preço que ninguém paga. Ver MODELO_FINANCEIRO.md.
    const [{ data: pendingPayouts }, { data: faturasMes }] = await Promise.all([
      supabase.from('payouts').select('amount').eq('status', 'pending'),
      supabase
        .from('empresa_faturas')
        .select('valor')
        .eq('status', 'pago')
        .gte('pago_em', startOfMonth.toISOString()),
    ]);

    const pendingPayoutsTotal = pendingPayouts?.reduce((sum, p) => sum + p.amount, 0) || 0;

    return {
      approvedDoctors: (approvedDoctors ?? []).filter(
        (d: any) => (d.tipo_profissional ?? 'medico') === 'medico').length,
      approvedPsychologists: (approvedDoctors ?? []).filter(
        (d: any) => d.tipo_profissional === 'psicologo').length,
      monthConsultations: monthConsultations?.length || 0,
      platformRevenue: (faturasMes ?? []).reduce(
        (sum: number, f: any) => sum + (Number(f.valor) || 0), 0),
      pendingPayouts: pendingPayoutsTotal,
      pendingDoctors
    };
  }
};

// =====================================================
// UPLOAD DE ARQUIVOS
// =====================================================

export const storageService = {
  // Upload de foto do médico
  async uploadDoctorPhoto(file: File, doctorId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${doctorId}/profile.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('doctors-photos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('doctors-photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  // Upload de certificado ICP
  async uploadCertificate(file: File, doctorId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${doctorId}/certificate.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('doctors-certificates')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Retornar path para download assinado (private bucket)
    const { data } = await supabase.storage
      .from('doctors-certificates')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 ano

    if (!data) throw new Error('Failed to create signed URL');
    return data.signedUrl;
  },

  /**
   * Documento de comprovação do conselho (carteira do CRP, comprovante e-Psi).
   * A pasta é o auth.uid() porque o upload acontece no cadastro, antes de
   * existir linha em `doctors`.
   *
   * Devolve o PATH, não a URL: bucket é privado e link assinado expira —
   * guardar URL no banco daria link morto depois de um ano.
   */
  async uploadDocumentoConselho(file: File, userId: string): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `${userId}/conselho.${ext}`;

    const { error } = await supabase.storage
      .from('profissional-documentos')
      .upload(path, file, { upsert: true });

    if (error) throw error;
    return path;
  },

  /** URL assinada para o admin abrir o documento (10 min). */
  async getDocumentoConselhoUrl(doctorId: string): Promise<string | null> {
    const { data: path, error: rpcErr } = await supabase
      .rpc('admin_documento_conselho_path', { p_doctor_id: doctorId });
    if (rpcErr || !path) return null;

    const { data, error } = await supabase.storage
      .from('profissional-documentos')
      .createSignedUrl(path as string, 600);
    if (error || !data) return null;
    return data.signedUrl;
  },

  // Upload de PDF de receita
  async uploadPrescriptionPDF(file: File, prescriptionId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const filePath = `${prescriptionId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('prescriptions-pdf')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = await supabase.storage
      .from('prescriptions-pdf')
      .createSignedUrl(filePath, 60 * 60 * 24 * 90); // 90 dias

    if (!data) throw new Error('Failed to create signed URL');
    return data.signedUrl;
  }
};

// =====================================================
// GLP-1 Doctor Services
// =====================================================

export interface GLP1MealSlot {
  time: string;   // "HH:MM"
  label: string;
  notes?: string;
}

export interface GLP1DoctorPrescriptionInput {
  doctor_id: string;
  doctor_name: string;
  medication?: string;
  current_dose_mg?: number;
  next_dose_mg?: number;
  frequency?: 'weekly' | 'daily';
  day_of_week?: number;
  time?: string;
  macro_calories?: number;
  macro_protein_g?: number;
  macro_carbs_g?: number;
  macro_fats_g?: number;
  notes?: string;
  locked_fields?: string[];
}

export const glp1DoctorService = {
  /**
   * Update the doctor-recommended meal schedule for a patient.
   * Stored as JSONB in profiles.glp1_meal_schedule.
   */
  async updatePatientGlp1Schedule(patientId: string, schedule: GLP1MealSlot[]): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ glp1_meal_schedule: schedule })
      .eq('id', patientId);

    if (error) throw error;
  },

  /**
   * Fetch the current meal schedule for a patient.
   */
  async getPatientGlp1Schedule(patientId: string): Promise<GLP1MealSlot[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('glp1_meal_schedule')
      .eq('id', patientId)
      .maybeSingle();

    if (error) throw error;
    return (data?.glp1_meal_schedule as GLP1MealSlot[]) || [];
  },

  /**
   * Apply a GLP-1 prescription to a patient's profile.
   * Syncs medication/dose/schedule/macros and stamps prescribed_at.
   * The patient sees a "Prescrito por Dr. X" badge in GLP1Dashboard.
   */
  async prescribeGlp1(patientId: string, input: GLP1DoctorPrescriptionInput): Promise<void> {
    const prescription = {
      ...input,
      prescribed_at: new Date().toISOString(),
    };

    const updates: Record<string, unknown> = {
      glp1_doctor_prescription: prescription,
    };

    // Sync prescription fields to top-level profile fields
    if (input.medication)       updates.glp1_medication         = input.medication;
    if (input.current_dose_mg)  updates.glp1_current_dose_mg    = input.current_dose_mg;
    if (input.macro_calories)   updates.target_calories          = input.macro_calories;
    if (input.macro_protein_g)  updates.target_protein           = input.macro_protein_g;
    if (input.macro_carbs_g)    updates.target_carbs             = input.macro_carbs_g;
    if (input.macro_fats_g)     updates.target_fats              = input.macro_fats_g;

    if (input.frequency && input.time) {
      updates.glp1_application_schedule = {
        frequency:   input.frequency,
        day_of_week: input.day_of_week,
        time:        input.time,
      };
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', patientId);

    if (error) throw error;
  },

  /**
   * Fetch the current GLP-1 prescription for a patient.
   */
  async getPatientGlp1Prescription(patientId: string): Promise<GLP1DoctorPrescriptionInput | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('glp1_doctor_prescription')
      .eq('id', patientId)
      .maybeSingle();

    if (error) throw error;
    return (data?.glp1_doctor_prescription as GLP1DoctorPrescriptionInput) || null;
  },
};

// =====================================================
// PRONTUÁRIO CLÍNICO (clinical_notes)
// =====================================================

export const clinicalNoteService = {
  async getByConsultation(consultationId: string): Promise<ClinicalNote | null> {
    const { data, error } = await supabase
      .from('clinical_notes')
      .select('*')
      .eq('consultation_id', consultationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Última nota finalizada do paciente — sinais vitais e conduta da consulta
  // anterior, para dar continuidade clínica na consulta atual.
  async getLastFinalizedForPatient(patientId: string, excludeConsultationId?: string): Promise<ClinicalNote | null> {
    let query = supabase
      .from('clinical_notes')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_draft', false)
      .order('finalized_at', { ascending: false })
      .limit(1);
    if (excludeConsultationId) query = query.neq('consultation_id', excludeConsultationId);

    const { data, error } = await query.maybeSingle();
    if (error) return null;
    return data;
  },

  async upsert(consultationId: string, doctorId: string, patientId: string, fields: Partial<ClinicalNoteFormData>): Promise<ClinicalNote> {
    const numericField = (v: string | undefined) => v ? parseFloat(v) || null : null;
    const intField    = (v: string | undefined) => v ? parseInt(v)   || null : null;

    const payload = {
      consultation_id:    consultationId,
      doctor_id:          doctorId,
      patient_id:         patientId,
      chief_complaint:    fields.chief_complaint    ?? null,
      history_illness:    fields.history_illness    ?? null,
      relevant_history:   fields.relevant_history   ?? null,
      physical_exam:      fields.physical_exam      ?? null,
      diagnosis:          fields.diagnosis          ?? null,
      plan:               fields.plan               ?? null,
      free_text:          fields.free_text          ?? null,
      weight_kg:          numericField(fields.weight_kg),
      height_cm:          numericField(fields.height_cm),
      blood_pressure_sys: intField(fields.blood_pressure_sys),
      blood_pressure_dia: intField(fields.blood_pressure_dia),
      heart_rate:         intField(fields.heart_rate),
      waist_cm:           numericField(fields.waist_cm),
    };

    const { data, error } = await supabase
      .from('clinical_notes')
      .upsert(payload, { onConflict: 'consultation_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async finalize(noteId: string): Promise<ClinicalNote> {
    const { data, error } = await supabase
      .from('clinical_notes')
      .update({ is_draft: false, finalized_at: new Date().toISOString() })
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async canCloseConsultation(consultationId: string): Promise<CanCloseResult> {
    const { data, error } = await supabase.rpc('can_close_appointment', {
      p_consultation_id: consultationId,
    });
    if (error) throw error;
    return data as CanCloseResult;
  },

  async getPatientHistory(patientId: string, doctorId: string): Promise<PatientFullHistory> {
    const { data, error } = await supabase.rpc('get_patient_full_history', {
      p_patient_id: patientId,
      p_doctor_id:  doctorId,
    });
    if (error) throw error;
    return data as PatientFullHistory;
  },
};

// =====================================================
// CHATS PÓS-CONSULTA (appointment_chats + chat_messages)
// =====================================================

export const appointmentChatService = {
  // Retorna o id do chat, ou null quando o profissional é psicólogo
  // (psicólogo não tem chat pós-consulta — regra aplicada na RPC).
  async openChat(consultationId: string, slaHours = 48): Promise<string | null> {
    const { data, error } = await supabase.rpc('open_appointment_chat', {
      p_consultation_id: consultationId,
      p_sla_hours:       slaHours,
    });
    if (error) throw error;
    return (data as string | null) ?? null;
  },

  // Busca todos os chats ativos do paciente (usado no app do paciente)
  async getPatientChats(patientUserId: string): Promise<AppointmentChat[]> {
    const { data, error } = await supabase
      .from('appointment_chats')
      .select('*')
      .eq('patient_id', patientUserId)
      .eq('status', 'open')
      .order('opened_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as AppointmentChat[];
  },

  async getDoctorChats(doctorId: string, status?: 'open' | 'closed' | 'expired'): Promise<AppointmentChat[]> {
    let query = supabase
      .from('appointment_chats')
      .select(`
        *,
        patient:profiles!appointment_chats_patient_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .eq('doctor_id', doctorId)
      .order('opened_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((c: any) => ({
      ...c,
      patient_name:  c.patient?.display_name ?? 'Paciente',
      patient_photo: c.patient?.avatar_url   ?? null,
    }));
  },

  async getMessages(chatId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return signStoragePaths('chat-files', (data ?? []) as ChatMessage[]);
  },

  async sendMessage(chatId: string, content: string | null, file?: {
    url: string; name: string; type: string; sizeKb: number;
  }): Promise<ChatMessage> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    // Determinar role do remetente
    const { data: doctor } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const senderRole = doctor ? 'doctor' : 'patient';

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{
        chat_id:     chatId,
        sender_id:   user.id,
        sender_role: senderRole,
        content,
        file_url:    file?.url     ?? null,
        file_name:   file?.name    ?? null,
        file_type:   file?.type    ?? null,
        file_size_kb: file?.sizeKb ?? null,
      }])
      .select()
      .single();

    if (error) throw error;
    return (await signStoragePaths('chat-files', [data as ChatMessage]))[0];
  },

  async markRead(chatId: string, senderRole: 'doctor' | 'patient'): Promise<void> {
    const oppositeRole = senderRole === 'doctor' ? 'patient' : 'doctor';
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('chat_id', chatId)
      .eq('sender_role', oppositeRole)
      .eq('is_read', false);

    if (error) throw error;
  },

  async closeChat(chatId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('appointment_chats')
      .update({ status: 'closed', closed_at: new Date().toISOString(), closed_by: user?.id })
      .eq('id', chatId);

    if (error) throw error;
  },

  subscribeToMessages(chatId: string, onMessage: (msg: ChatMessage) => void) {
    return supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          void signStoragePaths('chat-files', [payload.new as ChatMessage])
            .then(([message]) => onMessage(message));
        }
      )
      .subscribe();
  },

  // Returns a map keyed by patient_id with the most recent open chat and its unread count.
  // Used by the patients list to show chat buttons and unread badges.
  async getPatientChatStatus(doctorId: string): Promise<Map<string, { chatId: string; unreadCount: number }>> {
    const { data: chats, error: chatsError } = await supabase
      .from('appointment_chats')
      .select('id, patient_id')
      .eq('doctor_id', doctorId)
      .eq('status', 'open')
      .order('opened_at', { ascending: false });

    if (chatsError) throw chatsError;
    if (!chats || chats.length === 0) return new Map();

    const chatIds = chats.map((c: any) => c.id);

    const { data: msgs, error: msgsError } = await supabase
      .from('chat_messages')
      .select('chat_id')
      .in('chat_id', chatIds)
      .eq('sender_role', 'patient')
      .eq('is_read', false);

    if (msgsError) throw msgsError;

    const unreadMap = new Map<string, number>();
    for (const msg of (msgs || [])) {
      unreadMap.set(msg.chat_id, (unreadMap.get(msg.chat_id) || 0) + 1);
    }

    const result = new Map<string, { chatId: string; unreadCount: number }>();
    for (const chat of chats) {
      if (!result.has(chat.patient_id)) {
        result.set(chat.patient_id, {
          chatId: chat.id,
          unreadCount: unreadMap.get(chat.id) || 0,
        });
      }
    }
    return result;
  },

  subscribeToPatientMessages(doctorId: string, onUpdate: () => void) {
    return supabase
      .channel(`doctor-inbox:${doctorId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `sender_role=eq.patient` },
        onUpdate
      )
      .subscribe();
  },
};

// =====================================================
// EXAMES DO PACIENTE (patient_exams)
// =====================================================

export const patientExamService = {
  async uploadExam(file: File, patientId: string): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `${patientId}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('patient-exams')
      .upload(path, file);

    if (uploadErr) throw uploadErr;

    return path;
  },

  async createExam(exam: Omit<PatientExam, 'id' | 'created_at' | 'doctor_note' | 'reviewed_at' | 'reviewed_by'>): Promise<PatientExam> {
    const { data, error } = await supabase
      .from('patient_exams')
      .insert([exam])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getPatientExams(patientId: string, doctorId?: string): Promise<PatientExam[]> {
    let query = supabase
      .from('patient_exams')
      .select('*')
      .eq('patient_id', patientId)
      .order('exam_date', { ascending: false, nullsFirst: false });

    if (doctorId) query = query.eq('doctor_id', doctorId);

    const { data, error } = await query;
    if (error) throw error;
    return signStoragePaths('patient-exams', (data ?? []) as PatientExam[]);
  },

  async reviewExam(examId: string, doctorNote: string, doctorId: string): Promise<PatientExam> {
    const { data, error } = await supabase
      .from('patient_exams')
      .update({
        doctor_note:  doctorNote,
        reviewed_at:  new Date().toISOString(),
        reviewed_by:  doctorId,
      })
      .eq('id', examId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteExam(examId: string): Promise<void> {
    const { error } = await supabase
      .from('patient_exams')
      .delete()
      .eq('id', examId);

    if (error) throw error;
  },
};
