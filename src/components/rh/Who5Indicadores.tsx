// =====================================================
// Malama — Indicadores gerais do WHO-5 (bem-estar)
//
// Dois cuidados que a versão anterior deste bloco não tinha:
//
//  1. "Bem-estar reduzido 9" era ambíguo — pode ser lido como escore ou
//     percentual. É CONTAGEM DE PESSOAS (score < 50). O card diz isso, e
//     mostra a proporção ao lado para dar tamanho.
//  2. As duas faixas se sobrepõem: quem está <= 28 também está < 50. Sem
//     avisar, o RH soma as duas e infla o próprio problema.
//
// Aqui, ao contrário da JSS, os pontos de corte SÃO normativos (OMS), e
// por isso podem ser exibidos como referência absoluta.
// =====================================================

import React from 'react';
import { AlertTriangle, TrendingUp, Users } from 'lucide-react';
import type { PsychosocialGeral } from '../../services/empresaService';
import { BlocoExplicativo, ComoLer, Regua } from './indicadoresUi';

type Who5GeralPublicado = Extract<PsychosocialGeral, { score_medio: number }>;

export const WHO5_CORTE_REDUZIDO = 50;
export const WHO5_CORTE_ATENCAO = 28;

const pct = (parte: number, total: number) =>
  total > 0 ? Math.round((parte / total) * 100) : 0;

/** Card de contagem de pessoas em uma faixa do escore. */
const CardFaixa: React.FC<{
  titulo: string;
  criterio: string;
  explicacao: string;
  valor: number;
  total: number;
  cor: string;
  alerta?: boolean;
}> = ({ titulo, criterio, explicacao, valor, total, cor, alerta }) => {
  const proporcao = pct(valor, total);
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-gray-700">{titulo}</p>
        <span
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium"
          style={{ color: cor, background: `${cor}14` }}
        >
          {alerta && <AlertTriangle className="h-3 w-3" />}
          {criterio}
        </span>
      </div>

      <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: cor }}>
        {valor}
        <span className="ml-1 text-xs font-normal text-gray-400">
          {valor === 1 ? 'pessoa' : 'pessoas'}
        </span>
      </p>

      <Regua valor={proporcao} cor={cor} />
      <p className="mt-1 text-[10px] text-gray-400">
        {proporcao}% dos {total} respondentes
      </p>

      <p className="mt-2 text-xs leading-relaxed text-gray-600">{explicacao}</p>
    </div>
  );
};

