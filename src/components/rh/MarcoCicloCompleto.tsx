// =====================================================
// Malama — Marco: o primeiro ciclo fechou
//
// O checklist antigo chegava a 4 de 4 e se recolhia em silêncio. Quando o
// ciclo inteiro fecha de verdade — medição aplicada, resultado lido,
// conversa feita, medida registrada e concluída COM evidência — o produto
// nunca marcava o momento. É justamente a batida em que o cliente percebe
// que recebeu o que comprou, e a lembrança que ele leva para a conversa de
// renovação.
//
// Sem confete e sem "parabéns": o interlocutor aqui é quem responde por
// segurança e saúde numa fiscalização. O que soa a conquista para essa
// pessoa é a frase de que existe o que mostrar — e o botão que produz o
// documento. Também não afirma conformidade: o dossiê mostra o estado das
// evidências, e a leitura oficial continua sendo do SESMT.
// =====================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FolderCheck } from 'lucide-react';
import { cicloCompleto, type DadosJornada } from '../../lib/rhJornada';

export const MarcoCicloCompleto: React.FC<{ dados: DadosJornada }> = ({ dados }) => {
  if (!cicloCompleto(dados)) return null;

  // Sem permissão de compliance não há para onde mandar: o marco vira uma
  // frase, e não um botão que devolve "acesso negado".
  const podeAbrirDossie = dados.pode.vePlanos && dados.pode.veCampanhas;

  return (
    <section
      aria-labelledby="marco-titulo"
      className="rounded-xl border border-green-200 bg-green-50 p-5"
    >
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600/10 text-green-700">
            <FolderCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Ciclo completo
            </p>
            <h2 id="marco-titulo" className="mt-0.5 text-lg font-semibold text-green-900">
              Sua empresa tem o ciclo inteiro documentado
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-green-800">
              Medição aplicada, resultado lido, conversa registrada com a liderança e ao menos uma
              medida concluída com evidência anexada. Se a fiscalização perguntar hoje, existe o
              que mostrar — e o documento sai com número, data e selo de verificação.
            </p>
          </div>
        </div>
        {podeAbrirDossie && (
          <Link
            to="/rh/compliance"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800"
          >
            Gerar o documento <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </section>
  );
};
