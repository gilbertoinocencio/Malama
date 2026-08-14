import React from 'react';
import {
  CartesianGrid, LabelList, ReferenceArea, ReferenceLine, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertTriangle, Grid3x3, Info, ShieldAlert } from 'lucide-react';
import type { JssClassificacao, RhRelatorioJss } from '../../services/empresaService';
import {
  JSS_CLASSIFICACAO, JSS_PRIORIDADE, obterInsightJss, prioridadeOrdem,
  type JssInsight, type JssPrioridade,
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

/** Escore do setor. Fica destacado quando cai no lado adverso do corte do
 *  período — é o que explica a classificação, então precisa ser visível. */
const ValorSetor: React.FC<{
  label: string;
  descricao: string;
  valor: number;
  corte?: number | null;
  adverso: boolean;
}> = ({ label, descricao, valor, corte, adverso }) => (
  <span
    className="tabular-nums"
    title={
      corte != null
        ? `${descricao} Escala 0–100. Mediana do período: ${corte}.`
        : `${descricao} Escala 0–100.`
    }
  >
    <span className={adverso ? 'text-[#c2603f]' : 'text-gray-500'}>{label} </span>
    <strong className={adverso ? 'text-[#c2603f]' : 'text-gray-700'}>{valor}</strong>
  </span>
);

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
          Cada setor é um ponto: quanto mais alto, mais o trabalho cobra (demanda); quanto mais
          à direita, mais autonomia quem o faz tem (controle) — ambos de 0 a 100. O apoio não
          entra nos eixos, funciona como agravante: setores com apoio abaixo da mediana recebem
          um anel de alerta. A ordem abaixo é uma prioridade de triagem, não a classificação
          formal de risco do GRO/PGR.
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
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                Cor do ponto = prioridade de triagem
              </p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                {(Object.keys(JSS_PRIORIDADE) as JssPrioridade[]).map(p => (
                  <span key={p} className="inline-flex items-center gap-1.5" title={JSS_PRIORIDADE[p].criterio}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: JSS_PRIORIDADE[p].cor }} />
                    <span className="font-medium text-gray-600">{JSS_PRIORIDADE[p].label}</span>
                    <span className="text-gray-400">— {JSS_PRIORIDADE[p].criterio}</span>
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full border-2 border-red-500" />
                  <span className="font-medium text-gray-600">Anel vermelho</span>
                  <span className="text-gray-400">— apoio abaixo da mediana do período</span>
                </span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                Como ler os quadrantes
              </p>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                {(Object.keys(JSS_CLASSIFICACAO) as JssClassificacao[]).map(c => (
                  <div key={c} className="rounded-lg bg-gray-50 p-2 text-[11px] leading-relaxed">
                    <span className="font-semibold text-gray-700">{JSS_CLASSIFICACAO[c].label}</span>
                    <span className="text-gray-500"> — {JSS_CLASSIFICACAO[c].descricao} </span>
                    <span className="text-gray-500">{JSS_CLASSIFICACAO[c].leitura}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-gray-500">
              As linhas que dividem o gráfico são as medianas dos respondentes deste período:
              demanda {cortes.demanda} · controle {cortes.controle} · apoio {cortes.apoio}. São
              referências internas da empresa, não notas de corte oficiais — em qualquer
              população sempre haverá setores de cada lado da linha.
            </p>
          </div>
        </>
      )}

      <div className="space-y-2">
        <div>
          <p className="text-xs font-semibold text-gray-700">Setores em ordem de prioridade</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">
            Escores de 0 a 100. Os números destacados em vermelho estão no lado adverso da
            mediana do período: demanda acima dela, controle ou apoio abaixo. São eles que
            explicam a classificação e os fatores sinalizados ao lado.
          </p>
        </div>

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
                <div className="flex gap-3 text-xs text-gray-500">
                  <ValorSetor
                    label="Demanda" descricao="O quanto o trabalho cobra: ritmo, volume e prazo."
                    valor={setor.demanda} corte={cortes?.demanda}
                    adverso={cortes ? setor.demanda >= cortes.demanda : false}
                  />
                  <ValorSetor
                    label="Controle" descricao="Autonomia para decidir como e o que fazer."
                    valor={setor.controle} corte={cortes?.controle}
                    adverso={cortes ? setor.controle < cortes.controle : false}
                  />
                  <ValorSetor
                    label="Apoio" descricao="Suporte de colegas e liderança."
                    valor={setor.apoio} corte={cortes?.apoio}
                    adverso={cortes ? setor.apoio < cortes.apoio : false}
                  />
                </div>
              </div>

              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400"
                    title="Eixos em que este setor está no lado adverso da mediana do período.">
                    Fatores sinalizados
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                    {insight.fatores.length ? insight.fatores.join(' · ') : 'Nenhum fator elevado na referência relativa.'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400"
                    title="Perguntas do questionário com maior contribuição adversa neste setor (acima de 50, em 0–100). Sempre agregadas, nunca resposta individual.">
                    O que mais pesou
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                    {insight.sinais.length ? insight.sinais.join(' · ') : 'Sem item isolado acima do limiar de explicação.'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400"
                    title="Encaminhamento sugerido a partir do eixo sinalizado. É ponto de partida para a escuta do trabalho real, não conclusão.">
                    Próximo passo
                  </p>
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
