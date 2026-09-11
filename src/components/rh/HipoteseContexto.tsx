// =====================================================
// Malama — Contexto de uma hipótese, "mastigado" para o RH
//
// Três blocos, sempre nesta ordem, porque é a ordem em que devem ser lidos:
//   1. Antes de interpretar — os confundidores (pico sazonal, evento da
//      empresa, calor). Vêm ANTES do número de propósito: quem lê a
//      convergência primeiro já decidiu.
//   2. Outros dados na mesma direção — afastamentos por capítulo F e
//      ambulatório por ansiedade/estresse. É o argumento que o RH usa para
//      justificar a medida. Sempre dito como convergência, nunca como causa.
//   3. Como o setor trabalha — a organização declarada, em uma linha.
//
// Usado no briefing (Início) e no plano de ação (formulário e detalhe da
// medida). Mesmo componente para as duas telas dizerem a mesma coisa.
// =====================================================

import React from 'react';
import { AlertTriangle, Link2, Building2 } from 'lucide-react';

export const HipoteseContexto: React.FC<{
  ressalvas?: string[] | null;
  convergencias?: string[] | null;
  contextoSetor?: string | null;
  /** 'card' = dentro do card colorido do briefing (usa currentColor);
   *  'painel' = fundo branco do plano de ação. */
  variante?: 'card' | 'painel';
}> = ({ ressalvas, convergencias, contextoSetor, variante = 'painel' }) => {
  const temRessalva = (ressalvas?.length ?? 0) > 0;
  const temConvergencia = (convergencias?.length ?? 0) > 0;
  if (!temRessalva && !temConvergencia && !contextoSetor) return null;

  const noCard = variante === 'card';
  const titulo = noCard
    ? 'mt-2 flex items-center gap-1 text-[11px] font-semibold opacity-80'
    : 'flex items-center gap-1.5 text-xs font-semibold';
  const lista = noCard
    ? 'mt-1 space-y-1 text-[11px] leading-relaxed opacity-75'
    : 'mt-1.5 space-y-1.5 text-xs leading-relaxed';

  return (
    <div className={noCard ? '' : 'space-y-3'}>
      {temRessalva && (
        <div className={noCard ? '' : 'rounded-lg border border-amber-200 bg-amber-50 p-3'}>
          <p className={`${titulo} ${noCard ? '' : 'text-amber-900'}`}>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Antes de interpretar
          </p>
          <ul className={`${lista} ${noCard ? '' : 'text-amber-900/90'}`}>
            {ressalvas!.map(r => <li key={r} className="flex gap-1.5"><span aria-hidden>·</span><span>{r}</span></li>)}
          </ul>
        </div>
      )}
      {temConvergencia && (
        <div className={noCard ? '' : 'rounded-lg border border-[#7d4a3c]/20 bg-[#7d4a3c]/5 p-3'}>
          <p className={`${titulo} ${noCard ? '' : 'text-[#7d4a3c]'}`}>
            <Link2 className="h-3.5 w-3.5 shrink-0" /> Outros dados da empresa na mesma direção
          </p>
          <ul className={`${lista} ${noCard ? '' : 'text-gray-700'}`}>
            {convergencias!.map(c => <li key={c} className="flex gap-1.5"><span aria-hidden>·</span><span>{c}</span></li>)}
          </ul>
          {!noCard && (
            <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
              Convergência fortalece a prioridade de investigar. Não é prova de que a causa está no trabalho, e a ausência de registro não descarta nada.
            </p>
          )}
        </div>
      )}
      {contextoSetor && (
        <p className={noCard
          ? 'mt-2 flex items-start gap-1 text-[11px] leading-relaxed opacity-70'
          : 'flex items-start gap-1.5 text-xs leading-relaxed text-gray-500'}>
          <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span><span className="font-semibold">Como o setor trabalha:</span> {contextoSetor}</span>
        </p>
      )}
    </div>
  );
};
