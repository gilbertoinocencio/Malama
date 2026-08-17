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

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FolderCheck } from 'lucide-react';
import { cicloCompleto, type DadosJornada } from '../../lib/rhJornada';
import { rhService, type ComplianceDoc } from '../../services/empresaService';

const fmtData = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const MarcoCicloCompleto: React.FC<{ dados: DadosJornada }> = ({ dados }) => {
  // Sem permissão de compliance não há para onde mandar: o marco vira uma
  // frase, e não um botão que devolve "acesso negado".
  const podeAbrirDossie = dados.pode.vePlanos && dados.pode.veCampanhas;
  const completo = cicloCompleto(dados);

  // O marco não sabia se o documento já tinha sido emitido, então continuava
  // dizendo "gerar" para sempre — inclusive depois de o RH gerar. Com o
  // último documento em mãos ele passa a confirmar o que existe, que é o
  // que o RH leva para a diretoria.
  const [ultimo, setUltimo] = useState<ComplianceDoc | null>(null);
  useEffect(() => {
    if (!completo || !podeAbrirDossie) return;
    let cancelado = false;
    rhService.getComplianceDocs()
      .then(lista => { if (!cancelado) setUltimo(lista[0] ?? null); })
      .catch(() => { /* sem o histórico o marco só oferece gerar */ });
    return () => { cancelado = true; };
  }, [completo, podeAbrirDossie]);

  if (!completo) return null;

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
              medida concluída com evidência anexada. Daqui sai o{' '}
              <strong>Relatório de evidência do programa</strong>, com número, data e selo de
              verificação — a peça que entra no <strong>PGR</strong> da sua empresa. Ele não é o
              PGR nem substitui o seu.
            </p>
            {ultimo && (
              <p className="mt-2 text-xs text-green-800">
                Último emitido: <strong>{ultimo.numero_doc}</strong> em {fmtData(ultimo.emitido_em)}.
                Gere de novo quando os números mudarem.
              </p>
            )}
          </div>
        </div>
        {podeAbrirDossie && (
          <Link
            to="/rh/compliance#relatorio-evidencia"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800"
          >
            {ultimo ? 'Emitir nova versão' : 'Gerar o relatório de evidência'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </section>
  );
};
