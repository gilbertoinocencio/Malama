// =====================================================
// Malama — Início do modo Mental
//
// O que a pessoa precisa ver ao abrir o app: o que está pendente de resposta,
// quando é a próxima sessão e como marcar uma.
//
// Nada de calorias, macros, peso ou refeição — quem entra por aqui não
// contratou o produto metabólico e não deveria nem ver que ele existe.
//
// Os questionários vêm de minhas_campanhas_pendentes(), que já filtra
// empresa, setor, janela e o que a pessoa já respondeu. É por aqui que a
// campanha aberta pelo RH finalmente chega ao colaborador.
// =====================================================

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AppView } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PsychosocialService, type CampanhaPendente } from '../services/psychosocialService';
import { InstrumentoModal } from './InstrumentoModal';
import { ContatoEmergenciaModal, faltaContatoEmergencia } from './ContatoEmergenciaModal';
import { getPatientConsultations, type Consultation } from '../lib/scheduling';
import { creditService } from '../services/billingService';
import { RelatoConfidencialModal } from './RelatoConfidencialModal';
import { relatoConfidencialService } from '../services/relatoConfidencialService';

const PETROL = '#7d4a3c';

const fmtDataHora = (d: string) =>
  new Date(d).toLocaleString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

const fmtJanela = (fim: string) => {
  const dias = Math.ceil(
    (new Date(fim + 'T23:59:59').getTime() - Date.now()) / 86_400_000,
  );
  if (dias <= 0) return 'encerra hoje';
  if (dias === 1) return 'encerra amanhã';
  return `${dias} dias para responder`;
};

interface Props {
  onNavigate: (view: AppView) => void;
}

