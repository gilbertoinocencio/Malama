// =====================================================
// Malama — Feedback do médico sobre a saída de IA (RLHF)
// Captura veredito + rating + correção + justificativa.
// Alimenta ai_report_feedback (corpus de preferência p/ treino).
// =====================================================

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Pencil, Star, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ClinicalLoopService } from '../../services/clinicalLoopService';
import type { FeedbackVerdict } from '../../types/clinicalLoop';

interface Props {
  reportId: string;
  doctorId: string;
  /** Texto gerado pela IA — base para a "versão corrigida" (chosen) do médico. */
  aiContent?: string;
  onSubmitted?: () => void;
}

const VERDICTS: { key: FeedbackVerdict; label: string; icon: React.ReactNode; cls: string }[] = [
  { key: 'accept',            label: 'Concordo',         icon: <ThumbsUp className="w-3.5 h-3.5" />,  cls: 'bg-green-600 hover:bg-green-700' },
  { key: 'accept_with_edits', label: 'Concordo c/ ajustes', icon: <Pencil className="w-3.5 h-3.5" />, cls: 'bg-amber-600 hover:bg-amber-700' },
  { key: 'reject',            label: 'Discordo',         icon: <ThumbsDown className="w-3.5 h-3.5" />, cls: 'bg-red-600 hover:bg-red-700' },
];

export const AIReportFeedback: React.FC<Props> = ({ reportId, doctorId, aiContent, onSubmitted }) => {
  const [verdict, setVerdict] = useState<FeedbackVerdict | null>(null);
  const [rating, setRating]   = useState<number>(0);
  const [justification, setJustification] = useState('');
  const [corrected, setCorrected] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const needsCorrection = verdict === 'accept_with_edits' || verdict === 'reject';

  const pickVerdict = (v: FeedbackVerdict) => {
    setVerdict(v);
    // pré-preenche a versão corrigida com o texto da IA p/ o médico editar
    if ((v === 'accept_with_edits' || v === 'reject') && !corrected && aiContent) {
      setCorrected(aiContent);
    }
  };

  const submit = async () => {
    if (!verdict) { toast.error('Escolha um veredito'); return; }
    setSaving(true);
    try {
      await ClinicalLoopService.submitReportFeedback({
        report_id:         reportId,
        doctor_id:         doctorId,
        verdict,
        rating:            rating || null,
        corrected_content: needsCorrection ? (corrected.trim() || null) : null,
        justification:     justification.trim() || null,
      });
      setDone(true);
      toast.success('Avaliação registrada — obrigado!');
      onSubmitted?.();
    } catch {
      toast.error('Erro ao registrar avaliação');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-700">
        <CheckCircle2 className="w-4 h-4" /> Avaliação registrada. Isso treina a Inteligência do Malama.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-700">Avalie esta análise da IA</p>

      {/* Veredito */}
      <div className="flex flex-wrap gap-2">
        {VERDICTS.map(v => (
          <button
            key={v.key}
            onClick={() => pickVerdict(v.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition
              ${verdict === v.key ? v.cls : 'bg-gray-300 hover:bg-gray-400'}`}
          >
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      {/* Rating */}
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-gray-500 mr-1">Qualidade:</span>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} estrelas`}>
            <Star className={`w-4 h-4 ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
          </button>
        ))}
      </div>

      {/* Versão corrigida (chosen) */}
      {needsCorrection && (
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">
            Versão corrigida (como deveria ser)
          </label>
          <textarea
            value={corrected}
            onChange={e => setCorrected(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-800
                       focus:outline-none focus:ring-2 focus:ring-[#7d4a3c]/40 resize-y"
          />
        </div>
      )}

      {/* Justificativa (a intuição clínica) */}
      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">
          Justificativa clínica (por quê?)
        </label>
        <textarea
          value={justification}
          onChange={e => setJustification(e.target.value)}
          rows={2}
          placeholder="Ex: a IA superestimou a meta proteica para o estágio renal do paciente."
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-800
                     focus:outline-none focus:ring-2 focus:ring-[#7d4a3c]/40 resize-none"
        />
      </div>

      <button
        onClick={submit}
        disabled={saving || !verdict}
        className="px-4 py-1.5 bg-[#7d4a3c] hover:bg-[#6b3f33] text-white text-xs font-semibold
                   rounded-lg disabled:opacity-50 transition"
      >
        {saving ? 'Registrando…' : 'Registrar avaliação'}
      </button>
    </div>
  );
};
