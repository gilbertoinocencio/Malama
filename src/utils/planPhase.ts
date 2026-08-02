/**
 * Fase atual do plano trimestral — regra ÚNICA.
 *
 * O plano tem 3 fases que dividem o período em terços. Essa conta vivia só dentro
 * do prompt do chat, então o feedback de refeição não sabia em que fase o usuário
 * estava e dava orientação genérica. Quem precisar da fase importa daqui.
 *
 * Tipos locais (estruturais) de propósito: `planService` importa `caramelService`,
 * então importar `planService` aqui fecharia um ciclo.
 */

export interface PlanPhaseLike {
  title?: string;
  tag?: string;
  focus?: string;
  bullets?: string[];
  description?: string;
}

export interface PlanLike {
  optimization_tag?: string;
  calories?: number;
  macros?: { protein?: number; carbs?: number; fats?: number };
  phases?: PlanPhaseLike[];
  start_date?: string;
  end_date?: string;
}

export interface CurrentPlanPhase {
  phase: PlanPhaseLike | null;
  /** Semana corrente do plano (1-based). null quando não há data de início. */
  weeksSinceStart: number | null;
}

/**
 * Cada fase cobre 1/3 da duração do plano. Fora do período (ou sem datas), cai na
 * primeira fase — mesmo comportamento que o chat já usava.
 */
export function getCurrentPlanPhase(plan: PlanLike | null | undefined, now: Date = new Date()): CurrentPlanPhase {
  if (!plan) return { phase: null, weeksSinceStart: null };

  const planStart = plan.start_date ? new Date(plan.start_date) : null;
  const planEnd = plan.end_date ? new Date(plan.end_date) : null;

  let phase: PlanPhaseLike | null = plan.phases?.[0] ?? null;
  if (planStart && planEnd && plan.phases?.length === 3) {
    const totalMs = planEnd.getTime() - planStart.getTime();
    const elapsedMs = now.getTime() - planStart.getTime();
    const index = totalMs > 0 ? Math.min(Math.max(Math.floor((elapsedMs / totalMs) * 3), 0), 2) : 0;
    phase = plan.phases[index];
  }

  const weeksSinceStart = planStart
    ? Math.floor((now.getTime() - planStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
    : null;

  return { phase, weeksSinceStart };
}
