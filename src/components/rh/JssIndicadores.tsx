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

import React from 'react';
import { TrendingDown, TrendingUp, Users } from 'lucide-react';
import type { JssCortes, JssGeral } from '../../services/empresaService';
import { JSS_METRICAS, type JssMetricaKey } from '../../lib/jssInsights';
import { BlocoExplicativo, ComoLer, Regua } from './indicadoresUi';

type JssGeralPublicado = Extract<JssGeral, { indice_medio: number }>;

const COR_ADVERSO = '#c2603f';
const COR_PROTETOR = '#548064';

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

      <Regua
        valor={valor} cor={cor} marca={mediana}
        marcaTitulo={mediana != null
          ? `Marca cinza: ${mediana}, o valor do meio entre quem respondeu neste período`
          : undefined}
      />
      <p className="mt-1 text-[10px] text-gray-400">
        {mediana != null
          ? `Meio da empresa neste período: ${mediana}`
          : 'Sem referência neste período para comparar.'}
      </p>

      <p className="mt-2 text-xs leading-relaxed text-gray-600">{m.resumo}</p>
    </div>
  );
};

export const JssIndicadores: React.FC<{
  geral: JssGeralPublicado;
  cortes?: JssCortes | null;
  kMin: number;
}> = ({ geral, cortes, kMin }) => (
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
          Quantas pessoas responderam ao questionário no período. Não é o total de convidados —
          quantos foram convidados e quantos responderam fica na parte de campanhas, acima.
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
          Média da empresa no período, numa régua de 0 a 100.
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

    <ComoLer>
      <BlocoExplicativo titulo="O que é este questionário">
        <p>
          São 17 perguntas que o colaborador responde a cada três meses sobre o dia a dia
          do trabalho dele: o ritmo, a liberdade para decidir e o apoio que recebe de
          colegas e da chefia. Ele fala <strong>do trabalho</strong>, não da saúde da
          pessoa — quem pergunta como a pessoa está é o outro questionário, o de
          bem-estar. O nome técnico dele é Job Stress Scale (JSS), usado e validado no
          Brasil desde 2004.
        </p>
      </BlocoExplicativo>

      <BlocoExplicativo titulo="Por que tudo vai de 0 a 100">
        <p>
          Cada resposta vale de 1 a 4, e cada grupo tem uma quantidade diferente de
          perguntas (5, 6 e 6). Para dar para comparar os três na mesma régua, tudo é
          convertido para uma nota de 0 a 100. Não é porcentagem de pessoas nem nota de
          prova: é só a posição na régua.
        </p>
      </BlocoExplicativo>

      <BlocoExplicativo titulo="O que cada número quer dizer">
        <dl className="space-y-2">
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
      </BlocoExplicativo>

      <BlocoExplicativo titulo="A comparação é entre os seus setores">
        <p>
          Não existe uma nota oficial de “aprovado” ou “reprovado” nesse questionário. A
          marca cinza na régua e as linhas do gráfico são o{' '}
          <strong>valor do meio da sua empresa neste período</strong>: metade dos setores
          fica acima, metade abaixo. Duas coisas seguem disso — sempre vai ter setor dos
          dois lados da linha, mesmo numa empresa boa, e a linha muda quando muda o grupo
          que respondeu. Serve para escolher por onde começar, não para dar nota a um setor.
        </p>
      </BlocoExplicativo>

      <BlocoExplicativo titulo="O que aparece e o que fica de fora">
        <p>
          Grupos com menos de {kMin} respostas não aparecem, para que ninguém consiga
          descobrir quem respondeu o quê. Nada aqui é individual — nem para o RH, nem para
          a chefia.
        </p>
      </BlocoExplicativo>

      <BlocoExplicativo titulo="O que fazer com isso">
        <p>
          Serve como prova de que a empresa olhou para os riscos psicossociais, entrando no
          PGR (a NR-1 pede isso), e como ponto de partida para conversar com as pessoas.
          Mostra onde olhar e o quê: cobrança, autonomia ou apoio. Não prova que houve
          assédio, não diz que alguém adoeceu por causa do trabalho e não substitui o PGR, o
          PCMSO nem o médico do trabalho.
        </p>
      </BlocoExplicativo>
    </ComoLer>
  </div>
);
