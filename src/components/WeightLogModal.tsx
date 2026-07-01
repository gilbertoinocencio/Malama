import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { WeightLogService, WeightLog } from '../services/weightLogService';

interface WeightLogModalProps {
  onClose: () => void;
  onSaved?: (log: WeightLog) => void;
}

export const WeightLogModal: React.FC<WeightLogModalProps> = ({ onClose, onSaved }) => {
  const { user, profile, updateProfile } = useAuth();

  const [weight, setWeight] = useState<string>(profile?.weight ? String(profile.weight) : '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recentLogs, setRecentLogs] = useState<WeightLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      await updateProfile({ weight: weightNum }).catch(() => {});
      setSaved(true);
      onSaved?.(log);
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

  const getTrendInfo = () => {
    if (diff === null) return null;
    if (diff < -0.2) return { icon: 'trending_down', color: '#10b981', text: `↓ ${Math.abs(diff).toFixed(1)} kg` };
    if (diff > 0.2) return { icon: 'trending_up', color: '#d47311', text: `↑ ${diff.toFixed(1)} kg` };
    return { icon: 'trending_flat', color: '#78716C', text: 'Estável' };
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
          className="relative w-full max-w-md rounded-t-3xl bg-Malama-bg pb-safe-nav overflow-hidden"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        >
          {/* Decorative orb */}
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ background: '#8c473e' }}
          />

          {/* Handle */}
          <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-5 bg-Malama-border" />

          <div className="px-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-Malama-main text-xl font-bold">Registrar Peso</h2>
                {lastWeight && (
                  <p className="text-xs text-Malama-muted mt-0.5">
                    Último: {lastWeight.toFixed(1)} kg
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-Malama-border flex items-center justify-center transition-colors hover:bg-Malama-petrol-light"
              >
                <span className="material-symbols-outlined text-Malama-muted text-xl">close</span>
              </button>
            </div>

            {saved ? (
              <div className="flex flex-col items-center py-8 gap-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-emerald-500">check_circle</span>
                </div>
                <p className="text-Malama-main font-bold text-lg">{weightNum.toFixed(1)} kg registrado!</p>
                {trend && (
                  <p className="text-sm font-medium" style={{ color: trend.color }}>{trend.text} em relação ao último</p>
                )}
              </div>
            ) : (
              <>
                {/* Weight input */}
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
                      className="text-center text-5xl font-light bg-transparent border-none outline-none w-40 tracking-tight"
                      style={{ color: '#8c473e', caretColor: '#8c473e' }}
                      autoFocus
                    />
                    <span className="text-xl font-semibold pb-2 text-Malama-muted">kg</span>
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
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors bg-Malama-petrol-light text-Malama-main hover:bg-Malama-border"
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
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white border border-Malama-border outline-none mb-4 transition-colors focus:border-Malama-petrol/40 text-Malama-main placeholder:text-Malama-muted/50"
                />

                {error && (
                  <p className="text-xs mb-3 text-center text-red-500">{error}</p>
                )}

                {/* Save button */}
                <button
                  onClick={handleSave}
                  disabled={saving || !weight}
                  className="w-full py-4 rounded-2xl font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2 bg-Malama-petrol hover:bg-[#7a3d35]"
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
                <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider text-Malama-muted">
                  Últimos registros
                </h3>
                <div className="space-y-2">
                  {loadingHistory ? (
                    <div className="h-16 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full animate-spin border-2 border-t-transparent border-Malama-petrol" />
                    </div>
                  ) : recentLogs.map((log, i) => {
                    const prev = recentLogs[i + 1];
                    const d = prev ? log.weight_kg - prev.weight_kg : null;
                    return (
                      <div key={log.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-Malama-petrol-light">
                        <div>
                          <span className="text-sm font-semibold text-Malama-main">{log.weight_kg.toFixed(1)} kg</span>
                          <span className="text-xs ml-2 text-Malama-muted/70">
                            {new Date(log.logged_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            {log.source !== 'manual' && ` · ${log.source}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {d !== null && (
                            <span className={`text-xs font-medium ${d < 0 ? 'text-emerald-600' : d > 0 ? 'text-red-500' : 'text-Malama-muted/50'}`}>
                              {d > 0 ? '+' : ''}{d.toFixed(1)}
                            </span>
                          )}
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="text-Malama-muted/30 hover:text-red-400 transition-colors"
                          >
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
