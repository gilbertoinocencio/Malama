// =====================================================
// Malama — Tipos da Fundação de Loop Clínico (Fine-Tuning + RLHF)
// Tabelas: ai_clinical_reports, ai_report_feedback,
//          clinical_conduct_events, clinical_outcomes
// =====================================================

export type AiReportType =
  | 'clinical_report'
  | 'pre_consult_briefing'
  | 'plan_suggestion'
  | 'chat_insight';

export type ConductType =
  | 'macro_target'
  | 'glp1_prescription'
  | 'glp1_dose'
  | 'diagnosis'
  | 'therapeutic_plan'
  | 'activity_goal'
  | 'hydration_goal';

export type FeedbackVerdict = 'accept' | 'accept_with_edits' | 'reject';

export interface AiClinicalReport {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  consultation_id: string | null;
  report_type: AiReportType;
  model: string;
  prompt_version: string | null;
  input_snapshot: Record<string, unknown>;
  input_window_start: string | null;
  input_window_end: string | null;
  content: string;
  structured_output: Record<string, unknown> | null;
  tokens_input: number | null;
  tokens_output: number | null;
  generated_at: string;
}

export interface AiReportFeedback {
  id: string;
  report_id: string;
  doctor_id: string;
  verdict: FeedbackVerdict;
  rating: number | null;
  section_flags: Record<string, boolean> | null;
  corrected_content: string | null;
  justification: string | null;
  created_at: string;
}

export interface ClinicalConductEvent {
  id: string;
  patient_id: string;
  actor_id: string | null;
  actor_role: 'patient' | 'doctor' | 'ai_agent' | 'system';
  conduct_type: ConductType;
  payload: Record<string, unknown>;
  rationale: string | null;
  source_report_id: string | null;
  consultation_id: string | null;
  origin: string;
  effective_from: string;
  supersedes_id: string | null;
  created_at: string;
}

export interface ClinicalOutcome {
  id: string;
  patient_id: string;
  conduct_event_id: string;
  metric: string;
  horizon_days: number;
  baseline_value: number | null;
  baseline_at: string | null;
  outcome_value: number | null;
  outcome_at: string | null;
  delta: number | null;
  delta_pct: number | null;
  data_points: number | null;
  computed_at: string;
}

// Conduta + desfechos já calculados (feed da timeline do médico)
export interface ConductWithOutcomes extends ClinicalConductEvent {
  outcomes: ClinicalOutcome[];
}

// Parâmetros de gravação de saída de IA
export interface SaveAiReportInput {
  patient_id: string;
  report_type: AiReportType;
  model: string;
  content: string;
  input_snapshot?: Record<string, unknown>;
  structured_output?: Record<string, unknown> | null;
  doctor_id?: string | null;
  consultation_id?: string | null;
  prompt_version?: string | null;
  input_window_start?: string | null;
  input_window_end?: string | null;
  tokens_input?: number | null;
  tokens_output?: number | null;
}

export interface SubmitReportFeedbackInput {
  report_id: string;
  doctor_id: string;
  verdict: FeedbackVerdict;
  rating?: number | null;
  section_flags?: Record<string, boolean> | null;
  corrected_content?: string | null;
  justification?: string | null;
}
