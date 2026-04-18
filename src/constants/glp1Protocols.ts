// =====================================================
// Malama — GLP-1 Medication Protocols
// Source: official prescribing information
// =====================================================

export type GLP1Frequency = 'weekly' | 'daily';

export interface DoseStep {
  dose_mg: number;
  label: string;
  min_weeks: number;  // minimum weeks at this dose before escalating
}

export interface GLP1Protocol {
  id: string;
  name: string;
  brand: string;
  molecule: string;
  frequency: GLP1Frequency;
  /** Days to skip dose before requiring medical consult (safety rule) */
  max_skip_days: number;
  storage_sealed: string;
  storage_open: string;
  dose_steps: DoseStep[];
  escalation_note: string;
  site_rotation_note: string;
}

export const GLP1_PROTOCOLS: Record<string, GLP1Protocol> = {
  ozempic: {
    id: 'ozempic',
    name: 'Ozempic',
    brand: 'Novo Nordisk',
    molecule: 'Semaglutida',
    frequency: 'weekly',
    max_skip_days: 5,
    storage_sealed: 'Geladeira (2–8°C) até o primeiro uso',
    storage_open: 'Temperatura ambiente (≤30°C) por até 56 dias',
    dose_steps: [
      { dose_mg: 0.25, label: '0,25 mg/semana', min_weeks: 4 },
      { dose_mg: 0.5,  label: '0,5 mg/semana',  min_weeks: 4 },
      { dose_mg: 1.0,  label: '1,0 mg/semana',  min_weeks: 4 },
      { dose_mg: 2.0,  label: '2,0 mg/semana',  min_weeks: 0 },
    ],
    escalation_note: 'Escalone a dose somente após 4 semanas no nível atual, conforme orientação médica.',
    site_rotation_note: 'Aplique na barriga, coxa ou braço. Alterne o local a cada semana.',
  },

  wegovy: {
    id: 'wegovy',
    name: 'Wegovy',
    brand: 'Novo Nordisk',
    molecule: 'Semaglutida',
    frequency: 'weekly',
    max_skip_days: 5,
    storage_sealed: 'Geladeira (2–8°C)',
    storage_open: 'Temperatura ambiente (≤30°C) por até 28 dias',
    dose_steps: [
      { dose_mg: 0.25, label: '0,25 mg/semana', min_weeks: 4 },
      { dose_mg: 0.5,  label: '0,5 mg/semana',  min_weeks: 4 },
      { dose_mg: 1.0,  label: '1,0 mg/semana',  min_weeks: 4 },
      { dose_mg: 1.7,  label: '1,7 mg/semana',  min_weeks: 4 },
      { dose_mg: 2.4,  label: '2,4 mg/semana',  min_weeks: 0 },
    ],
    escalation_note: 'Protocolo de 16 semanas para atingir a dose de manutenção de 2,4 mg.',
    site_rotation_note: 'Alterne entre abdômen, coxa e parte superior do braço a cada semana.',
  },

  mounjaro: {
    id: 'mounjaro',
    name: 'Mounjaro',
    brand: 'Eli Lilly',
    molecule: 'Tirzepatida',
    frequency: 'weekly',
    max_skip_days: 4,
    storage_sealed: 'Geladeira (2–8°C)',
    storage_open: 'Temperatura ambiente (≤30°C) por até 21 dias',
    dose_steps: [
      { dose_mg: 2.5,  label: '2,5 mg/semana', min_weeks: 4 },
      { dose_mg: 5.0,  label: '5,0 mg/semana', min_weeks: 4 },
      { dose_mg: 7.5,  label: '7,5 mg/semana', min_weeks: 4 },
      { dose_mg: 10.0, label: '10,0 mg/semana', min_weeks: 4 },
      { dose_mg: 12.5, label: '12,5 mg/semana', min_weeks: 4 },
      { dose_mg: 15.0, label: '15,0 mg/semana', min_weeks: 0 },
    ],
    escalation_note: 'Aumento gradual de 2,5 mg a cada 4 semanas até a dose de manutenção tolerada.',
    site_rotation_note: 'Aplique no abdômen, coxa ou parte superior do braço. Nunca no mesmo local duas vezes seguidas.',
  },

  saxenda: {
    id: 'saxenda',
    name: 'Saxenda',
    brand: 'Novo Nordisk',
    molecule: 'Liraglutida',
    frequency: 'daily',
    max_skip_days: 3,
    storage_sealed: 'Geladeira (2–8°C)',
    storage_open: 'Temperatura ambiente (≤30°C) ou geladeira por até 30 dias',
    dose_steps: [
      { dose_mg: 0.6, label: '0,6 mg/dia',  min_weeks: 1 },
      { dose_mg: 1.2, label: '1,2 mg/dia',  min_weeks: 1 },
      { dose_mg: 1.8, label: '1,8 mg/dia',  min_weeks: 1 },
      { dose_mg: 2.4, label: '2,4 mg/dia',  min_weeks: 1 },
      { dose_mg: 3.0, label: '3,0 mg/dia',  min_weeks: 0 },
    ],
    escalation_note: 'Aumento semanal de 0,6 mg até a dose-alvo de 3,0 mg/dia.',
    site_rotation_note: 'Aplique diariamente no abdômen, coxa ou parte superior do braço. Alterne o local.',
  },
};