export const MentalHome: React.FC<Props> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [campanhas, setCampanhas] = useState<CampanhaPendente[]>([]);
  const [proxima, setProxima] = useState<Consultation | null>(null);
  const [temCredito, setTemCredito] = useState(false);
  const [respondendo, setRespondendo] = useState<CampanhaPendente | null>(null);
  const [editandoContato, setEditandoContato] = useState(false);
  const [relatando, setRelatando] = useState(false);
  const [canalEmpresa, setCanalEmpresa] = useState(false);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!user) return;
    try {
      const [pend, consultas, creditos, canalDisponivel] = await Promise.all([
        PsychosocialService.getCampanhasPendentes(),
        getPatientConsultations(user.id).catch(() => [] as Consultation[]),
        creditService.getAvailableForUser(user.id, 'psicologo').catch(() => [] as any[]),
        relatoConfidencialService.disponivel(),
      ]);
      setCampanhas(pend);
      setTemCredito((creditos ?? []).length > 0);
      setCanalEmpresa(canalDisponivel);

      const agora = Date.now();
      const futuras = (consultas ?? [])
        .filter(c => c.status === 'scheduled' && new Date(c.scheduled_at).getTime() > agora)
        .sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at));
      setProxima(futuras[0] ?? null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { carregar(); }, [carregar]);

  const primeiroNome = (profile?.display_name ?? '').split(' ')[0];
  const saudacao = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  })();

  return (
    <div className="pb-28">
      <div className="px-6 pt-8 pb-6">
        <p className="text-sm text-Malama-muted dark:text-slate-400">{saudacao}</p>
        <h1 className="text-2xl font-bold text-Malama-main dark:text-white">
          {primeiroNome || 'Olá'}
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-Malama-petrol border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-6 space-y-4">
          {/* ── Questionários pendentes ── */}
          {campanhas.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-Malama-muted dark:text-slate-400 uppercase tracking-wide">
                Para responder
              </p>
              {campanhas.map(c => (
                <motion.button
                  key={c.campaign_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setRespondendo(c)}
                  className="w-full text-left rounded-2xl p-4 border-2 transition-all active:scale-[0.99]"
                  style={{ borderColor: `${PETROL}30`, background: `${PETROL}08` }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: `${PETROL}18` }}
                    >
                      <span className="material-symbols-outlined" style={{ color: PETROL }}>
                        checklist
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-Malama-main dark:text-white">
                        {c.instrument_nome}
                      </p>
                      <p className="text-xs text-Malama-muted dark:text-slate-400 mt-0.5">
                        {fmtJanela(c.janela_fim)} · leva poucos minutos
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-Malama-muted flex-shrink-0">
                      chevron_right
                    </span>
                  </div>
                </motion.button>
              ))}
              {/* Sem termo técnico: quem lê pouco precisa entender a promessa
                  de sigilo, senão ela não vale nada na hora de responder. */}
              <p className="text-xs text-Malama-muted dark:text-slate-500 leading-snug px-1">
                Ninguém da sua empresa vê a sua resposta. Ela recebe só um resumo por grupo, e
                apenas quando o grupo tem cinco pessoas ou mais.
              </p>
            </div>
          )}

          {/* ── Próxima sessão ── */}
          {proxima ? (
            <button
              onClick={() => onNavigate(AppView.MINHAS_CONSULTAS)}
              className="w-full text-left bg-white dark:bg-surface-dark rounded-2xl p-4 border border-Malama-border dark:border-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-emerald-600">event_available</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-Malama-main dark:text-white">Próxima sessão</p>
                  <p className="text-xs text-Malama-muted dark:text-slate-400 mt-0.5">
                    {fmtDataHora(proxima.scheduled_at)}
                  </p>
                </div>
                <span className="material-symbols-outlined text-Malama-muted flex-shrink-0">
                  chevron_right
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => {
                sessionStorage.setItem('agendar_especialidade', 'psicologo');
                onNavigate(AppView.AGENDAR_CONSULTA);
              }}
              className="w-full text-left rounded-2xl p-4 text-white active:scale-[0.99] transition-transform"
              style={{ background: PETROL }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined">self_improvement</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">Agendar sessão com psicólogo</p>
                  <p className="text-xs text-white/80 mt-0.5">
                    {temCredito
                      ? 'Sua sessão deste mês está disponível'
                      : 'Veja os horários disponíveis'}
                  </p>
                </div>
                <span className="material-symbols-outlined flex-shrink-0">arrow_forward</span>
              </div>
            </button>
          )}

          {/* ── Contato de emergência, quando falta ──
              Quem criou conta antes do cadastro do modo Mental nunca passou
              pela coleta; sem isto o psicólogo pede o contato e não tem. */}
          {faltaContatoEmergencia(profile) && (
            <button
              onClick={() => setEditandoContato(true)}
              className="w-full text-left bg-white dark:bg-surface-dark rounded-2xl p-4 border border-Malama-border dark:border-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-Malama-muted">contact_phone</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-Malama-main dark:text-white">
                    Contato de emergência
                  </p>
                  <p className="text-xs text-Malama-muted dark:text-slate-400 mt-0.5">
                    Leva 30 segundos e fica oculto
                  </p>
                </div>
                <span className="material-symbols-outlined text-Malama-muted flex-shrink-0">
                  chevron_right
                </span>
              </div>
            </button>
          )}

          {/* ── Diário ── */}
          <button
            onClick={() => onNavigate(AppView.DAILY_JOURNAL)}
            className="w-full text-left bg-white dark:bg-surface-dark rounded-2xl p-4 border border-Malama-border dark:border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-Malama-muted">book</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-Malama-main dark:text-white">Diário</p>
                <p className="text-xs text-Malama-muted dark:text-slate-400 mt-0.5">
                  Como foi o seu dia
                </p>
              </div>
              <span className="material-symbols-outlined text-Malama-muted flex-shrink-0">
                chevron_right
              </span>
            </div>
          </button>

          {canalEmpresa && <button
            onClick={() => setRelatando(true)}
            className="w-full text-left rounded-2xl p-4 border border-amber-200 bg-amber-50/70 dark:bg-amber-900/10 dark:border-amber-800/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-amber-700">shield_lock</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-Malama-main dark:text-white">Relatar assédio ou violência</p>
                <p className="text-xs text-Malama-muted dark:text-slate-400 mt-0.5">Canal confidencial com protocolo de acompanhamento</p>
              </div>
              <span className="material-symbols-outlined text-Malama-muted">chevron_right</span>
            </div>
          </button>}

          {campanhas.length === 0 && (
            <p className="text-xs text-Malama-muted dark:text-slate-500 text-center pt-4 leading-snug">
              Nenhum questionário pendente no momento.
            </p>
          )}

          {/* Emergência: presente e discreto, sempre. */}
          <div className="pt-4">
            <p className="text-[11px] text-Malama-muted dark:text-slate-500 text-center leading-snug">
              A Malama funciona por agendamento e não atende emergências.
              <br />
              Em situação de crise, ligue <strong>188</strong> (CVV, 24h, gratuito).
            </p>
          </div>
        </div>
      )}

      {editandoContato && (
        <ContatoEmergenciaModal onClose={() => setEditandoContato(false)} />
      )}

      {respondendo && (
        <InstrumentoModal
          campanha={respondendo}
          onClose={() => setRespondendo(null)}
          onRespondida={() => { setRespondendo(null); carregar(); }}
        />
      )}

      {relatando && <RelatoConfidencialModal onClose={() => setRelatando(false)} />}
    </div>
  );
};
