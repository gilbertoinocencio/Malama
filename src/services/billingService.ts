// =====================================================
// Malama — Serviço de Cobrança, Créditos e Repasses
// billingService.ts
// =====================================================

import { supabase } from './supabase';
import type {
  Subscription,
  SubscriptionStatus,
  SubscriptionPlan,
  ConsultationCredit,
  CreditStatus,
  CreditEspecialidade,
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

/** Validade do crédito: 30 dias a partir de agora (prazo para AGENDAR). */
function rollingExpiry(): string {
  return new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
}

/** Valores-padrão por nível (fallback se platform_settings não tiver as chaves). */
export const DEFAULT_NIVEL_VALUES: Record<string, number> = { nivel_1: 90, nivel_2: 100, nivel_3: 120 };
export const DEFAULT_NIVEL_VALUES_PSI: Record<string, number> = { nivel_1: 80, nivel_2: 95, nivel_3: 110 };

/**
 * Valor por consulta separado por tipo de profissional. Sessão de psicologia
 * tem duração, custo e mercado diferentes de consulta médica — com uma chave
 * só, um dos dois ficaria sempre errado.
 */
export type NivelValues = {
  medico: Record<string, number>;
  psicologo: Record<string, number>;
};

/** Carrega os mapas nível→valor por consulta a partir de platform_settings. */
export async function loadNivelValues(): Promise<NivelValues> {
  const values: NivelValues = {
    medico: { ...DEFAULT_NIVEL_VALUES },
    psicologo: { ...DEFAULT_NIVEL_VALUES_PSI },
  };
  const { data } = await supabase
    .from('platform_settings')
    .select('key, value')
    .in('key', [
      'doctor_value_nivel1', 'doctor_value_nivel2', 'doctor_value_nivel3',
      'psi_value_nivel1', 'psi_value_nivel2', 'psi_value_nivel3',
    ]);
  for (const row of data ?? []) {
    const m = /^(doctor|psi)_value_nivel([123])$/.exec(row.key);
    if (!m) continue;
    const alvo = m[1] === 'psi' ? values.psicologo : values.medico;
    alvo[`nivel_${m[2]}`] = parseFloat(row.value);
  }
  return values;
}

/**
 * Valor por consulta conforme nível e tipo de profissional.
 * Registro legado sem tipo_profissional é médico — mesma convenção do
 * scheduling.ts e da migration 20260802.
 */
export function valueForNivel(
  values: NivelValues,
  nivel: string | null | undefined,
  tipo?: string | null,
): number {
  const tabela = tipo === 'psicologo' ? values.psicologo : values.medico;
  const padrao = tipo === 'psicologo'
    ? DEFAULT_NIVEL_VALUES_PSI.nivel_2
    : DEFAULT_NIVEL_VALUES.nivel_2;
  return tabela[nivel ?? 'nivel_2'] ?? tabela.nivel_2 ?? padrao;
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
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.plan && filters.plan !== 'all') {
      query = query.eq('plan_type', filters.plan);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Buscar display_name dos perfis separadamente para evitar erro se coluna não existir
    const rows = data || [];
    const userIds = [...new Set(rows.map((r: any) => r.user_id))];

    let profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);
      for (const p of (profiles || [])) {
        profileMap[p.id] = p.display_name ?? null;
      }
    }

    return rows.map((row: any) => ({
      ...row,
      user_display_name: profileMap[row.user_id] ?? null,
      user_email: null,
      active_credit_status: null,
      credits_realizadas_mes: 0,
    }));
  },
};

// ─── creditService ────────────────────────────────────────────────────────────