export const Who5Indicadores: React.FC<{
  geral: Who5GeralPublicado;
  kMin: number;
}> = ({ geral, kMin }) => (
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
          Quantas pessoas responderam no período. Não é o total de convidados: se poucas
          responderam, o resultado fala de quem respondeu, não da empresa inteira.
        </p>
      </div>

      <div className="rounded-lg border p-3" style={{ borderColor: '#e6d8d2', background: '#faf5f3' }}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-[#7d4a3c]">Índice médio de bem-estar</p>
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#7d4a3c]">
            <TrendingUp className="h-3 w-3" />
            Maior = melhor
          </span>
        </div>
        <p className="mt-1 text-2xl font-bold tabular-nums text-[#7d4a3c]">
          {geral.score_medio}
          <span className="ml-1 text-xs font-normal text-[#a98a7e]">/100</span>
        </p>
        <Regua
          valor={geral.score_medio} cor="#7d4a3c" marca={WHO5_CORTE_REDUZIDO}
          marcaTitulo={`Marca cinza: ${WHO5_CORTE_REDUZIDO}. Abaixo disso, o bem-estar é considerado baixo.`}
        />
        <p className="mt-1 text-[10px] text-[#a98a7e]">
          A marca na régua é o {WHO5_CORTE_REDUZIDO}: abaixo dele, o bem-estar é baixo.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-gray-600">
          É a média de todo mundo que respondeu. Cuidado: a média sozinha esconde os
          extremos — um grupo muito mal pode ficar escondido atrás de outro muito bem. Por
          isso os dois números abaixo existem.
        </p>
      </div>
    </div>

    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <CardFaixa
        titulo="Bem-estar reduzido"
        criterio={`Nota abaixo de ${WHO5_CORTE_REDUZIDO}`}
        explicacao="Quantas pessoas tiraram menos que 50 no período. Não é diagnóstico de nada: é o sinal de que essas pessoas não estão bem."
        valor={geral.faixa_reduzido}
        total={geral.n_respondentes}
        cor="#c2603f"
      />
      <CardFaixa
        titulo="Faixa de atenção"
        criterio={`Nota ${WHO5_CORTE_ATENCAO} ou menos`}
        explicacao="Nota muito baixa — é o ponto em que se recomenda oferecer uma conversa com profissional. Estas pessoas já estão contadas ao lado, em bem-estar reduzido: os dois números não se somam."
        valor={geral.faixa_risco}
        total={geral.n_respondentes}
        cor="#d03b3b"
        alerta
      />
    </div>

    <ComoLer>
      <BlocoExplicativo titulo="O que é este questionário">
        <p>
          São 5 frases sobre <strong>as últimas duas semanas</strong> — bom humor,
          tranquilidade, energia, sono e interesse pelas coisas do dia a dia. A pessoa marca
          com que frequência se sentiu assim. Mostra <strong>como a pessoa está</strong>, e
          não o que no trabalho pesa sobre ela — isso é o outro questionário, o de carga de
          trabalho. O nome técnico dele é WHO-5, da Organização Mundial da Saúde.
        </p>
      </BlocoExplicativo>

      <BlocoExplicativo titulo="Como sai a nota de 0 a 100">
        <p>
          Cada uma das 5 respostas vale de 0 a 5. Somando as cinco dá de 0 a 25, e esse
          total é multiplicado por 4 para virar uma nota de 0 a 100. Não é porcentagem de
          pessoas: 0 é o pior possível e 100 é o melhor possível.
        </p>
      </BlocoExplicativo>

      <BlocoExplicativo titulo="As duas linhas que separam as faixas">
        <p>
          <strong>Abaixo de {WHO5_CORTE_REDUZIDO}</strong> — bem-estar baixo. É a linha usada
          no mundo todo para esse questionário. Mostra que a pessoa não está bem, sem dizer
          o motivo.
          <br />
          <strong>{WHO5_CORTE_ATENCAO} ou menos</strong> — faixa de atenção. É a nota em que
          se recomenda oferecer uma conversa com profissional para olhar melhor. Não é
          diagnóstico, e o painel nunca mostra quem está aí: o número serve para saber o
          tamanho da necessidade, não para procurar pessoas.
        </p>
      </BlocoExplicativo>

      <BlocoExplicativo titulo="Por que os dois números se misturam">
        <p>
          Quem tirou {WHO5_CORTE_ATENCAO} ou menos também está abaixo de{' '}
          {WHO5_CORTE_REDUZIDO}. Ou seja: o pessoal da faixa de atenção já está contado
          dentro do bem-estar baixo, e{' '}
          <strong>somar os dois é contar as mesmas pessoas duas vezes</strong>. Para saber
          quantas estão abaixo de 50 mas fora da faixa de atenção, é só subtrair um número
          do outro.
        </p>
      </BlocoExplicativo>

      <BlocoExplicativo titulo="O que aparece e o que fica de fora">
        <p>
          Grupos com menos de {kMin} respostas não aparecem, para que ninguém consiga
          descobrir quem respondeu o quê. O RH e a chefia nunca veem resposta de uma pessoa,
          nem sabem quem respondeu o quê.
        </p>
      </BlocoExplicativo>

      <BlocoExplicativo titulo="O que fazer com isso">
        <p>
          Este questionário mostra quantas pessoas não estão bem, mas não diz o porquê. Para
          saber o quanto disso vem do trabalho, olhe o gráfico que cruza os dois
          questionários, acima. O resultado ajuda a empresa a cuidar dos riscos
          psicossociais que a NR-1 cobra, e não substitui o PGR, o PCMSO nem a avaliação de
          um profissional de saúde.
        </p>
      </BlocoExplicativo>
    </ComoLer>
  </div>
);
