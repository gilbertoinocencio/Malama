import React from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid, LabelList, ReferenceArea, ReferenceLine, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertTriangle, ArrowRight, ChevronDown, Grid3x3, Info, ListChecks, ShieldAlert } from 'lucide-react';
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
        ? `${descricao} Nota de 0 a 100. Meio da empresa: ${corte}.`
        : `${descricao} Nota de 0 a 100.`
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
          <ListChecks className="h-4 w-4 text-[#7d4a3c]" />
          <h3 className="text-sm font-semibold text-gray-800">Diagnóstico e próximos passos por setor</h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          A lista organiza os setores por onde vale começar e traduz os resultados em sinais e
          próximos passos, sem comparar lideranças nem expor respostas individuais.
        </p>
      </div>

      <details className="group rounded-xl border border-gray-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 items-start gap-3">
            <Grid3x3 className="mt-0.5 h-5 w-5 shrink-0 text-[#8B4A3A]" />
            <div>
              <p className="font-medium text-gray-900">Ver análise técnica Demanda × Controle</p>
              <p className="mt-0.5 text-sm text-gray-500">
                Quadrantes do modelo Karasek/Theorell, preservados para consulta técnica e relatório do PGR.
              </p>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
        </summary>

        <div className="space-y-3 border-t border-gray-100 p-4">
          <p className="text-sm leading-6 text-gray-600">
            Cada setor é uma bolinha. Quanto mais em cima, mais o trabalho cobra; quanto mais à direita, mais autonomia
            as pessoas têm para decidir. O apoio aparece como um anel vermelho quando está abaixo da referência.
          </p>

      {!cortes ? (
        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
          As notas já existem, mas ainda não dá para dividir o gráfico em cantos: falta gente
          respondendo neste período para saber onde fica o meio da empresa.
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
                A cor da bolinha diz por onde começar
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
                  <span className="text-gray-400">— apoio abaixo do meio da empresa</span>
                </span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                O que significa cada canto do gráfico
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
              As linhas que cortam o gráfico marcam o meio da sua empresa neste período:
              demanda {cortes.demanda} · controle {cortes.controle} · apoio {cortes.apoio} —
              metade dos setores fica de cada lado. Não são notas oficiais de aprovação: em
              qualquer empresa sempre vai ter setor dos dois lados da linha.
            </p>
          </div>
        </>
      )}
        </div>
      </details>

      <div className="space-y-2">
        <div>
          <p className="text-xs font-semibold text-gray-700">Setores por ordem de prioridade</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">
            Notas de 0 a 100. Os números em vermelho são os que estão no lado ruim em relação
            ao meio da empresa: cobrança alta demais, ou autonomia e apoio baixos demais. São
            eles que explicam a classificação e o que aparece ao lado.
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
                    label="Demanda" descricao="O quanto o trabalho cobra: pressa, quantidade de tarefas e prazo. Quanto maior, pior."
                    valor={setor.demanda} corte={cortes?.demanda}
                    adverso={cortes ? setor.demanda >= cortes.demanda : false}
                  />
                  <ValorSetor
                    label="Controle" descricao="Liberdade para decidir como e o que fazer. Quanto maior, melhor."
                    valor={setor.controle} corte={cortes?.controle}
                    adverso={cortes ? setor.controle < cortes.controle : false}
                  />
                  <ValorSetor
                    label="Apoio" descricao="Apoio dos colegas e da chefia. Quanto maior, melhor."
                    valor={setor.apoio} corte={cortes?.apoio}
                    adverso={cortes ? setor.apoio < cortes.apoio : false}
                  />
                </div>
              </div>

              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400"
                    title="Pontos em que este setor está pior que o meio da empresa neste período.">
                    O que chamou atenção
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                    {insight.fatores.length ? insight.fatores.join(' · ') : 'Nada acima do meio da empresa neste período.'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400"
                    title="As perguntas do questionário que mais puxaram a nota deste setor para baixo. Sempre somadas, nunca a resposta de uma pessoa.">
                    O que mais pesou
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                    {insight.sinais.length ? insight.sinais.join(' · ') : 'Nenhuma pergunta se destacou das outras.'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400"
                    title="Sugestão de por onde começar, a partir do que chamou atenção. É ponto de partida para conversar com a equipe, não conclusão.">
                    Próximo passo
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                    {insight.encaminhamentos.join(' ')}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end border-t border-gray-100 pt-2">
                <Link
                  to={`/rh/plano-acao?visao=lideranca&nova=1&setor=${encodeURIComponent(setor.setor)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7d4a3c]"
                >
                  Preparar conversa com esta liderança <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>
          A comparação é sempre com o meio da sua empresa neste período. Apoio baixo é um bom motivo
          para olhar a chefia, a convivência do time e a possibilidade de desrespeito ou assédio —
          mas este questionário <strong>não prova assédio</strong>. Concluir isso exige método
          próprio, conversa reservada e olhar o trabalho de perto.
        </span>
      </div>
    </div>
  );
};
