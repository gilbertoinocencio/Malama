// =====================================================
// Malama — Tipos: Sistema de Cobrança e Créditos
// =====================================================

export type SubscriptionPlan   = 'essencial' | 'glp1';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled';
export type CreditStatus =
  | 'disponivel'
  | 'agendada'
  | 'realizada'
  | 'expirada'
  | 'perdida_cancelamento'
  | 'cancelada_reagendada';

// ── Entidades base ────────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  user_id: string;
  asaas_subscription_id: string | null;
  plan_type: SubscriptionPlan;
  status: SubscriptionStatus;
  price: number;
  billing_date: number | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultationCredit {
  id: string;
  user_id: string;
  subscription_id: string;
  doctor_id: string | null;
  status: CreditStatus;
  /** Primeiro dia do mês de referência, ex: '2026-04-01' */
  month_reference: string;
  late_cancellations_count: number;
  appointment_id: string | null;
  expires_at: string;
  realized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayoutItem {
  id: string;
  payout_id: string;
  consultation_credit_id: string;
  amount: number;
  created_at: string;
}

export interface CreditAdminLog {
  id: string;
  credit_id: string;
  admin_id: string;
  action: string;
  reason: string | null;
  created_at: string;
}

// ── Tipos enriquecidos para views admin ──────────────────────────────────────

export interface SubscriptionWithUser extends Subscription {
  user_display_name: string | null;
  user_email: string | null;
  /** Créditos do mês atual com status 'disponivel' ou 'agendada' */
  active_credit_status: CreditStatus | null;
  credits_realizadas_mes: number;
}

export interface CreditWithDetails extends ConsultationCredit {
  user_display_name: string | null;
  user_email: string | null;
  doctor_name: string | null;
  subscription_plan: SubscriptionPlan;
  admin_logs?: CreditAdminLog[];
}

export interface PayoutItemWithCredit extends PayoutItem {
  credit: ConsultationCredit & {
    user_display_name: string | null;
    doctor_name: string | null;
  };
}

// ── Tipos para dashboard admin ────────────────────────────────────────────────

export interface BillingStats {
  mrr_total: number;
  mrr_essencial: number;
  mrr_glp1: number;
  active_subscribers: number;
  active_subscribers_essencial: number;
  active_subscribers_glp1: number;
  credits_disponivel: number;
  credits_agendada: number;
  credits_realizadas_mes: number;
  credits_expiradas_mes: number;
  credits_perdidas_mes: number;
  next_split_estimate: number;
  next_split_date: string;
}

// ── Filtros ───────────────────────────────────────────────────────────────────

export interface SubscriptionFilters {
  plan?: SubscriptionPlan | 'all';
  status?: SubscriptionStatus | 'all';
  month?: string; // 'YYYY-MM'
  search?: string;
}

export interface CreditFilters {
  status?: CreditStatus | 'all';
  month?: string; // 'YYYY-MM'
  doctor_id?: string;
  user_search?: string;
  user_id?: string;
}