/** Ordered list for UI dropdowns */
export const GLP1_MEDICATION_LIST = [
  { value: 'ozempic',  label: 'Ozempic (Semaglutida)' },
  { value: 'wegovy',   label: 'Wegovy (Semaglutida)' },
  { value: 'mounjaro', label: 'Mounjaro (Tirzepatida)' },
  { value: 'saxenda',  label: 'Saxenda (Liraglutida)' },
];

/** Application site rotation order */
export const APPLICATION_SITES = [
  { value: 'abdomen_right', label: 'Abdômen direito', emoji: '🫃' },
  { value: 'thigh_right',   label: 'Coxa direita',   emoji: '🦵' },
  { value: 'arm_right',     label: 'Braço direito',  emoji: '💪' },
  { value: 'abdomen_left',  label: 'Abdômen esquerdo', emoji: '🫃' },
  { value: 'thigh_left',    label: 'Coxa esquerda',  emoji: '🦵' },
  { value: 'arm_left',      label: 'Braço esquerdo', emoji: '💪' },
];

export const SIDE_EFFECTS = [
  { value: 'nausea',       label: 'Náusea',           emoji: '🤢' },
  { value: 'vomiting',     label: 'Vômito',            emoji: '🤮' },
  { value: 'fatigue',      label: 'Cansaço',           emoji: '😴' },
  { value: 'constipation', label: 'Constipação',       emoji: '💣' },
  { value: 'diarrhea',     label: 'Diarreia',          emoji: '🚽' },
  { value: 'headache',     label: 'Dor de cabeça',     emoji: '🤕' },
  { value: 'reflux',       label: 'Refluxo',           emoji: '🔥' },
  { value: 'appetite_loss',label: 'Sem apetite',       emoji: '🍽️' },
  { value: 'injection_site',label: 'Dor no local',     emoji: '💉' },
  { value: 'well',         label: 'Sem efeitos',       emoji: '😊' },
];

/** Returns the next site in rotation based on last used site */
export function getNextApplicationSite(lastSite?: string): typeof APPLICATION_SITES[number] {
  if (!lastSite) return APPLICATION_SITES[0];
  const idx = APPLICATION_SITES.findIndex(s => s.value === lastSite);
  return APPLICATION_SITES[(idx + 1) % APPLICATION_SITES.length];
}

/** Returns the next dose step for a given medication and current dose */
export function getNextDoseStep(medicationId: string, currentDoseMg: number): DoseStep | null {
  const protocol = GLP1_PROTOCOLS[medicationId];
  if (!protocol) return null;
  const currentIdx = protocol.dose_steps.findIndex(s => s.dose_mg === currentDoseMg);
  if (currentIdx === -1 || currentIdx === protocol.dose_steps.length - 1) return null;
  return protocol.dose_steps[currentIdx + 1];
}

/** Returns weeks elapsed since a date */
export function getWeeksElapsed(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

/** Returns the next application date given a schedule */
export function getNextApplicationDate(schedule: {
  frequency: GLP1Frequency;
  day_of_week?: number; // 0=Sun ... 6=Sat (for weekly)
  time: string; // "HH:MM"
}): Date {
  const now = new Date();
  const [h, m] = schedule.time.split(':').map(Number);

  if (schedule.frequency === 'daily') {
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  }

  // Weekly — find next occurrence of day_of_week
  const targetDay = schedule.day_of_week ?? 1; // Monday default
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  let daysUntil = (targetDay - now.getDay() + 7) % 7;
  // If today is the target day but time already passed, push to next week
  if (daysUntil === 0 && next <= now) daysUntil = 7;
  next.setDate(next.getDate() + daysUntil);
  return next;
}
