import React from 'react';
import {
  CartesianGrid, LabelList, ReferenceArea, ReferenceLine, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertTriangle, Grid3x3, Info, ShieldAlert } from 'lucide-react';
import type { RhRelatorioJss } from '../../services/empresaService';
import {
  JSS_CLASSIFICACAO, JSS_PRIORIDADE, obterInsightJss, prioridadeOrdem,
  type JssInsight,
} from '../../lib/jssInsights';

type PontoJss = {
  setor: string;
  x: number;
  y: number;
  apoio: number;
  insight: JssInsight;
};

const TooltipJss: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PontoJss;
  const classificacao = p.insight.classificacao
    ? JSS_CLASSIFICACAO[p.insight.classificacao].label : 'Sem classificação';
  return (
    <div className="max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-gray-800">{p.setor}</p>
      <p className="mt-0.5 text-gray-600">{classificacao} · apoio {p.apoio}</p>
      {p.insight.fatores.length > 0 && (
        <p className="mt-1 text-gray-500">{p.insight.fatores.join(' · ')}</p>
      )}
    </div>
  );
};

const PontoSetor = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const p = payload as PontoJss;
  const cor = JSS_PRIORIDADE[p.insight.prioridade].cor;
  return (
    <g>
      <circle cx={cx} cy={cy} r={14} fill="transparent" />
      {p.insight.apoioReduzido && (
        <circle cx={cx} cy={cy} r={10} fill="none" stroke="#d03b3b" strokeWidth={2} />
      )}
      <circle cx={cx} cy={cy} r={6} fill={cor} stroke="#fff" strokeWidth={2} />
    </g>
  );
};

