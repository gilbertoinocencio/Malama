// =====================================================
// Malama — Responder o questionário pelo link do RH (sem login)
//
// Rota pública /q/:token. É o caminho que existe para resolver adesão: o
// colaborador recebe o link no WhatsApp ou no e-mail interno e responde ali,
// sem instalar app e sem lembrar senha.
//
// A aplicação do instrumento é a MESMA de dentro do app
// (InstrumentoQuestionario) — carinhas, áudio e alvo de toque grande vêm de
// graça e não podem divergir entre os dois caminhos.
//
// Quem identifica a pessoa é o token, não uma sessão. Por isso a tela nunca
// mostra nome, e-mail ou qualquer dado de quem está respondendo: se o
// aparelho for compartilhado (o que é comum no chão de fábrica), nada do
// vínculo fica visível para o próximo que abrir.
// =====================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PsychosocialService, type CampanhaPorToken } from '../services/psychosocialService';
import { getInstrumento } from '../services/psychosocialInstruments';
import { InstrumentoQuestionario } from '../components/InstrumentoQuestionario';
import { MalamaLogo } from '../components/MalamaLogo';

const PETROL = '#7d4a3c';

const fmtData = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

/** Casca comum das telas de aviso — mesmo enquadramento da tela de responder. */
const Aviso: React.FC<{ icone: string; titulo: string; children: React.ReactNode }> = ({
  icone, titulo, children,
}) => (
  <div className="p-8 text-center">
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
      style={{ background: `${PETROL}15` }}
    >
      <span className="material-symbols-outlined text-3xl" style={{ color: PETROL }}>
        {icone}
      </span>
    </div>
    <h2 className="text-xl font-bold text-Malama-main dark:text-white mb-2">{titulo}</h2>
    <p className="text-sm text-Malama-muted dark:text-slate-400 leading-snug">{children}</p>
  </div>
);

export const ResponderQuestionario: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [campanha, setCampanha] = useState<CampanhaPorToken | null>(null);
  const [iniciado, setIniciado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setCampanha({ estado: 'invalido' }); return; }
    PsychosocialService.getCampanhaPorToken(token).then(setCampanha);
  }, [token]);

  // O instrumento pode existir na campanha e ainda não ter sido codificado
  // aqui — nesse caso a tela avisa em vez de quebrar.
  const def = useMemo(() => {
    if (campanha?.estado !== 'ok') return null;
    try { return getInstrumento(campanha.instrument); } catch { return null; }
  }, [campanha]);

  const concluir = useCallback(async (answers: Record<string, number>) => {
    if (!token || campanha?.estado !== 'ok') return;
    setEnviando(true);
    setErroEnvio(null);
    try {
      const r = await PsychosocialService.submitPorToken(token, campanha.instrument, answers);
      if (r.ok) setConcluido(true);
      else setErroEnvio(r.error ?? 'Não foi possível enviar agora.');
    } finally {
      setEnviando(false);
    }
  }, [token, campanha]);

  const conteudo = () => {
    if (!campanha) {
      return (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
               style={{ borderColor: PETROL, borderTopColor: 'transparent' }} />
        </div>
      );
    }

    if (concluido) {
      return (
        <Aviso icone="check" titulo="Respostas enviadas">
          Obrigado. Ninguém da sua empresa vê a sua resposta. Ela recebe só um resumo por grupo,
          e apenas quando o grupo tem cinco pessoas ou mais.
        </Aviso>
      );
    }

    switch (campanha.estado) {
      case 'ja_respondeu':
        return (
          <Aviso icone="task_alt" titulo="Você já respondeu">
            Este questionário já foi respondido. Não é preciso responder de novo.
          </Aviso>
        );
      case 'encerrada':
        return (
          <Aviso icone="event_busy" titulo="Questionário encerrado">
            O prazo para responder já terminou. Quando houver um novo, você recebe outro link.
          </Aviso>
        );
      case 'fora_da_janela':
        return (
          <Aviso icone="schedule" titulo="Fora do prazo">
            Este questionário podia ser respondido até {fmtData(campanha.janela_fim)}.
          </Aviso>
        );
      case 'invalido':
        return (
          <Aviso icone="link_off" titulo="Link inválido">
            Confira se o link foi copiado inteiro. Se o problema continuar, peça um novo link ao
            RH da sua empresa.
          </Aviso>
        );
      case 'erro':
        return (
          <Aviso icone="wifi_off" titulo="Não foi possível abrir">
            Verifique sua conexão e tente abrir o link de novo.
          </Aviso>
        );
    }

    if (!def) {
      return (
        <Aviso icone="help" titulo="Questionário indisponível">
          Este questionário ainda não está disponível. Avise o RH da sua empresa.
        </Aviso>
      );
    }

    // ── Abertura: é o que decide se a pessoa responde ou fecha ──
    // Quem recebe um link no WhatsApp precisa saber, antes de começar, de
    // quem ele veio e quem vai ver a resposta.
    if (!iniciado) {
      return (
        <div className="p-8">
          <p className="text-xs font-medium text-Malama-muted dark:text-slate-400 mb-1">
            {campanha.empresa_nome}
          </p>
          <h1 className="text-2xl font-bold text-Malama-main dark:text-white leading-tight mb-3">
            {campanha.instrument_nome}
          </h1>
          <p className="text-sm text-Malama-muted dark:text-slate-400 leading-snug mb-6">
            São poucas perguntas e leva alguns minutos. Você pode ouvir cada pergunta em voz alta
            tocando em <strong>Ouvir</strong>. Prazo para responder: {fmtData(campanha.janela_fim)}.
          </p>

          <div
            className="rounded-2xl p-4 mb-6 border"
            style={{ borderColor: `${PETROL}25`, background: `${PETROL}08` }}
          >
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined flex-shrink-0" style={{ color: PETROL }}>
                lock
              </span>
              <p className="text-sm text-Malama-main dark:text-white leading-snug">
                Ninguém da sua empresa vê a sua resposta. Ela recebe só um resumo por grupo, e
                apenas quando o grupo tem cinco pessoas ou mais.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIniciado(true)}
            className="w-full py-4 rounded-2xl text-white font-semibold text-base active:scale-[0.99] transition-transform"
            style={{ background: PETROL }}
          >
            Começar
          </button>
        </div>
      );
    }

    return (
      <>
        <InstrumentoQuestionario def={def} enviando={enviando} onConcluir={concluir} />
        {erroEnvio && (
          <div className="px-6 pb-6 -mt-2">
            <p className="text-sm text-red-600 dark:text-red-400 leading-snug">{erroEnvio}</p>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-Malama-bg dark:bg-slate-900 flex flex-col items-center">
      <div className="w-full max-w-md flex-1 flex flex-col">
        <div className="flex justify-center py-6">
          <MalamaLogo size="sm" />
        </div>
        <div className="flex-1 bg-white dark:bg-surface-dark sm:rounded-3xl sm:mb-6 overflow-hidden">
          {conteudo()}
        </div>
        <p className="text-[11px] text-Malama-muted dark:text-slate-500 text-center pb-6 px-6 leading-snug">
          Em situação de crise, ligue <strong>188</strong> (CVV, 24h, gratuito).
        </p>
      </div>
    </div>
  );
};
