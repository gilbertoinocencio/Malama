// =====================================================
// Malama — O trilho do ciclo, no dashboard
//
// A faixa do cabeçalho mostra UM passo. O card mostra esse passo com
// descrição. Nenhum dos dois jamais mostrou o caminho inteiro — então o RH
// sabia o que fazer agora e não fazia ideia de onde isso ia dar, nem de
// quanto já tinha andado. Em produto de conformidade essa cegueira é cara:
// a sensação de "não estou saindo do lugar" é o que precede o cancelamento.
//
// O que está por vir aparece apagado, mas aparece. Esconder o futuro
// deixaria o trilho mais limpo e tiraria justamente a informação que o RH
// leva para a reunião com a diretoria.
// =====================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import {
  cicloCompleto, etapasDaJornada, type DadosJornada, type EtapaJornada,
} from '../../lib/rhJornada';

/** Cumprida vira ✓; pendente vira o número. O destaque de "é aqui que você
 *  está" é o anel, aplicado por fora — uma etapa pode estar cumprida E ser
 *  a atual, porque o ciclo se repete. */
const Marcador: React.FC<{ etapa: EtapaJornada; numero: number }> = ({ etapa, numero }) => (
  <span
    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
      etapa.ok
        ? 'bg-green-600 text-white'
        : etapa.atual
          ? 'bg-[#7d4a3c] text-white'
          : 'border border-gray-300 bg-white font-semibold text-gray-400'
    } ${etapa.atual ? 'ring-2 ring-[#7d4a3c]/30 ring-offset-1' : ''}`}
  >
    {etapa.ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : numero}
  </span>
);

export const TrilhoDaJornada: React.FC<{ dados: DadosJornada }> = ({ dados }) => {
  const etapas = etapasDaJornada(dados);
  // Depois que todas as etapas foram cumpridas ao menos uma vez, o trilho
  // vira uma fileira permanente de ✓ verdes — e pior: dá visto em "Medidas"
  // no mesmo painel em que o Ritmo do ciclo sinaliza medida fora do prazo.
  // Ele parabeniza no exato tópico em que os outros blocos avisam atraso.
  //
  // Então ele se recolhe. O que ele respondia daí em diante ("onde estou no
  // ciclo") passou a ser respondido melhor pelo Ritmo do ciclo, que está no
  // mesmo card e tem datas. Enquanto o primeiro ciclo não fecha, o trilho
  // continua aberto: ali ele mostra o que FALTA, que é informação de fato.
  const completo = cicloCompleto(dados);
  const [aberto, setAberto] = useState(!completo);
  if (etapas.length === 0) return null;

  const concluidas = etapas.filter(e => e.ok).length;

  return (
    <section aria-labelledby="trilho-titulo">
      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        aria-expanded={aberto}
        className="mb-2.5 flex w-full flex-wrap items-baseline justify-between gap-2 text-left"
      >
        <h3 id="trilho-titulo" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          O ciclo da sua empresa
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition ${aberto ? 'rotate-180' : ''}`} />
        </h3>
        <span className="text-xs text-gray-500">
          {concluidas} de {etapas.length} etapas cumpridas
        </span>
      </button>
      {aberto && (<>

      {/* Rolagem horizontal no celular: oito etapas não cabem em 390px, e
          quebrar em duas linhas desfaz a leitura de sequência. */}
      <ol className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {etapas.map((etapa, i) => (
          <li key={etapa.chave} className="flex shrink-0 items-center">
            <Link
              to={etapa.destino}
              aria-current={etapa.atual ? 'step' : undefined}
              className={`flex min-w-[8.5rem] items-start gap-2 rounded-lg border px-2.5 py-2 transition ${
                etapa.atual
                  ? 'border-[#7d4a3c]/40 bg-[#7d4a3c]/5'
                  : etapa.ok
                    ? 'border-gray-100 bg-white hover:bg-gray-50'
                    : 'border-dashed border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <Marcador etapa={etapa} numero={i + 1} />
              <span className="min-w-0">
                <span className={`block text-xs font-semibold ${
                  !etapa.ok && !etapa.atual ? 'text-gray-400' : 'text-gray-800'
                }`}>
                  {etapa.nome}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-gray-400">
                  {etapa.resumo}
                </span>
              </span>
            </Link>
            {i < etapas.length - 1 && (
              <ChevronRight className="mx-0.5 h-3.5 w-3.5 shrink-0 text-gray-300" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>

      <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
        O ciclo não termina na última etapa: ele recomeça na próxima janela de medição. É a
        repetição que comprova que a medida funcionou.
      </p>
      </>)}
    </section>
  );
};
