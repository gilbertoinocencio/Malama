// =====================================================
// NURA — Portal do Médico: Serviço Supabase
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
  PayoutStatus
} from '../types/doctorPortal';
import { v4 as uuidv4 } from 'uuid';

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
  async getDoctorByInviteToken(token: string): Promise<Doctor | null> {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('invite_token', token)
      .single();

    if (error) return null;
    return data;
  },

  // Gerar token de convite único
  generateInviteToken(): string {
    return `invite_${uuidv4().replace(/-/g, '')}`;
  },

  // Admin: Buscar todos os médicos
  async getAllDoctors(filters?: {
    status?: DoctorStatus | 'all';
    specialty?: string;
  }): Promise<Doctor[]> {
    let query = supabase.from('doctors').select('*');

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.specialty) {
      query = query.eq('specialty', filters.specialty);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Admin: Aprovar médico
  async approveDoctor(doctorId: string, platformFeePercent: number): Promise<Doctor> {
    const { data, error } = await supabase
      .from('doctors')
      .update({ status: 'approved', platform_fee_percent: platformFeePercent })
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
  // Buscar disponibilidade de um médico
  async getDoctorAvailability(doctorId: string): Promise<DoctorAvailability[]> {
    const { data, error } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('day_of_week');

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
        .upsert(existingAvailabilities, { onConflict: 'doctor_id,day_of_week,start_time,end_time' })
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
      .select(`
        *,
        patient:patient_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
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

    // Transformar dados do paciente
    return (data || []).map((c: any) => {
      const patientData = Array.isArray(c.patient) ? c.patient[0] : c.patient;
      return {
        ...c,
        patient_name: patientData?.raw_user_meta_data?.name || patientData?.email || 'Paciente',
        patient_photo: patientData?.raw_user_meta_data?.photo_url || null,
        patient_age: patientData?.raw_user_meta_data?.age || null,
        patient_gender: patientData?.raw_user_meta_data?.gender || null
      };
    });
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

  // Cancelar consulta
  async cancelConsultation(consultationId: string, reason?: string): Promise<Consultation> {
    const { data, error } = await supabase
      .from('consultations')
      .update({ status: 'cancelled', notes: reason })
      .eq('id', consultationId)
      .select()
      .single();

    if (error) throw error;
    return data;
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
    return data || [];
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

  // Admin: Buscar repasses pendentes
  async getPendingPayouts(): Promise<PendingPayout[]> {
    const { data, error } = await supabase
      .from('payouts')
      .select(`
        *,
        doctor:doctor_id (
          name,
          platform_fee_percent,
          pix_key
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((p: any) => {
      const grossAmount = p.amount;
      const feePercent = p.doctor?.platform_fee_percent || 25;
      const feeAmount = grossAmount * (feePercent / 100);
      const netAmount = grossAmount - feeAmount;

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
        status: p.status
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

  // Admin: Resumo financeiro
  async getFinancialSummary(): Promise<FinancialSummary> {
    // Buscar todas as consultas concluídas
    const { data: consultations, error } = await supabase
      .from('consultations')
      .select('price, platform_fee, doctor_payout, payment_status')
      .eq('status', 'completed');

    if (error) throw error;

    const grossRevenue = consultations?.reduce((sum, c) => sum + (c.price || 0), 0) || 0;
    const platformFee = consultations?.reduce((sum, c) => sum + (c.platform_fee || 0), 0) || 0;
    const totalPaid = consultations?.reduce((sum, c) => sum + (c.doctor_payout || 0), 0) || 0;

    // Buscar repasses pendentes
    const { data: pendingPayouts } = await supabase
      .from('payouts')
      .select('amount')
      .eq('status', 'pending');

    const pendingPayoutsTotal = pendingPayouts?.reduce((sum, p) => sum + p.amount, 0) || 0;

    return {
      grossRevenue,
      platformFee,
      totalPaid,
      pendingPayouts: pendingPayoutsTotal
    };
  }
};

// =====================================================
// CONFIGURAÇÕES DA PLATAFORMA
// =====================================================

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

  async getAllSettings(): Promise<PlatformSetting[]> {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*');

    if (error) throw error;
    return data || [];
  },

  async updateSetting(key: string, value: string): Promise<PlatformSetting> {
    const { data, error } = await supabase
      .from('platform_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// =====================================================
// PACIENTES
// =====================================================

export const patientService = {
  // Buscar pacientes únicos que tiveram consulta com o médico
  async getDoctorPatients(doctorId: string, search?: string): Promise<PatientSummary[]> {
    const { data: consultations, error } = await supabase
      .from('consultations')
      .select(`
        patient_id,
        scheduled_at,
        patient:profiles!consultations_patient_id_fkey (
          id,
          display_name,
          avatar_url,
          age,
          gender,
          weight,
          height,
          glp1_mode,
          glp1_phase
        )
      `)
      .eq('doctor_id', doctorId)
      .order('scheduled_at', { ascending: false });

    if (error) {
      console.warn("Using raw_user_meta_data fallback due to profile relation lack", error.message);
    }

    // Agrupar por paciente e pegar última/próxima consulta
    const patientMap = new Map<string, any>();

    for (const c of (consultations || [])) {
      const patientId = c.patient_id;
      const patientData = Array.isArray(c.patient) ? c.patient[0] : c.patient;

      if (!patientMap.has(patientId)) {
        let imc = null;
        if (patientData?.weight && patientData?.height) {
          imc = patientData.weight / ((patientData.height / 100) * (patientData.height / 100));
        }

        patientMap.set(patientId, {
          id: patientId,
          name: patientData?.display_name || 'Paciente',
          photo_url: patientData?.avatar_url || null,
          lastConsultation: null as string | null,
          nextConsultation: null as string | null,
          imc: imc,
          age: patientData?.age || null,
          gender: patientData?.gender || null,
          is_glp1_active: patientData?.glp1_mode || false,
          glp1_phase: patientData?.glp1_phase || null
        });
      }

      const patient = patientMap.get(patientId);
      const scheduledAt = c.scheduled_at;

      if (new Date(scheduledAt) < new Date()) {
        if (!patient.lastConsultation || new Date(scheduledAt) > new Date(patient.lastConsultation)) {
          patient.lastConsultation = scheduledAt;
        }
      } else {
        if (!patient.nextConsultation || new Date(scheduledAt) < new Date(patient.nextConsultation)) {
          patient.nextConsultation = scheduledAt;
        }
      }
    }

    let patients = Array.from(patientMap.values());

    // Filtrar por busca
    if (search) {
      patients = patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return patients;
  },

  // Buscar perfil completo de um paciente
  async getPatientFullProfile(patientId: string, doctorId: string): Promise<PatientFullProfile | null> {
    // Buscar dados básicos do paciente (via auth metadata)
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(patientId);

    // Buscar consultas do paciente com este médico
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
      .select('display_name, avatar_url, age, gender, weight, height, goal, target_calories, target_protein, target_carbs, target_fats, glp1_mode, glp1_phase, glp1_medication')
      .eq('id', patientId)
      .single();

    if (profileError) {
      console.error("Erro ao buscar profile do paciente (RLS?):", profileError);
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

    console.log("🔥 [DEBUG DOCTOR] Profile fetched:", profile);
    console.log("🔥 [DEBUG DOCTOR] Active Plan fetched:", activePlan);

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
    let imc = null;
    let imc_classification = null;
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
    const weekly_history = [];
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

    // Fetch recent daily checkins
    const { data: checkins } = await supabase
      .from('daily_checkins')
      .select('checkin_date, symptoms, mood, energy_level')
      .eq('user_id', patientId)
      .order('checkin_date', { ascending: false })
      .limit(30);

    const moodScale: Record<number, string> = { 1: 'Péssimo', 2: 'Ruim', 3: 'Neutro', 4: 'Bom', 5: 'Excelente' };
    const energyScale: Record<number, string> = { 1: 'Exgotado', 2: 'Baixa', 3: 'Média', 4: 'Boa', 5: 'Alta' };

    const formattedCheckins = (checkins || []).map(c => {
      const s = c.symptoms || [];
      const symptomList = Array.isArray(s) ? s : (typeof s === 'string' ? JSON.parse(s) : Object.keys(s));

      const [year, month, day] = (c.checkin_date || '').split('-');
      const formattedDate = day && month ? `${day}/${month}/${year}` : c.checkin_date;

      return {
        date: formattedDate,
        symptoms: symptomList,
        mood: c.mood ? moodScale[c.mood] || String(c.mood) : undefined,
        energy: c.energy_level ? energyScale[c.energy_level] || String(c.energy_level) : undefined
      };
    });

    return {
      id: patientId,
      name: profile?.display_name || 'Paciente',
      photo_url: profile?.avatar_url || null,
      age: profile?.age || null,
      gender: profile?.gender || null,
      imc,
      imc_classification,
      is_glp1_active: profile?.glp1_mode || false,
      glp1_phase: profile?.glp1_phase || null,
      glp1_medication: profile?.glp1_medication || null,
      current_weight: profile?.weight || null,
      weight_history: [],
      current_goals: {
        calories: cal,
        protein: prot,
        carbs: carb,
        fat: fat,
        fiber: 25,
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

    // Buscar consultas a receber (agendadas/completas com pagamento pendente)
    const { data: receivables } = await supabase
      .from('consultations')
      .select('doctor_payout')
      .eq('doctor_id', doctorId)
      .eq('payment_status', 'pending');

    const pendingReceivable = receivables?.reduce((sum, c) => sum + (c.doctor_payout || 0), 0) || 0;

    return {
      todayConsultations: todayConsultations.length,
      weekConsultations: weekConsultations.length,
      pendingReceivable
    };
  }
};

// =====================================================
// ADMIN
// =====================================================

export const adminService = {
  async getDashboardSummary(): Promise<AdminDashboardSummary> {
    // Buscar contagem de médicos aprovados
    const { data: approvedDoctors, error: doctorsError } = await supabase
      .from('doctors')
      .select('id')
      .eq('status', 'approved');

    // Buscar contagem de consultas do mês
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: monthConsultations, error: consultError } = await supabase
      .from('consultations')
      .select('price')
      .gte('scheduled_at', startOfMonth.toISOString());

    // Buscar médicos pendentes
    const pendingDoctors = await doctorService.getPendingDoctors();

    // Buscar repasses pendentes
    const { data: pendingPayouts } = await supabase
      .from('payouts')
      .select('amount')
      .eq('status', 'pending');

    const pendingPayoutsTotal = pendingPayouts?.reduce((sum, p) => sum + p.amount, 0) || 0;

    return {
      approvedDoctors: approvedDoctors?.length || 0,
      monthConsultations: monthConsultations?.length || 0,
      platformRevenue: monthConsultations?.reduce((sum, c) => sum + (c.price || 0), 0) * 0.25 || 0,
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
