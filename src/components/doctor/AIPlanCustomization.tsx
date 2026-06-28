// =====================================================
// Malama — Customização do Plano de IA pelo Médico
// Badge "Plano supervisionado", histórico de versões
// =====================================================

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck, History, ChevronDown, ChevronRight,
  Save, RefreshCw, Tag, Calendar, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabase';
import { ClinicalLoopService } from '../../services/clinicalLoopService';
import type { QuarterlyPlanData } from '../../services/planService';
import type { FeedbackVerdict } from '../../types/clinicalLoop';

interface PlanRow {
  id: string;
  status: 'active' | 'archived';
  created_at: string;
  content: QuarterlyPlanData;
  doctor_approved: boolean;
  doctor_note: string | null;
}

interface Props {
  patientId: string;
  doctorId: string;
  doctorName: string;
}

// ─── Plan version card ───────────────────────────────

const VersionCard: React.FC<{
  plan: PlanRow;
  onApprove: () => void;
  approving: boolean;
}> = ({ plan, onApprove, approving }) => {
  const [open, setOpen] = useState(false);
  const isActive = plan.status === 'active';

  return (
    <div className={`border rounded-xl overflow-hidden ${
      isActive ? 'border-[#7d4a3c]/30' : 'border-gray-200'
    }`}>
      <button
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
          isActive ? 'bg-[#7d4a3c]/5 hover:bg-[#7d4a3c]/10' : 'bg-gray-50 hover:bg-gray-100'
        }`}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isActive && (
              <span className="px-2 py-0.5 bg-[#7d4a3c] text-white text-[10px] font-bold rounded-full">
                ATIVO
              </span>
            )}
            {plan.doctor_approved && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full">
                <ShieldCheck className="w-3 h-3" /> Supervisionado
              </span>
            )}
            <span className="text-xs font-medium text-gray-700">
              {new Date(plan.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'short', year: 'numeric'
              })}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {plan.content.calories} kcal · P {plan.content.macros?.protein}g · C {plan.content.macros?.carbs}g · G {plan.content.macros?.fats}g
          </p>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gray-100">
          {/* Tag de otimização */}
          {plan.content.optimization_tag && (
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-600">{plan.content.optimization_tag}</span>
            </div>
          )}

          {/* Fases */}
          {plan.content.phases?.length > 0 && (
            <div className="space-y-2">
              {plan.content.phases.map((phase, i) => (
                <div key={i} className="text-xs p-2.5 bg-gray-50 rounded-lg">
                  <p className="font-semibold text-gray-700">{phase.title}</p>
                  <p className="text-gray-500 mt-0.5">{phase.focus}</p>
                </div>
              ))}
            </div>
          )}

          {/* Anotação do médico */}
          {plan.doctor_note && (
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-[10px] font-semibold text-blue-600 mb-0.5">Nota do médico</p>
              <p className="text-xs text-blue-800">{plan.doctor_note}</p>
            </div>
          )}

          {/* Botão de aprovação (apenas plano ativo não aprovado) */}
          {isActive && !plan.doctor_approved && (
            <button
              onClick={onApprove}
              disabled={approving}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white
                         text-xs font-semibold rounded-lg disabled:opacity-50 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {approving ? 'Aprovando…' : 'Marcar como supervisionado'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main component ──────────────────────────────────

export const AIPlanCustomization: React.FC<Props> = ({ patientId, doctorId, doctorName }) => {
  const [plans, setPlans]         = useState<PlanRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [approving, setApproving] = useState(false);
  const [note, setNote]           = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quarterly_plans')
      .select('id, status, created_at, content, doctor_approved, doctor_note')
      .eq('user_id', patientId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) setPlans(data as PlanRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [patientId]);

  const activePlan = plans.find(p => p.status === 'active');

  useEffect(() => {
    if (activePlan?.doctor_note) setNote(activePlan.doctor_note);
  }, [activePlan?.id]);

  // Garante um ai_clinical_reports do tipo plan_suggestion p/ ancorar o feedback (RLHF)
  const ensurePlanReport = async (plan: PlanRow): Promise<string | null> => {
    const { data: existing } = await supabase
      .from('ai_clinical_reports')
      .select('id')
      .eq('patient_id', patientId)
      .eq('report_type', 'plan_suggestion')
      .eq('structured_output->>plan_id', plan.id)
      .maybeSingle();
    if (existing?.id) return existing.id as string;

    const c = plan.content;
    const summary =
      `Plano IA — ${c.calories} kcal | P ${c.macros?.protein}g · C ${c.macros?.carbs}g · G ${c.macros?.fats}g`
      + (c.optimization_tag ? `\n${c.optimization_tag}` : '')
      + (c.phases?.length ? '\n' + c.phases.map(p => `• ${p.title}: ${p.focus}`).join('\n') : '');

    return ClinicalLoopService.saveAiReport({
      patient_id:        patientId,
      doctor_id:         doctorId,
      report_type:       'plan_suggestion',
      model:             'gemini-2.5-flash',
      content:           summary,
      structured_output: { ...c, plan_id: plan.id },
    });
  };

  const recordPlanFeedback = async (verdict: FeedbackVerdict) => {
    if (!activePlan) return;
    try {
      const reportId = await ensurePlanReport(activePlan);
      if (reportId) {
        await ClinicalLoopService.submitReportFeedback({
          report_id:     reportId,
          doctor_id:     doctorId,
          verdict,
          justification: note.trim() || null,
        });
      }
    } catch (e) {
      console.error('recordPlanFeedback error', e);
    }
  };

  const handleApprove = async () => {
    if (!activePlan) return;
    setApproving(true);
    try {
      const { error } = await supabase
        .from('quarterly_plans')
        .update({
          doctor_approved: true,
          doctor_id:       doctorId,
          doctor_name:     doctorName,
          doctor_note:     note.trim() || null,
        })
        .eq('id', activePlan.id);

      if (error) throw error;
      // alimenta o corpus de RLHF: aprovar = accept (ou accept_with_edits se houver nota)
      await recordPlanFeedback(note.trim() ? 'accept_with_edits' : 'accept');
      toast.success('Plano marcado como supervisionado');
      load();
    } catch {
      toast.error('Erro ao aprovar plano');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!activePlan) return;
    if (!note.trim()) { toast.error('Descreva na nota por que discorda do plano'); return; }
    setApproving(true);
    try {
      await recordPlanFeedback('reject');
      toast.success('Discordância registrada (treina a Inteligência)');
      load();
    } catch {
      toast.error('Erro ao registrar discordância');
    } finally {
      setApproving(false);
    }
  };

  const handleSaveNote = async () => {
    if (!activePlan) return;
    setSavingNote(true);
    try {
      const { error } = await supabase
        .from('quarterly_plans')
        .update({ doctor_note: note.trim() || null })
        .eq('id', activePlan.id);

      if (error) throw error;
      toast.success('Nota salva');
      load();
    } catch {
      toast.error('Erro ao salvar nota');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-[#7d4a3c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Zap className="w-10 h-10 text-gray-200 mb-3" />
        <p className="text-sm font-semibold text-gray-600">Sem plano gerado</p>
        <p className="text-xs text-gray-400 mt-1">O paciente ainda não gerou um plano nutricional de IA.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Nota do médico para o plano ativo */}
      {activePlan && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-semibold text-blue-800">Plano Ativo</p>
            {activePlan.doctor_approved && (
              <span className="ml-auto px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                SUPERVISIONADO
              </span>
            )}
          </div>

          <div className="text-xs text-blue-700 space-y-0.5">
            <p>{activePlan.content.calories} kcal · Proteína {activePlan.content.macros?.protein}g</p>
            <p className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Gerado em {new Date(activePlan.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">
              Nota do médico (visível para o paciente)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Ex: Plano ajustado para protocolo pós-cirúrgico. Não alterar metas sem consulta."
              className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-white text-xs text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveNote}
              disabled={savingNote}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-300 text-blue-700
                         text-xs font-medium rounded-lg hover:bg-blue-100 disabled:opacity-50 transition"
            >
              <Save className="w-3.5 h-3.5" />
              {savingNote ? 'Salvando…' : 'Salvar nota'}
            </button>

            {!activePlan.doctor_approved && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white
                           text-xs font-semibold rounded-lg disabled:opacity-50 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {approving ? 'Aprovando…' : 'Supervisionar'}
              </button>
            )}

            <button
              onClick={handleReject}
              disabled={approving}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-700
                         text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition"
            >
              Discordar
            </button>
          </div>
        </div>
      )}

      {/* Histórico de versões */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-semibold text-gray-700">Histórico de planos</p>
          <button onClick={load} className="ml-auto p-1 rounded-lg hover:bg-gray-100 transition">
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-2">
          {plans.map(plan => (
            <VersionCard
              key={plan.id}
              plan={plan}
              onApprove={handleApprove}
              approving={approving}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
