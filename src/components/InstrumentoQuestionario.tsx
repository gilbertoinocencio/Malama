// =====================================================
// Malama — Aplicação de um instrumento psicossocial (tela pura)
//
// Só a interação de responder: uma pergunta por vez, com a redação e as
// opções vindas do registro (psychosocialInstruments). Não sabe de campanha,
// de login nem de banco — quem grava é quem usa este componente. É isso que
// permite a MESMA tela servir dois caminhos que não podem divergir:
//
//   · dentro do app, logado          → InstrumentoModal
//   · pelo link enviado pelo RH      → routes/ResponderQuestionario (sem login)
//
// Se a tela do link fosse uma cópia, qualquer ajuste de acessibilidade
// precisaria ser feito duas vezes — e a versão esquecida seria justamente a
// do link, que é a que o pessoal do chão de fábrica usa.
//
// BAIXA LITERACIA (por que a tela é assim):
//   · âncora visual ao lado de cada opção — ver EscalaVisual;
//   · alvo de toque grande, uma pergunta por vez, sem rolagem para responder;
//   · botão de ouvir a pergunta em voz alta.
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
import { itensDe, opcoesDoItem, type InstrumentDef } from '../services/psychosocialInstruments';
import { EscalaVisual } from './EscalaVisual';
// Primitivas de fala do Body Scan: são genéricas apesar da pasta, e carregam
// a descoberta de que a Web Speech API não funciona dentro da WebView do
// Android (precisa do TTS nativo). Reescrever isso aqui daria um leitor mudo
// justamente no aparelho mais comum do público-alvo.
import { announce, primeVoice, stopSpeaking } from '../services/bodyscan/voiceGuide';

const PETROL = '#7d4a3c';

interface Props {
  def: InstrumentDef;
  /** Trava os botões enquanto o pai grava a resposta. */
  enviando: boolean;
  /** Recebe as respostas cruas (chave do item → valor original da opção). */
  onConcluir: (answers: Record<string, number>) => void;
  /** Quando existe, mostra o "Depois" no canto. */
  onAdiar?: () => void;
}

export const InstrumentoQuestionario: React.FC<Props> = ({
  def, enviando, onConcluir, onAdiar,
}) => {
  const itens = useMemo(() => itensDe(def), [def]);

  const [idx, setIdx] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [pendente, setPendente] = useState<number | null>(null);
  const [falando, setFalando] = useState(false);

  // Só oferece o áudio onde existe motor de fala. No nativo sempre existe;
  // no navegador, depende.
  const temVoz = useMemo(
    () => Capacitor.isNativePlatform()
      || (typeof window !== 'undefined' && 'speechSynthesis' in window),
    [],
  );

  // Nada toca sozinho: o questionário é respondido no trabalho, e uma voz
  // dizendo "eu me senti calmo e relaxado" na frente dos colegas quebra o
  // sigilo que a tela inteira promete. Só fala quando a pessoa pede.
  useEffect(() => () => { stopSpeaking(); }, []);

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
      await announce([
        bloco?.intro,
        item.texto,
        'Opções: ' + opcoes.map(o => o.label).join('. '),
      ].filter(Boolean).join('. '));
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
    onConcluir(proximas);
  };

  return (
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
          {onAdiar && (
            <button
              onClick={onAdiar}
              className="text-xs text-Malama-muted dark:text-slate-500 flex-shrink-0"
            >
              Depois
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mb-5">
          <p className="text-xs text-Malama-muted dark:text-slate-500">
            Pergunta {idx + 1} de {itens.length}
          </p>

          {temVoz && (
            <button
              onClick={ouvir}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors"
              style={{
                borderColor: falando ? PETROL : 'rgba(120,113,108,0.25)',
                color: falando ? PETROL : undefined,
              }}
              aria-label={falando ? 'Parar a leitura' : 'Ouvir a pergunta em voz alta'}
            >
              <span className="material-symbols-outlined text-base">
                {falando ? 'stop_circle' : 'volume_up'}
              </span>
              <span className="text-xs font-medium">{falando ? 'Parar' : 'Ouvir'}</span>
            </button>
          )}
        </div>

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
            className="text-xl font-semibold text-Malama-main dark:text-white leading-snug mb-6"
          >
            {item.texto}
          </motion.h2>
        </AnimatePresence>

        <div className="space-y-2">
          {opcoes.map((op, i) => {
            const ativo = pendente === op.value;
            return (
              <button
                key={op.value}
                onClick={() => escolher(op.value)}
                disabled={enviando}
                // min-h de 60px: alvo de toque para mão grande, com luva ou
                // aparelho pequeno — errar a opção aqui é resposta errada
                // gravada, não só um incômodo.
                className="w-full flex items-center gap-3 text-left px-3 py-3 min-h-[60px] rounded-2xl border-2 transition-all disabled:opacity-50"
                style={{
                  borderColor: ativo ? PETROL : 'rgba(120,113,108,0.2)',
                  background: ativo ? `${PETROL}10` : 'transparent',
                  color: ativo ? PETROL : 'rgba(120,113,108,0.85)',
                }}
                aria-label={op.label}
              >
                {bloco && (
                  <EscalaVisual
                    tipo={bloco.escalaVisual}
                    indice={i}
                    total={opcoes.length}
                    ativo={ativo}
                  />
                )}
                <span className="text-base font-medium text-Malama-main dark:text-white">
                  {op.label}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-Malama-muted dark:text-slate-500 mt-5 leading-snug">
          Ninguém da sua empresa vê o que você respondeu.
        </p>
      </div>
    </>
  );
};
