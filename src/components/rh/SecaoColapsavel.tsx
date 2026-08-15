// =====================================================
// Malama — Seções recolhíveis do painel do RH
//
// O dashboard cresceu para várias telas de altura e empurrava o guia e o
// ritmo do ciclo para fora do campo de visão. As seções operacionais nascem
// recolhidas — mas com duas exceções que não podem falhar:
//
//   1. seção vazia fica ABERTA, porque é justamente um passo do onboarding;
//   2. seção que é destino de âncora ABRE ao receber a navegação, senão o
//      botão do guia levaria a pessoa até um card fechado.
// =====================================================

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Estado de abertura de uma seção com âncora.
 * @param hashAlvo âncora que abre a seção (ex.: '#setores')
 * @param abrirSozinha condição que força a seção aberta (em geral "está vazia")
 */
export function useSecaoAberta(hashAlvo: string, abrirSozinha: boolean) {
  const { hash, key } = useLocation();
  const [aberto, setAberto] = useState(abrirSozinha);

  // `key` junto do hash: clicar duas vezes no mesmo passo do guia precisa
  // reabrir a seção, e aí só a chave da navegação muda.
  useEffect(() => {
    if (hash === hashAlvo) setAberto(true);
  }, [hash, key, hashAlvo]);

  // Só abre, nunca fecha: quem recolheu de propósito não quer a seção
  // voltando sozinha a cada recarga de dado.
  useEffect(() => {
    if (abrirSozinha) setAberto(true);
  }, [abrirSozinha]);

  return [aberto, setAberto] as const;
}

/** Cabeçalho-botão da seção. Fica só do lado esquerdo para o card poder ter
 *  ações próprias à direita — botão dentro de botão não é clicável. */
export const CabecalhoColapsavel: React.FC<{
  icone: React.ReactNode;
  titulo: string;
  contagem?: number | string;
  aberto: boolean;
  onToggle: () => void;
  /** Sem conteúdo para esconder: o cabeçalho vira texto, não botão. */
  desabilitado?: boolean;
}> = ({ icone, titulo, contagem, aberto, onToggle, desabilitado }) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={desabilitado}
    aria-expanded={aberto}
    className="-m-1 flex items-center gap-2 rounded-lg p-1 text-left transition hover:bg-gray-50 disabled:cursor-default disabled:hover:bg-transparent"
  >
    {icone}
    <h2 className="font-semibold text-gray-800">{titulo}</h2>
    {contagem !== undefined && <span className="text-xs text-gray-400">{contagem}</span>}
    {!desabilitado && (
      aberto
        ? <ChevronUp className="h-4 w-4 text-gray-400" />
        : <ChevronDown className="h-4 w-4 text-gray-400" />
    )}
  </button>
);

/** Faixa clicável que substitui o corpo recolhido. Mantém a seção legível de
 *  relance sem ocupar tela: sem ela, recolher vira perda de informação. */
export const ResumoRecolhido: React.FC<{ onAbrir: () => void; children: React.ReactNode }> = ({ onAbrir, children }) => (
  <button
    type="button"
    onClick={onAbrir}
    className="mt-2 w-full rounded-lg px-1 py-2 text-left text-xs leading-relaxed text-gray-500 transition hover:bg-gray-50"
  >
    {children}
  </button>
);
