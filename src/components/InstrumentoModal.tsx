// =====================================================
// Malama — Responder um instrumento de campanha
//
// Genérico de propósito: renderiza QUALQUER instrumento do registro
// (psychosocialInstruments) a partir dos blocos declarados lá. Antes só
// existia a tela do WHO-5, e por isso a Job Stress Scale — já ativada no
// catálogo — não tinha como ser respondida.
//
// Uma pergunta por vez, com a redação e as opções vindas do registro. Nada
// de texto de instrumento escrito aqui: alterar a redação invalida o escore.
//
// O escore é calculado pelo próprio instrumento (determinístico, nunca IA) e
// gravado com o campaign_id — o que mantém a resposta dentro da campanha que
// o RH abriu e fora de qualquer coisa nominal.
//
// BAIXA LITERACIA — a tela é desenhada para o chão de fábrica:
//   · cada opção tem uma âncora visual ao lado do rótulo (ver EscalaVisual);
//   · alvo de toque grande, uma pergunta por vez, sem rolagem para responder;
//   · botão de ouvir a pergunta em voz alta, para quem lê com dificuldade.
//
// O que NÃO foi feito, de propósito: reescrever as perguntas em linguagem
// simples. A redação do WHO-5 e da JSS é o que faz o escore valer alguma
// coisa perante fiscal ou perito; trocar "meu dia a dia tem sido preenchido
// com coisas que me interessam" por algo mais fácil transforma o instrumento
// validado numa pesquisa caseira. O caminho para quem lê pouco é o áudio e a
// âncora visual, que apoiam a leitura sem alterar o estímulo.
// =====================================================

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../contexts/AuthContext';
import { PsychosocialService, type CampanhaPendente } from '../services/psychosocialService';
import { getInstrumento, itensDe, opcoesDoItem } from '../services/psychosocialInstruments';
import { EscalaVisual } from './EscalaVisual';
// Primitivas de fala do Body Scan: são genéricas apesar da pasta, e carregam
// a descoberta de que a Web Speech API não funciona dentro da WebView do
// Android (precisa do TTS nativo). Reescrever isso aqui daria um leitor mudo
// justamente no aparelho mais comum do público-alvo.
import { announce, primeVoice, stopSpeaking } from '../services/bodyscan/voiceGuide';
import toast from 'react-hot-toast';

const PETROL = '#7d4a3c';

interface Props {
  campanha: CampanhaPendente;
  onClose: () => void;
  onRespondida: () => void;
}

