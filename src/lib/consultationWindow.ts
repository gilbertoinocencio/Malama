// =====================================================
// Malama — Janelas de horário da consulta (fonte única)
// Paciente entra 10 min antes; médico 15 min antes.
// Passados 30 min do horário sem a consulta iniciar, ela é
// considerada perdida (no-show) — o mesmo limite é usado pelo
// cron server-side (send-consultation-reminders) que oficializa
// o status e processa o crédito.
// =====================================================

export const PATIENT_JOIN_BEFORE_MIN = 10;
export const DOCTOR_JOIN_BEFORE_MIN = 15;
export const MISSED_AFTER_MIN = 30;

interface WindowInput {
  status: string;
  scheduled_at: string;
}

/** Consulta agendada cujo horário passou sem ninguém iniciar (ainda não oficializada como no_show). */
export function isMissed(c: WindowInput, nowMs: number = Date.now()): boolean {
  if (c.status !== 'scheduled') return false;
  const scheduledMs = new Date(c.scheduled_at).getTime();
  return nowMs > scheduledMs + MISSED_AFTER_MIN * 60_000;
}

/** Paciente pode entrar na sala: 10 min antes até 30 min depois, ou a qualquer momento se o médico já iniciou. */
export function canPatientJoin(c: WindowInput, nowMs: number = Date.now()): boolean {
  if (c.status === 'in_progress') return true; // reconexão durante a consulta
  if (c.status !== 'scheduled') return false;
  const scheduledMs = new Date(c.scheduled_at).getTime();
  return (
    nowMs >= scheduledMs - PATIENT_JOIN_BEFORE_MIN * 60_000 &&
    nowMs <= scheduledMs + MISSED_AFTER_MIN * 60_000
  );
}

/** Médico pode entrar na sala: 15 min antes até 30 min depois (in_progress/completed não passam por aqui). */
export function canDoctorJoin(c: WindowInput, nowMs: number = Date.now()): boolean {
  if (c.status !== 'scheduled') return false;
  const scheduledMs = new Date(c.scheduled_at).getTime();
  return (
    nowMs >= scheduledMs - DOCTOR_JOIN_BEFORE_MIN * 60_000 &&
    nowMs <= scheduledMs + MISSED_AFTER_MIN * 60_000
  );
}
