import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { reportPost, type ReportReason } from '../../../services/communityService';
import toast from 'react-hot-toast';

const REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'misinformation', label: 'Informação médica incorreta' },
  { value: 'spam',           label: 'Spam ou publicidade' },
  { value: 'inappropriate',  label: 'Conteúdo inapropriado' },
  { value: 'harassment',     label: 'Outro' },
];

interface ReportSheetProps {
  postId: string;
  reporterId: string;
  onClose: () => void;
}

export const ReportSheet: React.FC<ReportSheetProps> = ({ postId, reporterId, onClose }) => {
  const [selected, setSelected] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    const ok = await reportPost(postId, reporterId, selected, detail || undefined);
    if (ok) {
      setDone(true);
      setTimeout(onClose, 1500);
    } else {
      toast.error('Erro ao enviar denúncia.');
    }
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-t-2xl p-5 pb-10"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Denunciar post</h3>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {done ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="text-4xl mb-3">✅</span>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Denúncia enviada.</p>
              <p className="text-xs text-gray-400 mt-1">Nossa equipe vai analisar em breve.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {REASONS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setSelected(r.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selected === r.value
                        ? 'border-red-400 bg-red-50 dark:bg-red-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected === r.value ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selected === r.value && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{r.label}</span>
                  </button>
                ))}
              </div>

              <textarea
                value={detail}
                onChange={e => setDetail(e.target.value)}
                placeholder="Detalhes adicionais (opcional)…"
                rows={2}
                maxLength={300}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                  rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400
                  resize-none outline-none focus:ring-2 focus:ring-red-400/30 mb-4"
              />

              <button
                onClick={handleSubmit}
                disabled={!selected || submitting}
                className="w-full bg-red-500 disabled:bg-gray-200 dark:disabled:bg-gray-700 text-white
                  disabled:text-gray-400 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Enviar denúncia'}
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