export const JssDiagnosticoSetor: React.FC<{ relatorio: RhRelatorioJss }> = ({ relatorio }) => {
  const cortes = relatorio.cortes;
  const linhas = relatorio.setores
    .map(setor => ({ setor, insight: obterInsightJss(setor, cortes) }))
    .sort((a, b) => prioridadeOrdem(a.insight.prioridade) - prioridadeOrdem(b.insight.prioridade)
      || b.setor.indice - a.setor.indice);
  const pontos: PontoJss[] = linhas.map(({ setor, insight }) => ({
    setor: setor.setor,
    x: setor.controle,
    y: setor.demanda,
    apoio: setor.apoio,
    insight,
  }));

  if (relatorio.setores.length === 0) return null;

  return (
    <div className="mb-5 space-y-4">
      <div className="border-t border-gray-100 pt-5">
        <div className="flex items-center gap-2">
          <Grid3x3 className="h-4 w-4 text-[#7d4a3c]" />
          <h3 className="text-sm font-semibold text-gray-800">Diagnóstico JSS por setor</h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          A matriz clássica cruza demanda e controle. O apoio social funciona como agravante;
          setores com apoio abaixo da mediana recebem um anel de alerta. A ordem abaixo é uma
          prioridade de triagem, não a classificação formal de risco do GRO/PGR.
        </p>
      </div>

      {!cortes ? (
        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
          Os escores estão disponíveis, mas ainda não há referência suficiente para classificar
          os quadrantes neste período.
        </div>
      ) : (
        <>
          <div className="h-[340px] rounded-lg border border-gray-100 bg-white pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 32, left: 10 }}>
                <CartesianGrid stroke="#e7e5e0" />
                <ReferenceArea x1={0} x2={cortes.controle} y1={cortes.demanda} y2={100}
                  fill="rgba(208,59,59,0.08)" stroke="none"
                  label={{ value: 'Alta exigência', position: 'insideTopLeft', fill: '#a33b34', fontSize: 10 }} />
                <ReferenceArea x1={cortes.controle} x2={100} y1={cortes.demanda} y2={100}
                  fill="rgba(213,154,22,0.05)" stroke="none"
                  label={{ value: 'Trabalho ativo', position: 'insideTopRight', fill: '#77736b', fontSize: 10 }} />
                <ReferenceArea x1={0} x2={cortes.controle} y1={0} y2={cortes.demanda}
                  fill="rgba(236,131,90,0.04)" stroke="none"
                  label={{ value: 'Trabalho passivo', position: 'insideBottomLeft', fill: '#77736b', fontSize: 10 }} />
                <ReferenceArea x1={cortes.controle} x2={100} y1={0} y2={cortes.demanda}
                  fill="rgba(84,128,100,0.04)" stroke="none"
                  label={{ value: 'Baixa exigência', position: 'insideBottomRight', fill: '#77736b', fontSize: 10 }} />
                <ReferenceLine x={cortes.controle} stroke="#b8b5ae" />
                <ReferenceLine y={cortes.demanda} stroke="#b8b5ae" />
                <XAxis type="number" dataKey="x" domain={[0, 100]} tickCount={6}
                  tick={{ fontSize: 10, fill: '#898781' }} tickLine={false}
                  label={{ value: 'Controle / autonomia →', position: 'insideBottom', offset: -20,
                    style: { fontSize: 11, fill: '#77736b' } }} />
                <YAxis type="number" dataKey="y" domain={[0, 100]} tickCount={6} width={46}
                  tick={{ fontSize: 10, fill: '#898781' }} tickLine={false}
                  label={{ value: 'Demanda →', angle: -90, position: 'insideLeft',
                    style: { fontSize: 11, fill: '#77736b', textAnchor: 'middle' } }} />
                <Tooltip content={<TooltipJss />} cursor={false} />
                <Scatter data={pontos} shape={<PontoSetor />} isAnimationActive={false}>
                  <LabelList dataKey="setor" position="top" offset={9}
                    style={{ fontSize: 10, fill: '#77736b' }} />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-gray-500">
            <span>Cortes do período: demanda {cortes.demanda} · controle {cortes.controle} · apoio {cortes.apoio}</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-full border-2 border-red-500" /> apoio reduzido
            </span>
          </div>
        </>
      )}

      <div className="space-y-2">
        {linhas.map(({ setor, insight }) => {
          const prioridade = JSS_PRIORIDADE[insight.prioridade];
          const classificacao = insight.classificacao
            ? JSS_CLASSIFICACAO[insight.classificacao] : null;
          return (
            <div key={setor.setor} className="rounded-lg border border-gray-100 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{setor.setor}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium"
                      style={{ color: prioridade.cor }}>
                      {insight.prioridade === 'critica' && <ShieldAlert className="h-3.5 w-3.5" />}
                      {insight.prioridade === 'alta' && <AlertTriangle className="h-3.5 w-3.5" />}
                      {prioridade.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {classificacao?.label ?? 'Sem classificação'} · {setor.n_respondentes} respondentes
                  </p>
                </div>
                <div className="flex gap-3 text-xs tabular-nums text-gray-500">
                  <span>Dem. <strong className="text-gray-700">{setor.demanda}</strong></span>
                  <span>Contr. <strong className="text-gray-700">{setor.controle}</strong></span>
                  <span>Apoio <strong className="text-gray-700">{setor.apoio}</strong></span>
                </div>
              </div>

              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Fatores sinalizados</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                    {insight.fatores.length ? insight.fatores.join(' · ') : 'Nenhum fator elevado na referência relativa.'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">O que mais pesou</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                    {insight.sinais.length ? insight.sinais.join(' · ') : 'Sem item isolado acima do limiar de explicação.'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Próximo passo</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                    {insight.encaminhamentos.join(' ')}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>
          Os cortes são relativos à mediana dos respondentes deste período. “Apoio reduzido” pode
          justificar investigação de liderança, relações, violência ou assédio, mas a JSS não confirma
          assédio moral. A conclusão exige método específico, escuta protegida e análise do trabalho real.
        </span>
      </div>
    </div>
  );
};
