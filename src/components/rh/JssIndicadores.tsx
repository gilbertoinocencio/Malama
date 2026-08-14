// =====================================================
// Malama — Indicadores gerais da JSS (exposição ocupacional)
//
// Quem lê este painel é RH e SST, não quem conhece a Job Stress Scale.
// Um número solto ("Controle 50") não informa nada: o card precisa dizer
// o que o indicador mede, para que lado ele piora e de onde ele vem.
//
// Regra de honestidade estatística: a JSS brasileira não tem ponto de
// corte normativo consagrado. Por isso nenhum card classifica o valor
// absoluto como bom ou ruim — a única referência exibida é a mediana dos
// respondentes do período, a mesma que classifica os quadrantes.
// =====================================================

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, TrendingDown, TrendingUp, Users } from 'lucide-react';
import type { JssCortes, JssGeral } from '../../services/empresaService';
import { JSS_METRICAS, type JssMetricaKey } from '../../lib/jssInsights';

type JssGeralPublicado = Extract<JssGeral, { indice_medio: number }>;

const COR_ADVERSO = '#c2603f';
const COR_PROTETOR = '#548064';

/** Régua 0–100 com marca na mediana do período, quando ela existe. */
const Regua: React.FC<{ valor: number; mediana?: number | null; cor: string }> = ({
  valor, mediana, cor,
}) => (
  <div className="relative mt-2 h-1.5 w-full rounded-full bg-gray-100">
    <div className="h-full rounded-full" style={{ width: `${valor}%`, background: cor }} />
    {mediana != null && (
      <span
        className="absolute -top-1 h-3.5 w-px bg-gray-500"
        style={{ left: `${mediana}%` }}
        title={`Mediana dos respondentes no período: ${mediana}`}
      />
    )}
  </div>
);

const CardMetrica: React.FC<{
  chave: JssMetricaKey;
  valor: number;
  mediana?: number | null;
}> = ({ chave, valor, mediana }) => {
  const m = JSS_METRICAS[chave];
  const adverso = m.sentido === 'adverso';
  const cor = adverso ? COR_ADVERSO : COR_PROTETOR;
  const Icone = adverso ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-gray-700">{m.label}</p>
        <span
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium"
          style={{ color: cor, background: `${cor}14` }}
        >
          <Icone className="h-3 w-3" />
          {m.sentidoLabel}
        </span>
      </div>

      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-800">
        {valor}
        <span className="ml-1 text-xs font-normal text-gray-400">/100</span>
      </p>

      <Regua valor={valor} mediana={mediana} cor={cor} />
      <p className="mt-1 text-[10px] text-gray-400">
        {mediana != null
          ? `Mediana dos respondentes no período: ${mediana}`
          : 'Sem referência do período para comparar.'}
      </p>

      <p className="mt-2 text-xs leading-relaxed text-gray-600">{m.resumo}</p>
    </div>
  );
};

export const JssIndicadores: React.FC<{
  geral: JssGeralPublicado;
  cortes?: JssCortes | null;
  kMin: number;
}> = ({ geral, cortes, kMin }) => {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="mb-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-gray-400" />
            <p className="text-xs font-semibold text-gray-700">Respondentes</p>
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-800">
            {geral.n_respondentes}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">
            Colaboradores que responderam ao questionário no período — não é o total de
            convidados. A taxa de adesão fica na seção de campanhas, acima.
          </p>
        </div>

        <div className="rounded-lg border p-3" style={{ borderColor: '#e6d8d2', background: '#faf5f3' }}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-[#7d4a3c]">{JSS_METRICAS.indice.label}</p>
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#7d4a3c]">
              <TrendingUp className="h-3 w-3" />
              {JSS_METRICAS.indice.sentidoLabel}
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[#7d4a3c]">
            {geral.indice_medio}
            <span className="ml-1 text-xs font-normal text-[#a98a7e]">/100</span>
          </p>
          <Regua valor={geral.indice_medio} cor="#7d4a3c" />
          <p className="mt-1 text-[10px] text-[#a98a7e]">
            Média da empresa no período, em escala de 0 a 100.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">
            {JSS_METRICAS.indice.resumo}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <CardMetrica chave="demanda" valor={geral.demanda_medio} mediana={cortes?.demanda} />
        <CardMetrica chave="controle" valor={geral.controle_medio} mediana={cortes?.controle} />
        <CardMetrica chave="apoio" valor={geral.apoio_medio} mediana={cortes?.apoio} />
      </div>

      <button
        onClick={() => setAberto(a => !a)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#7d4a3c] hover:underline"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        Como ler estes números
        {aberto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {aberto && (
        <div className="mt-3 space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              O que é a JSS
            </p>
            <p className="mt-1">
              Job Stress Scale, versão resumida validada para o português (Alves e cols.,
              Rev. Saúde Pública, 2004), baseada no modelo demanda-controle-apoio de
              Karasek e Theorell. São 17 perguntas respondidas pelo colaborador a cada seis
              meses. O instrumento avalia <strong>o trabalho</strong> — organização, ritmo,
              autonomia e relações —, não o estado de saúde da pessoa. Quem mede a pessoa é
              o WHO-5, no card de bem-estar.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Por que tudo aparece de 0 a 100
            </p>
            <p className="mt-1">
              Cada resposta vale de 1 a 4 e cada dimensão tem um número diferente de
              perguntas (5, 6 e 6). Para que demanda, controle e apoio possam ser
              comparados na mesma régua, a soma de cada dimensão é convertida para uma
              escala de 0 a 100. Não é porcentagem de pessoas nem nota de prova: é
              posição na escala do instrumento.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              O que cada indicador mede
            </p>
            <dl className="mt-1 space-y-2">
              {(['demanda', 'controle', 'apoio', 'indice'] as JssMetricaKey[]).map(k => {
                const m = JSS_METRICAS[k];
                return (
                  <div key={k}>
                    <dt className="font-semibold text-gray-700">
                      {m.label}
                      <span className="ml-2 font-normal text-gray-400">{m.pergunta}</span>
                    </dt>
                    <dd className="text-gray-600">{m.composicao}</dd>
                  </div>
                );
              })}
            </dl>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              A referência é interna, não uma nota de corte oficial
            </p>
            <p className="mt-1">
              A JSS não tem ponto de corte normativo consagrado no Brasil. A marca cinza na
              régua e os quadrantes do gráfico usam a <strong>mediana dos respondentes deste
              período</strong>: comparam os setores entre si, dentro da própria empresa. Isso
              tem duas consequências práticas — sempre haverá setores acima da mediana,
              mesmo numa empresa saudável, e a referência muda quando a população muda. Use
              o painel para priorizar por onde investigar, não para dar aprovação ou
              reprovação a um setor.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              O que aparece e o que é suprimido
            </p>
            <p className="mt-1">
              Recortes com menos de {kMin} respondentes não são exibidos, para que nenhum
              resultado possa ser atribuído a uma pessoa. Nada aqui é individual, nem para o
              RH nem para a liderança.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              O que fazer com isso
            </p>
            <p className="mt-1">
              O resultado é evidência para o inventário de riscos psicossociais do PGR
              (NR-1) e ponto de partida para a escuta do trabalho real. A JSS aponta onde
              olhar e em qual eixo (cobrança, autonomia ou suporte); ela não confirma
              assédio, adoecimento nem nexo causal, e não substitui PGR, PCMSO ou a
              avaliação do SESMT.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