export const creditService = {
  /** Cria um crédito disponível para o mês corrente.
   *  especialidade default 'medico' (plano base); 'psicologo' para o upsell. */
  async createForCurrentMonth(
    userId: string,
    subscriptionId: string,
    especialidade: CreditEspecialidade = 'medico'
  ): Promise<ConsultationCredit> {
    const monthRef = currentMonthRef(); // apenas rótulo/relatório
    const expiresAt = rollingExpiry();  // 30 dias a partir de agora

    const { data, error } = await supabase
      .from('consultation_credits')
      .insert([{
        user_id: userId,
        subscription_id: subscriptionId,
        status: 'disponivel' as CreditStatus,
        especialidade,
        month_reference: monthRef,
        expires_at: expiresAt,
      }])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  /** Retorna créditos ativos (disponivel/agendada) e ainda válidos do usuário.
   *  Sob janela rolante de 30 dias o filtro é por status + validade, não por
   *  mês-calendário (um crédito de 17/jan continua válido em 01/fev). */
  async getAvailableForUser(
    userId: string,
    especialidade?: CreditEspecialidade
  ): Promise<ConsultationCredit[]> {
    const now = new Date().toISOString();

    let query = supabase
      .from('consultation_credits')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['disponivel', 'agendada'])
      .gt('expires_at', now);

    // Sem especialidade → comportamento antigo (todos os créditos do usuário).
    if (especialidade) query = query.eq('especialidade', especialidade);

    const { data, error } = await query.order('created_at', { ascending: false });

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
   *   - count >= 2: crédito perdido (renova no próximo ciclo da assinatura)
   *   - count == 1: crédito liberado com contagem herdada
   * Retorna se o crédito foi perdido, para a UI informar o paciente.
   */
  async handleAppointmentCancellation(
    creditId: string,
    appointmentId: string,
    scheduledAt: string
  ): Promise<{ creditLost: boolean }> {
    const { data: credit, error: fetchError } = await supabase
      .from('consultation_credits')
      .select('user_id, subscription_id, especialidade, month_reference, expires_at, late_cancellations_count')
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

      // Cria novo crédito disponível (herda contagem de cancelamentos tardios e o
      // expires_at ORIGINAL — o prazo de 30 dias para agendar não se estende por cancelar)
      await supabase.from('consultation_credits').insert([{
        user_id: credit.user_id,
        subscription_id: credit.subscription_id,
        // Preserva a especialidade: reagendar um crédito psi não pode rebaixá-lo a médico.
        especialidade: credit.especialidade,
        status: 'disponivel' as CreditStatus,
        month_reference: credit.month_reference,
        expires_at: credit.expires_at,
        late_cancellations_count: credit.late_cancellations_count,
      }]);
      return { creditLost: false };
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
      return { creditLost: true };
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

      // Garante ao menos 7 dias para a remarcação única pós-falta: sem isso,
      // um crédito à beira do vencimento tornaria a remarcação impossível.
      const minExpiry = new Date(Date.now() + 7 * 86_400_000).toISOString();
      const newExpiry = credit.expires_at > minExpiry ? credit.expires_at : minExpiry;

      await supabase.from('consultation_credits').insert([{
        user_id: credit.user_id,
        subscription_id: credit.subscription_id,
        // Preserva a especialidade também na remarcação única pós-falta.
        especialidade: credit.especialidade,
        status: 'disponivel' as CreditStatus,
        month_reference: credit.month_reference,
        expires_at: newExpiry,
        late_cancellations_count: newCount, // propaga contagem para o novo crédito
      }]);
    }
    return { creditLost: false };
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
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
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

    const rows = data || [];

    // Buscar nomes dos médicos separadamente
    const doctorIds = [...new Set(rows.filter((r: any) => r.doctor_id).map((r: any) => r.doctor_id))];
    const subIds    = [...new Set(rows.map((r: any) => r.subscription_id))];

    let doctorMap: Record<string, string> = {};
    let subPlanMap: Record<string, string> = {};

    if (doctorIds.length > 0) {
      const { data: doctors } = await supabase
        .from('doctors')
        .select('id, name')
        .in('id', doctorIds);
      for (const d of (doctors || [])) doctorMap[d.id] = d.name;
    }

    if (subIds.length > 0) {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('id, plan_type')
        .in('id', subIds);
      for (const s of (subs || [])) subPlanMap[s.id] = s.plan_type;
    }

    return rows.map((row: any) => ({
      ...row,
      user_display_name: null,
      user_email: null,
      doctor_name: doctorMap[row.doctor_id] ?? null,
      subscription_plan: subPlanMap[row.subscription_id] ?? null,
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

  /** Estimativa do próximo split (créditos realizados ainda não incluídos em payout).
   *  Soma por médico conforme o valor do nível de cada um. */
  async getNextSplitEstimate(): Promise<number> {
    const { data, error } = await supabase
      .from('consultation_credits')
      .select('id, doctor_id')
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
    const unpaid = data.filter((c: any) => !paidIds.has(c.id));
    if (unpaid.length === 0) return 0;

    // Mapear doctor_id → nivel + tipo para valorizar cada crédito
    const doctorIds = [...new Set(unpaid.map((c: any) => c.doctor_id).filter(Boolean))];
    const [nivelValues, doctorsRes] = await Promise.all([
      loadNivelValues(),
      doctorIds.length
        ? supabase.from('doctors').select('id, nivel, tipo_profissional').in('id', doctorIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const byDoctor: Record<string, { nivel: string; tipo: string | null }> = {};
    for (const d of (doctorsRes as any).data ?? []) {
      byDoctor[d.id] = { nivel: d.nivel, tipo: d.tipo_profissional ?? null };
    }

    return unpaid.reduce((sum: number, c: any) => {
      const d = c.doctor_id ? byDoctor[c.doctor_id] : undefined;
      return sum + valueForNivel(nivelValues, d?.nivel ?? 'nivel_2', d?.tipo);
    }, 0);
  },

  /** Calcula data estimada do próximo split (dias 15 e 30) */
  getNextSplitDate(): string {
    const now = new Date();
    const day = now.getDate();
    let next: Date;
    if (day < 15) {
      next = new Date(now.getFullYear(), now.getMonth(), 15);
    } else if (day < 30) {
      next = new Date(now.getFullYear(), now.getMonth(), 30);
    } else {
      next = new Date(now.getFullYear(), now.getMonth() + 1, 15);
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

// ─── planPricesService ────────────────────────────────────────────────────────

export type PlanPrice = {
  id: string;
  plan_type: string;
  billing_cycle: string;
  price: number;
};

export const planPricesService = {
  async getAll(): Promise<PlanPrice[]> {
    const { data, error } = await supabase
      .from('plan_prices')
      .select('id, plan_type, billing_cycle, price')
      .order('plan_type')
      .order('billing_cycle');
    if (error) throw error;
    return data ?? [];
  },

  async upsert(planType: string, billingCycle: string, price: number): Promise<void> {
    const { error } = await supabase
      .from('plan_prices')
      .upsert(
        { plan_type: planType, billing_cycle: billingCycle, price, updated_at: new Date().toISOString() },
        { onConflict: 'plan_type,billing_cycle' }
      );
    if (error) throw error;
  },
};
