// =====================================================
// Malama — Matriz de risco psicossocial por setor (NR-1)
//
// Cruza os dois eixos: exposição ocupacional (JSS) no X, bem-estar (WHO-5)
// no Y. O quadrante é dado pela POSIÇÃO — é o que a matriz existe para
// mostrar. Os pontos usam uma cor só de propósito: colori-los por quadrante
// duplicaria a posição num canal que falha em daltonismo (verde "estável" e
// vermelho "crítico" ficam a ΔE 4,1 em deuteranopia). A cor de status
// aparece só nos rótulos das regiões e na tabela, sempre com texto ao lado.
//
// Toda leitura tem gêmeo em tabela — nenhum valor existe só no gráfico.
// =====================================================

import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ReferenceArea,
  ReferenceLine, Tooltip, ResponsiveContainer, LabelList,
} from 'recharts';
import { Grid3x3, Info } from 'lucide-react';
import type {
  RhMatrizPsicossocial, MatrizQuadrante, MatrizSetor,
} from '../../services/empresaService';

// Paleta de status (fixa, nunca tematizada). Usada só onde há texto junto.
const STATUS: Record<MatrizQuadrante, { cor: string; label: string; acao: string }> = {
  risco_ocupacional: {
    cor: '#d03b3b',
    label: 'Prioridade ocupacional',
    acao: 'O trabalho pesa muito e as pessoas não estão bem. É por aqui que se começa, mexendo em como o trabalho está organizado.',
  },
  fator_externo: {
    cor: '#ec835a',
    label: 'Bem-estar reduzido',
    acao: 'As pessoas não estão bem, mas o questionário do trabalho não acusou peso alto. Vale procurar outras causas, dentro e fora do trabalho.',
  },
  risco_latente: {
    cor: '#fab219',
    label: 'Risco latente',
    acao: 'O trabalho pesa muito, mas as pessoas ainda estão bem. Dá para agir antes de alguém adoecer.',
  },
  estavel: {
    cor: '#0ca30c',
    label: 'Menor prioridade relativa',
    acao: 'Resultados melhores que o meio da empresa. Seguir acompanhando — isso não quer dizer que não existe risco.',
  },
};

// Washes de quadrante foram testados e descartados: a 7% de opacidade o
// vermelho de "risco ocupacional" e o laranja de "fator extra-ocupacional"
// viram o mesmo rosa, e o painel fica ruidoso sem ganhar informação. As
// regiões são identificadas por RÓTULO no canto — legível sem cor nenhuma —
// e só o quadrante crítico recebe um wash, porque é o que precisa saltar.
const WASH_CRITICO = 'rgba(208,59,59,0.06)';

// Cromo do gráfico — hairlines recessivas, tinta de texto nunca colorida.
const GRID = '#e1e0d9';
const AXIS = '#c3c2b7';
const MUTED = '#898781';
const PONTO = '#7d4a3c';

type Ponto = {
  setor: string;
  x: number;
  y: number;
  dados: MatrizSetor;
  /** Deslocamento vertical do rótulo, em px, para não colidir com outro. */
  labelDy: number;
  /** Rótulo à esquerda quando o ponto está perto da borda direita. */
  labelEsquerda: boolean;
};

const LABEL_ALTURA = 15;   // px entre rótulos empilhados
// Limiares de colisão em unidades de dado (ambos os eixos vão de 0 a 100).
// Um rótulo ocupa ~90px de largura e ~15px de altura; no tamanho em que o
// gráfico é renderizado isso equivale a ~10 unidades em x e ~5 em y.
const COLIDE_X = 10;
const COLIDE_Y = 5;

/**
 * Empilha rótulos que ficariam sobrepostos. Sem isto, setores com valores
 * próximos escrevem um por cima do outro — foi o que aconteceu com
 * "Financeiro" e "Tecnologia da Informação" na primeira renderização.
 */
