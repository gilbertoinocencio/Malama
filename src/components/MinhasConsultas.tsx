import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  Consultation,
  getPatientConsultations,
  getPatientPrescriptions,
  cancelConsultation,
  rateConsultation,
  acceptRescheduleProposal,
  rejectAllRescheduleProposals,
} from '../lib/scheduling';
import { creditService } from '../services/billingService';
import { appointmentChatService } from '../services/doctorPortalService';
import type { AppointmentChat } from '../types/doctorPortal';
import { AppView } from '../types';

interface MinhasConsultasProps {
  onBack: () => void;
  onEnterConsulta: (consultation: Consultation) => void;
  onNavigate: (view: AppView) => void;
  onOpenChat?: (params: { consultationId: string; doctorName: string }) => void;
}

type ActiveTab = 'consultations' | 'prescriptions';

export const MinhasConsultas: React.FC<MinhasConsultasProps> = ({ onBack, onEnterConsulta, onNavigate, onOpenChat }) => {
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
  const [rescheduleModal, setRescheduleModal] = useState<Consultation | null>(null);
  const [chosenProposal, setChosenProposal] = useState<string | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [activeChats, setActiveChats] = useState<Map<string, AppointmentChat>>(new Map());

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getPatientConsultations(user.id),
      getPatientPrescriptions(user.id),
      creditService.getAvailableForUser(user.id),
      appointmentChatService.getPatientChats(user.id),
    ])
      .then(([c, p, credits, chats]) => {
        setConsultations(c);
        setPrescriptions(p);
        setHasAvailableCredit((credits as any[]).length > 0);
        const chatMap = new Map<string, AppointmentChat>();
        (chats as AppointmentChat[]).forEach(ch => chatMap.set(ch.consultation_id, ch));
        setActiveChats(chatMap);
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

  const handleAcceptReschedule = async () => {
    if (!rescheduleModal || !chosenProposal || !user) return;
    setRescheduleLoading(true);
    try {
      await acceptRescheduleProposal(rescheduleModal.id, chosenProposal);
      setConsultations(prev => prev.map(c =>
        c.id === rescheduleModal.id
          ? { ...c, scheduled_at: chosenProposal, reschedule_status: 'accepted', reschedule_proposals: null }
          : c
      ));
      setRescheduleModal(null);
      setChosenProposal(null);
    } catch (e) { console.error(e); }
    finally { setRescheduleLoading(false); }
  };

  const handleRejectReschedule = async () => {
    if (!rescheduleModal || !user) return;
    if (!window.confirm('Recusar todas as opções cancela a consulta automaticamente. Confirmar?')) return;
    setRescheduleLoading(true);
    try {
      await rejectAllRescheduleProposals(rescheduleModal.id, user.id);
      setConsultations(prev => prev.map(c =>
        c.id === rescheduleModal.id ? { ...c, status: 'cancelled', reschedule_proposals: null } : c
      ));
      setRescheduleModal(null);
    } catch (e) { console.error(e); }
    finally { setRescheduleLoading(false); }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const statusColor: Record<string, string> = {
    scheduled: 'text-Malama-petrol bg-[#8c473e]/10 dark:bg-[#8c473e]/20',
    in_progress: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
    completed: 'text-Malama-muted dark:text-slate-400 bg-Malama-border dark:bg-white/10',
    cancelled: 'text-red-500 bg-red-50 dark:bg-red-900/30',
    no_show: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
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
    <div className="min-h-screen bg-Malama-bg dark:bg-background-dark font-display text-Malama-main dark:text-white pb-32">
      <header className="flex items-center gap-3 px-4 pt-safe-header pb-4">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-Malama-main/5 dark:hover:bg-white/5 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold flex-1">Saúde & Consultas</h1>
      </header>

      {/* Tabs */}
      <div className="flex mx-4 bg-white dark:bg-surface-dark rounded-2xl p-1 mb-4 shadow-sm border border-Malama-border dark:border-white/10">
        <button
          onClick={() => setTab('consultations')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === 'consultations'
              ? 'bg-Malama-petrol text-white shadow-sm'
              : 'text-Malama-muted dark:text-slate-400 hover:text-Malama-main dark:hover:text-white'
          }`}
        >
          Consultas
        </button>
        <button
          onClick={() => setTab('prescriptions')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === 'prescriptions'
              ? 'bg-Malama-petrol text-white shadow-sm'
              : 'text-Malama-muted dark:text-slate-400 hover:text-Malama-main dark:hover:text-white'
          }`}
        >
          Receitas
        </button>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-Malama-petrol border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'consultations' ? (
          <>
            {/* Banner: crédito disponível mas não agendado */}
            {hasAvailableCredit && upcoming.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-Malama-petrol to-[#7a3d35] rounded-2xl p-4 flex items-center justify-between shadow-md mb-5 cursor-pointer"
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

            {/* Pending reschedule banners */}
            {upcoming.filter(c => c.reschedule_status === 'pending').map(c => (
              <motion.div
                key={`rsch-${c.id}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl p-4 mb-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">📅</span>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Solicitação de reagendamento</p>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                  Dr(a). {(c.doctors as any)?.name || 'Médico'} propôs {(c.reschedule_proposals || []).length} opções de horário.
                  {c.reschedule_message && ` "${c.reschedule_message}"`}
                </p>
                <button
                  onClick={() => { setRescheduleModal(c); setChosenProposal((c.reschedule_proposals?.[0]?.date) ?? null); }}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Ver opções e escolher
                </button>
              </motion.div>
            ))}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-Malama-muted dark:text-slate-400 uppercase tracking-wider mb-3">Próximas</p>
                <div className="space-y-3">
                  {upcoming.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-Malama-border dark:border-white/10"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold dark:text-white">{(c.doctors as any)?.name || 'Médico'}</p>
                          <p className="text-xs text-Malama-muted dark:text-slate-400">{(c.doctors as any)?.specialty}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[c.status]}`}>
                          {statusLabel[c.status]}
                        </span>
                      </div>
                      <p className="text-xs text-Malama-muted dark:text-slate-400 mb-3 capitalize">📅 {formatDate(c.scheduled_at)}</p>
                      <div className="flex gap-2">
                        {canEnter(c) ? (
                          <button
                            onClick={() => onEnterConsulta(c)}
                            className="flex-1 py-2 bg-Malama-petrol hover:bg-[#7a3d35] text-white rounded-xl text-xs font-bold transition-colors"
                          >
                            Entrar na consulta
                          </button>
                        ) : (
                          <div className="flex-1 py-2 bg-Malama-border dark:bg-white/10 text-Malama-muted dark:text-slate-400 rounded-xl text-xs font-semibold text-center">
                            Disponível 10 min antes
                          </div>
                        )}
                        {c.status === 'scheduled' && (
                          <button
                            onClick={() => handleCancel(c.id)}
                            className="px-3 py-2 border border-red-200 dark:border-red-900/50 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
                <p className="text-xs font-semibold text-Malama-muted dark:text-slate-400 uppercase tracking-wider mb-3">Histórico</p>
                <div className="space-y-3">
                  {past.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-Malama-border dark:border-white/10"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-bold dark:text-white">{(c.doctors as any)?.name || 'Médico'}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[c.status]}`}>
                          {statusLabel[c.status]}
                        </span>
                      </div>
                      <p className="text-xs text-Malama-muted dark:text-slate-400 mb-2 capitalize">📅 {formatDate(c.scheduled_at)}</p>
                      {c.status === 'completed' && !c.rating && (
                        <button
                          onClick={() => setRatingModal({ id: c.id, doctorName: (c.doctors as any)?.name || 'Médico' })}
                          className="text-xs text-Malama-petrol hover:text-[#7a3d35] font-semibold"
                        >
                          ★ Avaliar consulta
                        </button>
                      )}
                      {c.rating && (
                        <p className="text-xs text-yellow-500">{'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}</p>
                      )}
                      {activeChats.has(c.id) && (() => {
                        const ch = activeChats.get(c.id)!;
                        const days = Math.max(0, Math.ceil((new Date(ch.expires_at).getTime() - Date.now()) / 86_400_000));
                        return (
                          <button
                            onClick={() => onOpenChat?.({ consultationId: c.id, doctorName: (c.doctors as any)?.name || 'Médico' })}
                            className="mt-2 w-full flex items-center justify-between px-3 py-2.5 bg-Malama-main hover:bg-[#2c2420] text-white rounded-xl text-xs font-semibold transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-base">chat</span>
                              <span>Falar com o médico</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              days <= 3 ? 'bg-red-500 text-white' :
                              days <= 7 ? 'bg-amber-400 text-Malama-main' :
                                          'bg-white/20 text-white'
                            }`}>
                              {days}d
                            </span>
                          </button>
                        );
                      })()}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {consultations.length === 0 && (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-Malama-muted/40 dark:text-white/20">calendar_month</span>
                <p className="text-sm text-Malama-muted dark:text-slate-400 mt-3">Nenhuma consulta ainda</p>
                <button
                  onClick={() => onNavigate(AppView.AGENDAR_CONSULTA)}
                  className="mt-5 px-6 py-3 bg-Malama-petrol text-white rounded-2xl text-sm font-bold hover:bg-[#7a3d35] transition-colors"
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
                  className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-Malama-border dark:border-white/10"
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-bold dark:text-white">💊 {rx.medication}</p>
                    {expiring && days > 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">⚠️ {days}d</span>
                    )}
                    {days <= 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-full">Vencida</span>
                    )}
                  </div>
                  <p className="text-xs text-Malama-muted dark:text-slate-400 mb-1">
                    {(rx.doctors as any)?.name || 'Médico'} · {new Date(rx.issued_at).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-Malama-muted/70 dark:text-slate-500 mb-3">
                    {days > 0 ? `Vence em ${days} dias` : 'Receita vencida'}
                  </p>
                  <div className="flex gap-2">
                    {rx.pdf_url && (
                      <a
                        href={rx.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 text-center border border-Malama-border dark:border-white/10 text-Malama-main dark:text-white rounded-xl text-xs font-semibold hover:bg-Malama-border/30 dark:hover:bg-white/10 transition-colors"
                      >
                        Baixar PDF
                      </a>
                    )}
                    {(expiring || days <= 0) && (
                      <button
                        onClick={() => onNavigate(AppView.AGENDAR_CONSULTA)}
                        className="flex-1 py-2 bg-Malama-petrol text-white rounded-xl text-xs font-bold hover:bg-[#7a3d35] transition-colors"
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
                <span className="material-symbols-outlined text-5xl text-Malama-muted/40 dark:text-white/20">description</span>
                <p className="text-sm text-Malama-muted dark:text-slate-400 mt-3">Nenhuma receita ainda</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white dark:bg-surface-dark w-full rounded-t-3xl p-6">
            <h3 className="font-bold text-lg mb-1 text-Malama-main dark:text-white">Escolha um novo horário</h3>
            <p className="text-sm text-Malama-muted dark:text-slate-400 mb-1">Dr(a). {(rescheduleModal.doctors as any)?.name || 'Médico'}</p>
            {rescheduleModal.reschedule_message && (
              <p className="text-xs text-Malama-muted/70 dark:text-slate-500 italic mb-4">"{rescheduleModal.reschedule_message}"</p>
            )}
            <div className="space-y-2 mb-5">
              {(rescheduleModal.reschedule_proposals || []).map((p, i) => {
                const d = new Date(p.date);
                const label = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const selected = chosenProposal === p.date;
                return (
                  <button
                    key={i}
                    onClick={() => setChosenProposal(p.date)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition ${
                      selected
                        ? 'border-Malama-petrol bg-[#8c473e]/5 dark:bg-[#8c473e]/20'
                        : 'border-Malama-border dark:border-white/10 hover:border-Malama-muted dark:hover:border-white/30'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected ? 'border-Malama-petrol bg-Malama-petrol' : 'border-Malama-muted/50 dark:border-white/30'
                    }`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-Malama-main dark:text-white capitalize">{label}</p>
                      <p className="text-xs text-Malama-muted dark:text-slate-400">às {time}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRejectReschedule}
                disabled={rescheduleLoading}
                className="flex-1 py-3 border-2 border-red-200 dark:border-red-900/50 text-red-500 rounded-2xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
              >
                Recusar tudo
              </button>
              <button
                onClick={handleAcceptReschedule}
                disabled={!chosenProposal || rescheduleLoading}
                className="flex-1 py-3 bg-Malama-petrol text-white rounded-2xl text-sm font-bold hover:bg-[#7a3d35] transition disabled:opacity-50"
              >
                {rescheduleLoading ? 'Confirmando...' : 'Confirmar horário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white dark:bg-surface-dark w-full rounded-t-3xl p-6">
            <h3 className="font-bold text-lg mb-1 text-Malama-main dark:text-white">Avaliar consulta</h3>
            <p className="text-sm text-Malama-muted dark:text-slate-400 mb-4">{ratingModal.doctorName}</p>
            <div className="flex justify-center gap-3 mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRatingValue(n)} className="text-3xl text-Malama-petrol">
                  {n <= ratingValue ? '★' : '☆'}
                </button>
              ))}
            </div>
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Comentário opcional..."
              className="w-full border border-Malama-border dark:border-white/10 rounded-xl p-3 text-sm resize-none h-20 mb-4 focus:outline-none focus:ring-2 focus:ring-Malama-petrol/30 bg-white dark:bg-Malama-dark text-Malama-main dark:text-white placeholder:text-Malama-muted/60 dark:placeholder:text-slate-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRatingModal(null)}
                className="flex-1 py-3 border border-Malama-border dark:border-white/10 rounded-xl text-sm font-semibold text-Malama-muted dark:text-slate-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleRate}
                disabled={ratingSaving}
                className="flex-1 py-3 bg-Malama-petrol text-white rounded-xl text-sm font-bold hover:bg-[#7a3d35] transition disabled:opacity-50"
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