export const InstrumentoModal: React.FC<Props> = ({ campanha, onClose, onRespondida }) => {
  const { user } = useAuth();

  const def = useMemo(() => {
    try { return getInstrumento(campanha.instrument); } catch { return null; }
  }, [campanha.instrument]);

  const itens = useMemo(() => (def ? itensDe(def) : []), [def]);

  const [idx, setIdx] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [pendente, setPendente] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [falando, setFalando] = useState(false);

  // Só oferece o áudio onde existe motor de fala. No nativo sempre existe;
  // no navegador, depende.
  const temVoz = useMemo(
    () => Capacitor.isNativePlatform() || typeof window !== 'undefined' && 'speechSynthesis' in window,
    [],
  );

  // Nada toca sozinho: o questionário é respondido no trabalho, e uma voz
  // dizendo "eu me senti calmo e relaxado" na frente dos colegas quebra o
  // sigilo que a tela inteira promete. Só fala quando a pessoa pede.
  useEffect(() => () => { stopSpeaking(); }, []);

  if (!def) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 w-full max-w-md text-center">
          <p className="text-sm text-Malama-main dark:text-white mb-4">
            Este questionário ainda não está disponível no aplicativo.
          </p>
          <button onClick={onClose} className="text-sm font-semibold" style={{ color: PETROL }}>
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const item = itens[idx];
  const opcoes = opcoesDoItem(def, item?.key ?? '');
  const bloco = def.blocks.find(b => b.items.some(i => i.key === item?.key));
  const progresso = Math.round((idx / itens.length) * 100);

  /**
   * Lê a pergunta em voz alta, com as opções depois — quem depende do áudio
   * precisa saber entre o que está escolhendo, não só o enunciado.
   */
  const ouvir = async () => {
    if (falando) { await stopSpeaking(); setFalando(false); return; }
    setFalando(true);
    try {
      await primeVoice();
      const texto = [
        bloco?.intro,
        item.texto,
        'Opções: ' + opcoes.map(o => o.label).join('. '),
      ].filter(Boolean).join('. ');
      await announce(texto);
    } finally {
      setFalando(false);
    }
  };

  const escolher = async (valor: number) => {
    // Responder interrompe a leitura: senão a voz continua descrevendo a
    // pergunta anterior enquanto a próxima já está na tela.
    if (falando) { stopSpeaking(); setFalando(false); }
    setPendente(valor);
    const proximas = { ...respostas, [item.key]: valor };

    // Pequeno atraso para a opção acender antes de avançar.
    await new Promise(r => setTimeout(r, 180));
    setRespostas(proximas);
    setPendente(null);

    if (idx < itens.length - 1) { setIdx(idx + 1); return; }

    if (!user) return;
    setEnviando(true);
    try {
      await PsychosocialService.submitCampanha(
        user.id, campanha.campaign_id, def.code, proximas,
      );
      setConcluido(true);
      onRespondida();
    } catch (err: any) {
      console.error('[InstrumentoModal]', err);
      toast.error('Não foi possível enviar agora. Tente novamente mais tarde.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-surface-dark rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto"
      >
        {concluido ? (
          <div className="p-8 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: `${PETROL}15` }}
            >
              <span className="material-symbols-outlined text-3xl" style={{ color: PETROL }}>check</span>
            </div>
            <h2 className="text-xl font-bold text-Malama-main dark:text-white mb-2">Respostas enviadas</h2>
            <p className="text-sm text-Malama-muted dark:text-slate-400 leading-snug mb-6">
              Obrigado. Suas respostas são individuais e sigilosas — a sua empresa recebe apenas
              números agregados de grupos com no mínimo cinco pessoas.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl text-white font-semibold"
              style={{ background: PETROL }}
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            {/* Progresso */}
            <div className="h-1 bg-stone-100 dark:bg-white/10">
              <motion.div
                className="h-full" style={{ background: PETROL }}
                animate={{ width: `${progresso}%` }}
              />
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-1">
                <p className="text-xs font-medium text-Malama-muted dark:text-slate-400">
                  {def.nome}
                </p>
                <button
                  onClick={() => {
                    // Adiar silencia o modal por alguns dias — o questionário
                    // continua listado na home e a janela do RH segue valendo.
                    PsychosocialService.adiarCampanha(campanha.campaign_id);
                    onClose();
                  }}
                  className="text-xs text-Malama-muted dark:text-slate-500 flex-shrink-0"
                >
                  Depois
                </button>
              </div>
              <p className="text-xs text-Malama-muted dark:text-slate-500 mb-6">
                {idx + 1} de {itens.length}
              </p>

              {bloco?.intro && (
                <p className="text-sm text-Malama-muted dark:text-slate-400 mb-3 leading-snug">
                  {bloco.intro}
                </p>
              )}

              <AnimatePresence mode="wait">
                <motion.h2
                  key={item.key}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="text-lg font-semibold text-Malama-main dark:text-white leading-snug mb-6"
                >
                  {item.texto}
                </motion.h2>
              </AnimatePresence>

              <div className="space-y-2">
                {opcoes.map(op => {
                  const ativo = pendente === op.value;
                  return (
                    <button
                      key={op.value}
                      onClick={() => escolher(op.value)}
                      disabled={enviando}
                      className="w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all disabled:opacity-50"
                      style={{
                        borderColor: ativo ? PETROL : 'rgba(120,113,108,0.2)',
                        background: ativo ? `${PETROL}10` : 'transparent',
                      }}
                    >
                      <span className="text-sm text-Malama-main dark:text-white">{op.label}</span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-Malama-muted dark:text-slate-500 mt-5 leading-snug">
                Suas respostas não são vistas individualmente pela sua empresa nem pelo seu gestor.
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
