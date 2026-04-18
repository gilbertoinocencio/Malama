import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  Consultation,
  getPatientConsultations,
  getPatientPrescriptions,
  cancelConsultation,
  rateConsultation,
} from '../lib/scheduling';
import { creditService } from '../services/billingService';
import { AppView } from '../types';

interface MinhasConsultasProps {
  onBack: () => void;
  onEnterConsulta: (consultation: Consultation) => void;
  onNavigate: (view: AppView) => void;
}

type ActiveTab = 'consultations' | 'prescriptions';

export const MinhasConsultas: React.FC<MinhasConsultasProps> = ({ onBack, onEnterConsulta, onNavigate }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<ActiveTab>('consultations');
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAvailableCredit, setHasAvailableCredit] = useState(false);
  const [ratingModal, setRatingModal] = useState<{ id: string; doctorName: string } | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSaving, setRatingSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getPatientConsultations(user.id),
      getPatientPrescriptions(user.id),
      creditService.getAvailableForUser(user.id),
    ])
      .then(([c, p, credits]) => {
        setConsultations(c);
        setPrescriptions(p);
        setHasAvailableCredit((credits as any[]).length > 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const canEnter = (c: Consultation) => {
    const scheduled = new Date(c.scheduled_at);
    const now = new Date();
    const diffMin = (scheduled.getTime() - now.getTime()) / 60000;
    return c.status === 'scheduled' && diffMin <= 10 && diffMin >= -60;
  };

  const handleCancel = async (id: string) => {
    if (!user || !confirm('Tem certeza que deseja cancelar esta consulta?')) return;
    await cancelConsultation(id, user.id);
    setConsultations((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'cancelled' } : c)));
  };

  const handleRate = async () => {
    if (!user || !ratingModal) return;
    setRatingSaving(true);
    await rateConsultation(ratingModal.id, user.id, ratingValue, ratingComment);
    setConsultations((prev) =>
      prev.map((c) => (c.id === ratingModal.id ? { ...c, rating: ratingValue } : c))
    );
    setRatingModal(null);
    setRatingSaving(false);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const statusColor: Record<string, string> = {
    scheduled: 'text-green-600 bg-green-100',
    in_progress: 'text-blue-600 bg-blue-100',
    completed: 'text-gray-500 bg-gray-100',
    cancelled: 'text-red-500 bg-red-100',
    no_show: 'text-orange-500 bg-orange-100',
  };
  const statusLabel: Record<string, string> = {
    scheduled: '✅ Confirmada', in_progress: '🔴 Em andamento',
    completed: '✓ Concluída', cancelled: '✗ Cancelada', no_show: '⚠️ Não compareceu',
  };

  const upcoming = consultations.filter((c) => ['scheduled', 'in_progress'].includes(c.status));
  const past = consultations.filter((c) => ['completed', 'cancelled', 'no_show'].includes(c.status));

  const daysUntilExpiry = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="min-h-screen bg-[#EEEFF4] font-display text-gray-900 pb-32">
      <header className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold flex-1">Saúde & Consultas</h1>
      </header>

      {/* Tabs */}
      <div className="flex mx-4 bg-white rounded-2xl p-1 mb-4 shadow-sm border border-gray-100">
        <button
          onClick={() => setTab('consultations')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'consultations' ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
        >
          Consultas
        </button>
        <button
          onClick={() => setTab('prescriptions')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'prescriptions' ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
        >
          Receitas
        </button>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'consultations' ? (
          <>
            {/* Banner: crédito disponível mas não agendado */}
            {hasAvailableCredit && upcoming.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-4 flex items-center justify-between shadow-md mb-5 cursor-pointer"
                onClick={() => onNavigate(AppView.AGENDAR_CONSULTA)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-xl">calendar_month</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">Consulta do mês disponível</p>
                    <p className="text-white/80 text-xs">Você ainda não agendou a consulta do mês</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full">
                  <span className="text-white text-xs font-bold">Agendar</span>
                  <span className="material-symbols-outlined text-white text-sm">arrow_forward</span>
                </div>
              </motion.div>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Próximas</p>
                <div className="space-y-3">
                  {upcoming.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold">{(c.doctors as any)?.name || 'Médico'}</p>
                          <p className="text-xs text-gray-500">{(c.doctors as any)?.specialty}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[c.status]}`}>
                          {statusLabel[c.status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3 capitalize">📅 {formatDate(c.scheduled_at)}</p>
                      <div className="flex gap-2">
                        {canEnter(c) ? (
                          <button
                            onClick={() => onEnterConsulta(c)}
                            className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-colors"
                          >
                            Entrar na consulta
                          </button>
                        ) : (
                          <div className="flex-1 py-2 bg-gray-100 text-gray-400 rounded-xl text-xs font-semibold text-center">
                            Disponível 10 min antes
                          </div>
                        )}
                        {c.status === 'scheduled' && (
                          <button
                            onClick={() => handleCancel(c.id)}
                            className="px-3 py-2 border border-red-200 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Past */}
            {past.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Histórico</p>
                <div className="space-y-3">
                  {past.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-bold">{(c.doctors as any)?.name || 'Médico'}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[c.status]}`}>
                          {statusLabel[c.status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2 capitalize">📅 {formatDate(c.scheduled_at)}</p>
                      {c.status === 'completed' && !c.rating && (
                        <button
                          onClick={() => setRatingModal({ id: c.id, doctorName: (c.doctors as any)?.name || 'Médico' })}
                          className="text-xs text-blue-500 hover:text-blue-600 font-semibold"
                        >
                          ★ Avaliar consulta
                        </button>
                      )}
                      {c.rating && (
                        <p className="text-xs text-yellow-500">{'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {consultations.length === 0 && (
              <div className="text-center py-12">
                <span className="text-4xl">🗓</span>
                <p className="text-sm text-gray-500 mt-3">Nenhuma consulta ainda</p>
                <button
                  onClick={() => onNavigate(AppView.GLP1_CONSULTA)}
                  className="mt-4 px-5 py-2.5 bg-gray-900 text-white rounded-full text-sm font-bold hover:bg-gray-800 transition-colors"
                >
                  Agendar primeira consulta
                </button>
              </div>
            )}
          </>
        ) : (
          /* Prescriptions */
          <div className="space-y-3">
            {prescriptions.map((rx: any) => {
              const days = daysUntilExpiry(rx.expires_at);
              const expiring = days <= 15;
              return (
                <motion.div
                  key={rx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-bold">💊 {rx.medication}</p>
                    {expiring && days > 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">⚠️ {days}d</span>
                    )}
                    {days <= 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 bg-red-100 text-red-500 rounded-full">Vencida</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    {(rx.doctors as any)?.name || 'Médico'} · {new Date(rx.issued_at).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    {days > 0 ? `Vence em ${days} dias` : 'Receita vencida'}
                  </p>
                  <div className="flex gap-2">
                    {rx.pdf_url && (
                      <a
                        href={rx.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 text-center border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Baixar PDF
                      </a>
                    )}
                    {(expiring || days <= 0) && (
                      <button
                        onClick={() => onNavigate(AppView.GLP1_CONSULTA)}
                        className="flex-1 py-2 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-colors"
                      >
                        Renovar receita
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
            {prescriptions.length === 0 && (
              <div className="text-center py-12">
                <span className="text-4xl">📋</span>
                <p className="text-sm text-gray-500 mt-3">Nenhuma receita ainda</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-6">
            <h3 className="font-bold text-lg mb-1">Avaliar consulta</h3>
            <p className="text-sm text-gray-500 mb-4">{ratingModal.doctorName}</p>
            <div className="flex justify-center gap-3 mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRatingValue(n)} className="text-3xl">
                  {n <= ratingValue ? '★' : '☆'}
                </button>
              ))}
            </div>
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Comentário opcional..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-20 mb-4 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRatingModal(null)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleRate}
                disabled={ratingSaving}
                className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {ratingSaving ? 'Enviando...' : 'Enviar avaliação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinhasConsultas;