function posicionarRotulos(pontos: Omit<Ponto, 'labelDy' | 'labelEsquerda'>[]): Ponto[] {
  const ordenados = [...pontos].sort((a, b) => b.y - a.y || a.x - b.x);
  const colocados: { x: number; y: number; nivel: number }[] = [];

  return ordenados.map(p => {
    let nivel = 0;
    // Sobe um degrau enquanto houver rótulo já colocado ocupando o espaço.
    while (colocados.some(c =>
      c.nivel === nivel &&
      Math.abs(c.x - p.x) < COLIDE_X &&
      Math.abs(c.y - p.y) < COLIDE_Y
    )) {
      nivel += 1;
    }
    colocados.push({ x: p.x, y: p.y, nivel });
    return { ...p, labelDy: nivel * LABEL_ALTURA, labelEsquerda: p.x > 62 };
  });
}

const QuadranteChip: React.FC<{ q: MatrizQuadrante }> = ({ q }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
    <span
      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
      style={{ background: STATUS[q].cor }}
      aria-hidden
    />
    <span className="text-gray-700">{STATUS[q].label}</span>
  </span>
);

const TooltipMatriz: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p: Ponto = payload[0].payload;
  const { bemestar, exposicao, quadrante } = p.dados;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800 mb-1">{p.setor}</p>
      {quadrante && <div className="mb-1.5"><QuadranteChip q={quadrante} /></div>}
      {exposicao && (
        <p className="text-gray-600">
          Exposição <strong className="text-gray-800">{exposicao.indice}</strong>
          <span className="text-gray-400">
            {' '}· demanda {exposicao.demanda} · controle {exposicao.controle} · apoio {exposicao.apoio}
          </span>
        </p>
      )}
      {bemestar && (
        <p className="text-gray-600">
          Bem-estar <strong className="text-gray-800">{bemestar.score_medio}</strong>
          <span className="text-gray-400"> · {bemestar.n_respondentes} respondentes</span>
        </p>
      )}
    </div>
  );
};

/** Ponto com área de toque folgada — alvo de 8px é impossível de acertar. */
const PontoSetor = (props: any) => {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={14} fill="transparent" />
      <circle cx={cx} cy={cy} r={7} fill={PONTO} stroke="#ffffff" strokeWidth={2} />
    </g>
  );
};

/** Rótulo do setor, com empilhamento e lado calculados em posicionarRotulos. */
const RotuloSetor = (props: any) => {
  const { x, y, index, pontos } = props;
  const p: Ponto | undefined = pontos[index];
  if (!p || x == null || y == null) return null;
  const esq = p.labelEsquerda;
  return (
    <text
      x={x + (esq ? -12 : 12)}
      y={y + p.labelDy}
      dy={4}
      textAnchor={esq ? 'end' : 'start'}
      style={{ fontSize: 11, fill: MUTED }}
    >
      {p.setor}
    </text>
  );
};

