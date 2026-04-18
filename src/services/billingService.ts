// =====================================================
// NURA — Serviço de Cobrança, Créditos e Repasses
// billingService.ts
// =====================================================

import { supabase } from './supabase';
import type {
  Subscription,
  SubscriptionStatus,
  SubscriptionPlan,
  ConsultationCredit,
  CreditStatus,
  CreditAdminLog,
  SubscriptionWithUser,
  CreditWithDetails,
  BillingStats,
  SubscriptionFilters,
  CreditFilters,
} from '../types/billing';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Retorna YYYY-MM-01 do mês corrente */
function currentMonthRef(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Retorna o último instante do mês dado 'YYYY-MM-01' */
function creditExpiry(monthReference: string): string {
  const ref = new Date(monthReference);
  // Último dia do mês = dia 0 do mês seguinte
  const expiry = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  return expiry.toISOString();
}

// ─── subscriptionService ──────────────────────────────────────────────────────

export const subscriptionService = {
  /** Retorna assinatura ativa do usuário (ou null) */
  async getByUserId(userId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /** Cria nova assinatura */
  async create(data: Partial<Subscription>): Promise<Subscription> {
    const { data: created, error } = await supabase
      .from('subscriptions')
      .insert([data])
      .select('*')
      .single();

    if (error) throw error;
    return created;
  },

  /** Atualiza status da assinatura */
  async updateStatus(id: string, status: SubscriptionStatus): Promise<Subscription> {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  /** Lista todas as assinaturas (admin) com join de perfil de usuário */
  async getAll(filters?: SubscriptionFilters): Promise<SubscriptionWithUser[]> {
    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        profiles:user_id (
          display_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.plan && filters.plan !== 'all') {
      query = query.eq('plan_type', filters.plan);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row: any) => ({
      ...row,
      user_display_name: row.profiles?.display_name ?? null,
      user_email: null, // email vem de auth.users, não de profiles
      active_credit_status: null,
      credits_realizadas_mes: 0,
    }));
  },
};

// ─── creditService ────────────────────────────────────────────────────────────

export const creditService = {
  /** Cria um crédito disponível para o mês corrente */
  async createForCurrentMonth(
    userId: string,
    subscriptionId: string
  ): Promise<ConsultationCredit> {
    const monthRef = currentMonthRef();
    const expiresAt = creditExpiry(monthRef);

    const { data, error } = await supabase
      .from('consultation_credits')
      .insert([{
        user_id: userId,
        subscription_id: subscriptionId,
        status: 'disponivel' as CreditStatus,
        month_reference: monthRef,
        expires_at: expiresAt,
      }])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  /** Retorna créditos ativos (disponivel/agendada) do usuário no mês corrente */
  async getAvailableForUser(userId: string): Promise<ConsultationCredit[]> {
    const monthRef = currentMonthRef();

    const { data, error } = await supabase
      .from('consultation_credits')
      .select('*')
      .eq('user_id', userId)
      .eq('month_reference', monthRef)
      .in('status', ['disponivel', 'agendada'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /** Vincula crédito a um agendamento e define o médico */
  async markAsScheduled(
    creditId: string,
    appointmentId: string,
    doctorId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('consultation_credits')
      .update({
        status: 'agendada' as CreditStatus,
        appointment_id: appointmentId,
        doctor_id: doctorId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creditId);

    if (error) throw error;
  },

  /** Marca crédito como realizado após a consulta */
  async markAsRealized(creditId: string): Promise<void> {
    const { error } = await supabase
      .from('consultation_credits')
      .update({
        status: 'realizada' as CreditStatus,
        realized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', creditId);

    if (error) throw error;
  },

  /**
   * Lógica de cancelamento de agendamento:
   * - >= 24h de antecedência: crédito liberado para reagendamento sem penalidade
   * - < 24h (ou no-show): incrementa late_cancellations_count
   *   - count >= 2: crédito perdido
   *   - count == 1: crédito liberado com contagem herdada
   */
  async handleAppointmentCancellation(
    creditId: string,
    appointmentId: string,
    scheduledAt: string
  ): Promise<void> {
    const { data: credit, error: fetchError } = await supabase
      .from('consultation_credits')
      .select('user_id, subscription_id, month_reference, late_cancellations_count')
      .eq('id', creditId)
      .single();

    if (fetchError || !credit) throw fetchError ?? new Error('Crédito não encontrado');

    const hoursUntil =
      (new Date(scheduledAt).getTime() - Date.now()) / 3_600_000;
    const isLate = hoursUntil < 24;

    if (!isLate) {
      // Cancelamento com antecedência: libera crédito para reagendamento
      await supabase
        .from('consultation_credits')
        .update({
          status: 'cancelada_reagendada' as CreditStatus,
          appointment_id: null,
          doctor_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creditId);

      // Cria novo crédito disponível (herdando contagem de cancelamentos tardios)
      await supabase.from('consultation_credits').insert([{
        user_id: credit.user_id,
        subscription_id: credit.subscription_id,
        status: 'disponivel' as CreditStatus,
        month_reference: credit.month_reference,
        expires_at: creditExpiry(credit.month_reference),
        late_cancellations_count: credit.late_cancellations_count,
      }]);
      return;
    }

    // Cancelamento tardio ou no-show
    const newCount = credit.late_cancellations_count + 1;

    if (newCount >= 2) {
      // Crédito permanentemente perdido
      await supabase
        .from('consultation_credits')
        .update({
          status: 'perdida_cancelamento' as CreditStatus,
          late_cancellations_count: newCount,
          appointment_id: null,
          doctor_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creditId);
    } else {
      // Primeiro cancelamento tardio: libera crédito com contagem herdada
      await supabase
        .from('consultation_credits')
        .update({
          status: 'cancelada_reagendada' as CreditStatus,
          late_cancellations_count: newCount,
          appointment_id: null,
          doctor_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creditId);

      await supabase.from('consultation_credits').insert([{
        user_id: credit.user_id,
        subscription_id: credit.subscription_id,
        status: 'disponivel' as CreditStatus,
        month_reference: credit.month_reference,
        expires_at: creditExpiry(credit.month_reference),
        late_cancellations_count: newCount, // propaga contagem para o novo crédito
      }]);
    }
  },

  /** Retorna logs de auditoria admin para um crédito */
  async getAdminLogs(creditId: string): Promise<CreditAdminLog[]> {
    const { data, error } = await supabase
      .from('credit_admin_logs')
      .select('*')
      .eq('credit_id', creditId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

// ─── adminBillingService ──────────────────────────────────────────────────────

export const adminBillingService = {
  /** Lista assinantes com filtros (admin) */
  async listSubscribers(filters?: SubscriptionFilters): Promise<SubscriptionWithUser[]> {
    return subscriptionService.getAll(filters);
  },

  /** Lista todos os créditos com detalhes (admin) */
  async listCredits(filters?: CreditFilters): Promise<CreditWithDetails[]> {
    let query = supabase
      .from('consultation_credits')
      .select(`
        *,
        subscriptions:subscription_id (plan_type),
        doctors:doctor_id (name)
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.doctor_id) {
      query = query.eq('doctor_id', filters.doctor_id);
    }
    if (filters?.month) {
      const monthRef = `${filters.month}-01`;
      query = query.eq('month_reference', monthRef);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row: any) => ({
      ...row,
      user_display_name: null, // join com auth.users requer chamada separada
      user_email: null,
      doctor_name: row.doctors?.name ?? null,
      subscription_plan: row.subscriptions?.plan_type ?? null,
    }));
  },

  /** Reativa crédito manualmente com log de auditoria */
  async reactivateCredit(
    creditId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    const { error: updateError } = await supabase
      .from('consultation_credits')
      .update({
        status: 'disponivel' as CreditStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creditId);

    if (updateError) throw updateError;

    const { error: logError } = await supabase
      .from('credit_admin_logs')
      .insert([{
        credit_id: creditId,
        admin_id: adminId,
        action: 'reactivated',
        reason,
      }]);

    if (logError) throw logError;
  },

  /** Cancela crédito manualmente com log de auditoria */
  async cancelCreditManually(
    creditId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    const { error: updateError } = await supabase
      .from('consultation_credits')
      .update({
        status: 'cancelada_reagendada' as CreditStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creditId);

    if (updateError) throw updateError;

    const { error: logError } = await supabase
      .from('credit_admin_logs')
      .insert([{
        credit_id: creditId,
        admin_id: adminId,
        action: 'manually_cancelled',
        reason,
      }]);

    if (logError) throw logError;
  },

  /** Calcula MRR atual com assinaturas ativas */
  async getMRR(): Promise<{ total: number; essencial: number; glp1: number }> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan_type, price')
      .eq('status', 'active');

    if (error) throw error;

    const result = { total: 0, essencial: 0, glp1: 0 };
    for (const sub of (data || [])) {
      result.total += sub.price;
      if (sub.plan_type === 'essencial') result.essencial += sub.price;
      if (sub.plan_type === 'glp1') result.glp1 += sub.price;
    }
    return result;
  },

  /** Estimativa do próximo split (créditos realizados ainda não incluídos em payout) */
  async getNextSplitEstimate(): Promise<number> {
    const { data, error } = await supabase
      .from('consultation_credits')
      .select('id')
      .eq('status', 'realizada');

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    const ids = data.map((c: any) => c.id);

    // Remover os que já têm payout_item
    const { data: paidItems } = await supabase
      .from('payout_items')
      .select('consultation_credit_id')
      .in('consultation_credit_id', ids);

    const paidIds = new Set((paidItems || []).map((p: any) => p.consultation_credit_id));
    const unpaidCount = ids.filter((id: string) => !paidIds.has(id)).length;

    // Valor fixo por consulta realizada: R$100
    return unpaidCount * 100;
  },

  /** Calcula data estimada do próximo split */
  getNextSplitDate(): string {
    const now = new Date();
    const day = now.getDate();
    let next: Date;
    if (day < 15) {
      next = new Date(now.getFullYear(), now.getMonth(), 15);
    } else {
      next = new Date(now.getFullYear(), now.getMonth() + 1, 0); // último dia do mês
    }
    return next.toLocaleDateString('pt-BR');
  },

  /** Estatísticas gerais para o dashboard */
  async getBillingStats(): Promise<BillingStats> {
    const monthRef = currentMonthRef();

    const [mrrData, subsData, creditsData, nextSplit] = await Promise.all([
      adminBillingService.getMRR(),
      supabase
        .from('subscriptions')
        .select('plan_type')
        .eq('status', 'active'),
      supabase
        .from('consultation_credits')
        .select('status')
        .eq('month_reference', monthRef),
      adminBillingService.getNextSplitEstimate(),
    ]);

    const subs = subsData.data || [];
    const credits = creditsData.data || [];

    const countByStatus = (s: string) => credits.filter((c: any) => c.status === s).length;

    return {
      mrr_total: mrrData.total,
      mrr_essencial: mrrData.essencial,
      mrr_glp1: mrrData.glp1,
      active_subscribers: subs.length,
      active_subscribers_essencial: subs.filter((s: any) => s.plan_type === 'essencial').length,
      active_subscribers_glp1: subs.filter((s: any) => s.plan_type === 'glp1').length,
      credits_disponivel: countByStatus('disponivel'),
      credits_agendada: countByStatus('agendada'),
      credits_realizadas_mes: countByStatus('realizada'),
      credits_expiradas_mes: countByStatus('expirada'),
      credits_perdidas_mes: countByStatus('perdida_cancelamento'),
      next_split_estimate: nextSplit,
      next_split_date: adminBillingService.getNextSplitDate(),
    };
  },

  /** Reprocessa um repasse com falha */
  async reprocessPayout(payoutId: string): Promise<void> {
    // Marca como processing para que a Edge Function o processe
    const { error } = await supabase
      .from('payouts')
      .update({
        status: 'processing',
        processing_error: null,
      })
      .eq('id', payoutId)
      .eq('status', 'failed'); // apenas falhas podem ser reprocessadas

    if (error) throw error;

    // Chama a edge function process-payouts passando o payout_id específico
    const { error: fnError } = await supabase.functions.invoke('process-payouts', {
      body: { payout_id: payoutId },
    });

    if (fnError) throw fnError;
  },
};
