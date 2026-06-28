// =====================================================
// Malama — Clinical Data Loop Service
// Persiste saída de IA, captura feedback do médico (RLHF),
// registra condutas semânticas e lê a timeline conduta→desfecho.
// =====================================================

import { supabase } from './supabase';
import type {
  SaveAiReportInput,
  SubmitReportFeedbackInput,
  ClinicalConductEvent,
  ClinicalOutcome,
  ConductType,
  ConductWithOutcomes,
} from '../types/clinicalLoop';

// Remove identificadores diretos do snapshot (defesa LGPD em profundidade —
// a camada de export também faz isso, mas evitamos gravar PII de início).
const PII_KEYS = ['display_name', 'name', 'patient_name', 'full_name', 'email'];
function stripPII(snapshot: Record<string, unknown> = {}): Record<string, unknown> {
  const clean = { ...snapshot };
  for (const k of PII_KEYS) delete clean[k];
  return clean;
}

export const ClinicalLoopService = {
  /**
   * Persiste uma saída de IA (relatório clínico, briefing, sugestão de plano).
   * Retorna o id do registro (ou null em caso de falha — nunca lança, para não
   * derrubar o fluxo de exibição da IA).
   */
  async saveAiReport(input: SaveAiReportInput): Promise<string | null> {
    const { data, error } = await supabase
      .from('ai_clinical_reports')
      .insert({
        patient_id:         input.patient_id,
        doctor_id:          input.doctor_id ?? null,
        consultation_id:    input.consultation_id ?? null,
        report_type:        input.report_type,
        model:              input.model,
        prompt_version:     input.prompt_version ?? null,
        input_snapshot:     stripPII(input.input_snapshot),
        input_window_start: input.input_window_start ?? null,
        input_window_end:   input.input_window_end ?? null,
        content:            input.content,
        structured_output:  input.structured_output ?? null,
        tokens_input:       input.tokens_input ?? null,
        tokens_output:      input.tokens_output ?? null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('saveAiReport error:', error);
      return null;
    }
    return data.id as string;
  },

  /** Veredito/correção/justificativa do médico sobre uma saída de IA (RLHF). */
  async submitReportFeedback(input: SubmitReportFeedbackInput): Promise<void> {
    const { error } = await supabase.from('ai_report_feedback').insert({
      report_id:         input.report_id,
      doctor_id:         input.doctor_id,
      verdict:           input.verdict,
      rating:            input.rating ?? null,
      section_flags:     input.section_flags ?? null,
      corrected_content: input.corrected_content ?? null,
      justification:     input.justification ?? null,
    });
    if (error) throw error;
  },

  /** Conduta de macros via RPC (grava ledger + atualiza profiles em 1 transação). */
  async applyMacroConduct(
    patientId: string,
    macros: { calories?: number; protein?: number; carbs?: number; fats?: number; fiber?: number },
    opts: { sourceReportId?: string | null; rationale?: string | null; consultationId?: string | null } = {}
  ): Promise<string | null> {
    const { data, error } = await supabase.rpc('apply_macro_conduct', {
      p_patient_id:       patientId,
      p_macros:           macros,
      p_source_report_id: opts.sourceReportId ?? null,
      p_rationale:        opts.rationale ?? null,
      p_consultation_id:  opts.consultationId ?? null,
    });
    if (error) throw error;
    return data as string;
  },

  /** Conduta GLP-1 (prescrição ou dose) via RPC. */
  async applyGlp1Conduct(
    patientId: string,
    conductType: 'glp1_prescription' | 'glp1_dose',
    payload: Record<string, unknown>,
    opts: { sourceReportId?: string | null; rationale?: string | null; consultationId?: string | null } = {}
  ): Promise<string | null> {
    const { data, error } = await supabase.rpc('apply_glp1_conduct', {
      p_patient_id:       patientId,
      p_conduct_type:     conductType,
      p_payload:          payload,
      p_source_report_id: opts.sourceReportId ?? null,
      p_rationale:        opts.rationale ?? null,
      p_consultation_id:  opts.consultationId ?? null,
    });
    if (error) throw error;
    return data as string;
  },

  /** Conduta genérica (metas de atividade/hidratação etc.). */
  async recordConduct(
    patientId: string,
    conductType: ConductType,
    payload: Record<string, unknown>,
    opts: { rationale?: string | null; sourceReportId?: string | null; consultationId?: string | null } = {}
  ): Promise<string | null> {
    const { data, error } = await supabase.rpc('record_conduct', {
      p_patient_id:       patientId,
      p_conduct_type:     conductType,
      p_payload:          payload,
      p_rationale:        opts.rationale ?? null,
      p_source_report_id: opts.sourceReportId ?? null,
      p_consultation_id:  opts.consultationId ?? null,
    });
    if (error) throw error;
    return data as string;
  },

  /** Timeline conduta→desfecho de um paciente (feed do painel do médico). */
  async getPatientTimeline(patientId: string, limit = 50): Promise<ConductWithOutcomes[]> {
    const [conductRes, outcomeRes] = await Promise.all([
      supabase
        .from('clinical_conduct_events')
        .select('*')
        .eq('patient_id', patientId)
        .order('effective_from', { ascending: false })
        .limit(limit),
      supabase
        .from('clinical_outcomes')
        .select('*')
        .eq('patient_id', patientId),
    ]);

    if (conductRes.error) throw conductRes.error;

    const conducts = (conductRes.data ?? []) as ClinicalConductEvent[];
    const outcomes = (outcomeRes.data ?? []) as ClinicalOutcome[];

    const byConduct = new Map<string, ClinicalOutcome[]>();
    for (const o of outcomes) {
      const arr = byConduct.get(o.conduct_event_id) ?? [];
      arr.push(o);
      byConduct.set(o.conduct_event_id, arr);
    }

    return conducts.map(c => ({ ...c, outcomes: byConduct.get(c.id) ?? [] }));
  },
};
