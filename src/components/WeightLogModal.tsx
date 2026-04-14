import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { WeightLogService, WeightLog } from '../services/weightLogService';

interface WeightLogModalProps {
  onClose: () => void;
  onSaved?: (log: WeightLog) => void;
}

export const WeightLogModal: React.FC<WeightLogModalProps> = ({ onClose, onSaved }) => {
  const { user, profile } = useAuth();

  const [weight, setWeight] = useState<string>(profile?.weight ? String(profile.weight) : '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recentLogs, setRecentLogs] = useState<WeightLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load last 5 entries
  useEffect(() => {
    if (!user) return;
    WeightLogService.getWeightHistory(user.id, 5)
      .then(setRecentLogs)
      .finally(() => setLoadingHistory(false));
  }, [user]);

  const lastWeight = recentLogs[0]?.weight_kg;
  const weightNum = parseFloat(weight);
  const diff = lastWeight && !isNaN(weightNum) ? weightNum - lastWeight : null;

  const handleSave = async () => {
    if (!user) return;
    if (isNaN(weightNum) || weightNum < 20 || weightNum > 400) {
      setError('Insira um peso válido entre 20 e 400 kg.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const log = await WeightLogService.logWeight(user.id, weightNum, 'manual', note || undefined);
      setSaved(true);
      onSaved?.(log);
      // Auto-close after 1.2s
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await WeightLogService.deleteWeightLog(id);
      setRecentLogs(prev => prev.filter(l => l.id !== id));
    } catch { /* silent */ }
  };

  // Weight trend indicator
  const getTrendInfo = () => {
    if (diff === null) return null;
    if (diff < -0.2) return { icon: 'trending_down', color: '#10b981', text: `↓ ${Math.abs(diff).toFixed(1)} kg` };
    if (diff > 0.2) return { icon: 'trending_up', color: '#f59e0b', text: `↑ ${diff.toFixed(1)} kg` };
    return { icon: 'trending_flat', color: '#6b7280', text: 'Estável' };
  };
  const trend = getTrendInfo();

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-md rounded-t-3xl pb-safe-bottom"
          style={{ background: '#111c1e' }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        >
          {/* Handle */}
          <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: 'rgba(255,255,255,0.2)' }} />

          <div className="px-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white text-xl font-bold">Registrar Peso</h2>
                {lastWeight && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Último: {lastWeight.toFixed(1)} kg
                  </p>
                )}
              </div>
              <button onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <span className="material-symbols-outlined text-white/60 text-xl">close</span>
              </button>
            </div>

            {saved ? (
              /* Success state */
              <div className="flex flex-col items-center py-8 gap-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.15)' }}>
                  <span className="material-symbols-outlined text-4xl" style={{ color: '#10b981' }}>check_circle</span>
                </div>
                <p className="text-white font-bold text-lg">{weightNum.toFixed(1)} kg registrado!</p>
                {trend && (
                  <p className="text-sm font-medium" style={{ color: trend.color }}>{trend.text} em relação ao último</p>
                )}
              </div>
            ) : (
              <>
                {/* Weight Input */}
                <div className="mb-4">
                  <div className="flex items-end gap-3 justify-center mb-2">
                    <input
                      type="number"
                      value={weight}
                      onChange={e => { setWeight(e.target.value); setError(null); }}
                      placeholder="0.0"
                      step="0.1"
                      min="20"
                      max="400"
                      className="text-center text-5xl font-bold bg-transparent border-none outline-none w-40"
                      style={{ color: '#1a9aaf', caretColor: '#1a9aaf' }}
                      autoFocus
                    />
                    <span className="text-xl font-semibold pb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>kg</span>
                  </div>

                  {/* Diff indicator */}
                  {trend && (
                    <div className="flex items-center justify-center gap-1.5 mb-3">
                      <span className="material-symbols-outlined text-sm" style={{ color: trend.color }}>{trend.icon}</span>
                      <span className="text-sm font-medium" style={{ color: trend.color }}>{trend.text}</span>
                    </div>
                  )}

                  {/* Quick adjust buttons */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    {[-1, -0.5, -0.1, +0.1, +0.5, +1].map(delta => (
                      <button
                        key={delta}
                        onClick={() => setWeight(prev => {
                          const v = (parseFloat(prev) || 0) + delta;
                          return v > 0 ? v.toFixed(1) : prev;
                        })}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors"
                        style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}
                      >
                        {delta > 0 ? '+' : ''}{delta}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Observação (opcional)"
                  maxLength={80}
                  className="w-full rounded-xl px-4 py-3 text-sm bg-transparent border outline-none mb-4 transition-colors"
                  style={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.8)',
                    caretColor: '#1a9aaf',
                  }}
                />

                {error && (
                  <p className="text-xs mb-3 text-center" style={{ color: '#f87171' }}>{error}</p>
                )}

                {/* Save button */}
                <button
                  onClick={handleSave}
                  disabled={saving || !weight}
                  className="w-full py-4 rounded-2xl font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: '#1a9aaf' }}
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">save</span>
                      Salvar Peso
                    </>
                  )}
                </button>
              </>
            )}

            {/* Recent history */}
            {!saved && recentLogs.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>Últimos registros</h3>
                <div className="space-y-2">
                  {loadingHistory ? (
                    <div className="h-16 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full animate-spin border-2 border-t-transparent"
                        style={{ borderColor: 'rgba(26,154,175,0.3)', borderTopColor: '#1a9aaf' }} />
                    </div>
                  ) : recentLogs.map((log, i) => {
                    const prev = recentLogs[i + 1];
                    const d = prev ? log.weight_kg - prev.weight_kg : null;
                    return (
                      <div key={log.id} className="flex items-center justify-between py-2 px-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <div>
                          <span className="text-sm font-semibold text-white">{log.weight_kg.toFixed(1)} kg</span>
                          <span className="text-xs ml-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            {new Date(log.logged_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            {log.source !== 'manual' && ` · ${log.source}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {d !== null && (
                            <span className={`text-xs font-medium ${d < 0 ? 'text-green-400' : d > 0 ? 'text-red-400' : 'text-white/30'}`}>
                              {d > 0 ? '+' : ''}{d.toFixed(1)}
                            </span>
                          )}
                          <button onClick={() => handleDelete(log.id)}
                            className="text-white/20 hover:text-red-400 transition-colors">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