export const MatrizPsicossocial: React.FC<{
  matriz: RhMatrizPsicossocial | null;
  loading: boolean;
}> = ({ matriz, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#7d4a3c]" />
        </div>
      </div>
    );
  }

  const setores = matriz?.setores ?? [];
  const plotaveis: Ponto[] = posicionarRotulos(
    setores
      .filter(s => s.exposicao && s.bemestar)
      .map(s => ({
        setor: s.setor,
        x: s.exposicao!.indice,
        y: s.bemestar!.score_medio,
        dados: s,
      }))
  );

  const temCortes = matriz?.mediana_exposicao != null && matriz?.mediana_bemestar != null;
  const mx = matriz?.mediana_exposicao ?? 50;
  const my = matriz?.mediana_bemestar ?? 50;

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex items-center gap-2 mb-1">
        <Grid3x3 className="w-5 h-5 text-[#7d4a3c]" />
        <h2 className="font-semibold text-gray-800">Matriz de risco por setor</h2>
      </div>
      <p className="text-sm text-gray-500 mb-1">
        Junta as duas medidas: o quanto o trabalho pesa em cada setor e como as pessoas daquele
        setor estão. Ajuda a escolher onde olhar primeiro — mas sozinha não diz o motivo do
        bem-estar estar baixo.
      </p>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Cada bolinha é um setor, e as duas notas vão de 0 a 100 — mas em sentidos contrários:
        <strong> quanto mais à direita, mais o trabalho pesa</strong>; e{' '}
        <strong>quanto mais em cima, melhor as pessoas estão</strong>. Ou seja: o canto de baixo,
        à direita, é o pior lugar do gráfico.
      </p>

      {plotaveis.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500 font-medium">
            Ainda não há setor com os dois questionários respondidos.
          </p>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto leading-snug">
            Para o gráfico aparecer, o mesmo setor precisa ter respondido o questionário de
            bem-estar <strong>e</strong> o de exposição no trabalho, cada um com pelo menos{' '}
            {matriz?.k_min ?? 5} pessoas.
          </p>
        </div>
      ) : (
        <>
          {/* Altura inclui a faixa do eixo X para o rótulo não ficar cortado */}
          <div className="h-[340px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 24, bottom: 28, left: 8 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="0" />

                {/* Regiões: identificadas por rótulo no canto (legível sem cor).
                    Só o quadrante crítico ganha wash, para saltar sem ruído. */}
                {temCortes && (
                  <>
                    <ReferenceArea x1={mx} x2={100} y1={0} y2={my}
                      fill={WASH_CRITICO} fillOpacity={1} stroke="none" />
                    <ReferenceArea x1={0} x2={mx} y1={my} y2={100} fill="none" stroke="none"
                      label={{ value: STATUS.estavel.label, position: 'insideTopLeft',
                               style: { fontSize: 10, fill: MUTED } }} />
                    <ReferenceArea x1={mx} x2={100} y1={my} y2={100} fill="none" stroke="none"
                      label={{ value: STATUS.risco_latente.label, position: 'insideTopRight',
                               style: { fontSize: 10, fill: MUTED } }} />
                    <ReferenceArea x1={0} x2={mx} y1={0} y2={my} fill="none" stroke="none"
                      label={{ value: STATUS.fator_externo.label, position: 'insideBottomLeft',
                               style: { fontSize: 10, fill: MUTED } }} />
                    <ReferenceArea x1={mx} x2={100} y1={0} y2={my} fill="none" stroke="none"
                      label={{ value: STATUS.risco_ocupacional.label, position: 'insideBottomRight',
                               style: { fontSize: 10, fill: MUTED } }} />
                    <ReferenceLine x={mx} stroke={AXIS} />
                    <ReferenceLine y={my} stroke={AXIS} />
                  </>
                )}

                <XAxis
                  type="number" dataKey="x" domain={[0, 100]} tickCount={6}
                  tick={{ fontSize: 11, fill: MUTED }} tickLine={false}
                  axisLine={{ stroke: AXIS }}
                  label={{
                    value: 'Exposição ocupacional →', position: 'insideBottom', offset: -16,
                    style: { fontSize: 11, fill: MUTED },
                  }}
                />
                <YAxis
                  type="number" dataKey="y" domain={[0, 100]} tickCount={6}
                  tick={{ fontSize: 11, fill: MUTED }} tickLine={false}
                  axisLine={{ stroke: AXIS }} width={44}
                  label={{
                    value: 'Bem-estar →', angle: -90, position: 'insideLeft',
                    style: { fontSize: 11, fill: MUTED, textAnchor: 'middle' },
                  }}
                />
                <Tooltip content={<TooltipMatriz />} cursor={false} />
                <Scatter data={plotaveis} shape={<PontoSetor />} isAnimationActive={false}>
                  <LabelList dataKey="setor" content={<RotuloSetor pontos={plotaveis} />} />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Legenda dos quadrantes — cor sempre acompanhada de rótulo */}
          {temCortes && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-2 mb-4 text-xs">
              {(['risco_ocupacional', 'risco_latente', 'fator_externo', 'estavel'] as MatrizQuadrante[])
                .map(q => (
                  <div key={q} className="flex items-start gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0 mt-1"
                      style={{ background: STATUS[q].cor }}
                      aria-hidden
                    />
                    <span className="text-gray-500 leading-snug">
                      <strong className="text-gray-700">{STATUS[q].label}.</strong> {STATUS[q].acao}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* Gêmeo em tabela — todo valor do gráfico é legível aqui */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left font-medium py-2">Setor</th>
                  <th className="text-right font-medium py-2"
                    title="O quanto o trabalho pesa (0 a 100). Quanto maior, pior.">
                    Exposição
                  </th>
                  <th className="text-right font-medium py-2 hidden sm:table-cell"
                    title="Demanda: o quanto o trabalho cobra — pressa, quantidade e prazo. Quanto maior, pior.">
                    Dem.
                  </th>
                  <th className="text-right font-medium py-2 hidden sm:table-cell"
                    title="Controle: liberdade para decidir o próprio trabalho. Quanto maior, melhor.">
                    Contr.
                  </th>
                  <th className="text-right font-medium py-2 hidden sm:table-cell"
                    title="Apoio: apoio dos colegas e da chefia. Quanto maior, melhor.">
                    Apoio
                  </th>
                  <th className="text-right font-medium py-2"
                    title="Nota média de bem-estar do setor (0 a 100). Quanto maior, melhor; abaixo de 50 é bem-estar baixo.">
                    Bem-estar
                  </th>
                  <th className="text-left font-medium py-2 pl-4">Classificação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {setores.map(s => (
                  <tr key={s.setor}>
                    <td className="py-2 text-gray-700">{s.setor}</td>
                    <td className="py-2 text-right font-semibold text-gray-800 tabular-nums">
                      {s.exposicao ? s.exposicao.indice : '—'}
                    </td>
                    <td className="py-2 text-right text-gray-500 tabular-nums hidden sm:table-cell">
                      {s.exposicao ? s.exposicao.demanda : '—'}
                    </td>
                    <td className="py-2 text-right text-gray-500 tabular-nums hidden sm:table-cell">
                      {s.exposicao ? s.exposicao.controle : '—'}
                    </td>
                    <td className="py-2 text-right text-gray-500 tabular-nums hidden sm:table-cell">
                      {s.exposicao ? s.exposicao.apoio : '—'}
                    </td>
                    <td className="py-2 text-right font-semibold text-gray-800 tabular-nums">
                      {s.bemestar ? s.bemestar.score_medio : '—'}
                    </td>
                    <td className="py-2 pl-4">
                      {s.quadrante
                        ? <QuadranteChip q={s.quadrante} />
                        : <span className="text-xs text-gray-400">Sem classificação</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>
          {temCortes ? (
            <>
              A comparação é <strong>dentro da sua empresa</strong>: as linhas marcam o meio entre
              os setores (trabalho pesa {matriz?.mediana_exposicao}, bem-estar {matriz?.mediana_bemestar}).
              Serve para escolher por onde começar, não para dizer que um setor está bem — para saber
              a gravidade, olhe quantas pessoas estão com bem-estar baixo.{' '}
            </>
          ) : (
            <>
              Ainda não dá para dividir o gráfico em cantos: são necessários pelo menos{' '}
              {matriz?.min_setores ?? 3} setores com os dois questionários respondidos para o meio da
              empresa significar alguma coisa (hoje são {matriz?.setores_comparaveis ?? 0}).{' '}
            </>
          )}
          Os números aparecem sempre somados; grupos com menos de {matriz?.k_min ?? 5} respostas ficam
          de fora, para proteger quem respondeu (LGPD).
          {(matriz?.setores_suprimidos ?? 0) > 0 && ` ${matriz?.setores_suprimidos} setor(es) fora por isso.`}
          {' '}E atenção: aparecer junto não quer dizer que um causou o outro.
        </span>
      </div>
    </div>
  );
};
