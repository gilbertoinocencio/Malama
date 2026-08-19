import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, RefreshCw,
  ShieldAlert, Sparkles, TrendingDown, TrendingUp,
} from 'lucide-react';
import {
  rhAgentService, type RhBriefing as RhBriefingData,
  type RhBriefingPriority, type RhBriefingSeverity,
} from '../../services/rhAgentService';

const severityStyles: Record<RhBriefingSeverity, string> = {
  critico: 'border-red-200 bg-red-50 text-red-950',
  atencao: 'border-amber-200 bg-amber-50 text-amber-950',
  oportunidade: 'border-blue-200 bg-blue-50 text-blue-950',
  positivo: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  informativo: 'border-gray-200 bg-gray-50 text-gray-900',
};

const severityLabel: Record<RhBriefingSeverity, string> = {
  critico: 'Prioridade crítica',
  atencao: 'Pede atenção',
  oportunidade: 'Oportunidade',
  positivo: 'Evolução positiva',
  informativo: 'Próxima base',
};

function actionTarget(priority: RhBriefingPriority) {
  if (!priority.medida_sugerida) return priority.acao?.target ?? '';
  const measure = priority.medida_sugerida;
  const params = new URLSearchParams({
    novaAcao: '1', fator: measure.fator, medida: measure.medida,
    nivel: measure.nivel_controle, risco: measure.risco_descricao,
  });
  if (measure.setor) params.set('setor', measure.setor);
  return `/rh/plano-acao?${params.toString()}`;
}

const PriorityCard: React.FC<{ priority: RhBriefingPriority }> = ({ priority }) => {
  const target = actionTarget(priority);
  const Icon = priority.severidade === 'critico' ? ShieldAlert : AlertTriangle;
  return (
    <article className={`flex min-h-full flex-col rounded-xl border p-4 ${severityStyles[priority.severidade]}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-75">
        <Icon className="h-3.5 w-3.5" /> {severityLabel[priority.severidade]}
      </p>
      <h3 className="mt-2 text-sm font-semibold leading-snug">{priority.titulo}</h3>
      <p className="mt-1.5 flex-1 text-xs leading-relaxed opacity-80">{priority.descricao}</p>
      {priority.evidencias.length > 0 && (
        <p className="mt-3 border-t border-current/10 pt-2 text-[11px] font-medium opacity-75">
          Base: {priority.evidencias.join(' · ')}
        </p>
      )}
      {target && priority.acao && (
        <Link to={target} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline">
          {priority.acao.label} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </article>
  );
};

export const RhBriefing: React.FC = () => {
  const [briefing, setBriefing] = useState<RhBriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setBriefing(await rhAgentService.obterBriefing());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o briefing agora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading && !briefing) {
    return (
      <section className="rounded-xl border border-[#7d4a3c]/15 bg-white p-5 shadow-sm" aria-label="Carregando briefing do RH">
        <div className="flex animate-pulse items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#7d4a3c]/10" />
          <div className="flex-1"><div className="h-4 w-40 rounded bg-gray-200" /><div className="mt-2 h-3 w-2/3 rounded bg-gray-100" /></div>
        </div>
      </section>
    );
  }

  if (error && !briefing) {
    return (
      <section className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
        <span className="text-gray-600">O briefing inteligente não pôde ser atualizado agora. O restante do painel continua disponível.</span>
        <button onClick={() => void load()} className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-[#7d4a3c]">
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </button>
      </section>
    );
  }

  if (!briefing) return null;
  const priorities = briefing.prioridades.slice(0, 3);

  return (
    <section className="rounded-xl border border-[#7d4a3c]/20 bg-white p-5 shadow-sm" aria-labelledby="briefing-rh-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7d4a3c] text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7d4a3c]">Leitura inteligente dos dados</p>
            <h2 id="briefing-rh-title" className="mt-0.5 text-lg font-semibold text-gray-900">Briefing do RH</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-600">{briefing.resumo}</p>
          </div>
        </div>
        <button onClick={() => void load()} disabled={loading} title="Atualizar briefing" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {priorities.length > 0 && (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {priorities.map(priority => <PriorityCard key={priority.id} priority={priority} />)}
        </div>
      )}

      {(briefing.tendencias.length > 0 || briefing.positivos.length > 0) && (
        <details className="group mt-4 rounded-lg border border-gray-100 bg-gray-50/70 px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-gray-700 [&::-webkit-details-marker]:hidden">
            <span>Ver evolução dos indicadores e sinais positivos</span>
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>
          {briefing.tendencias.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {briefing.tendencias.map(item => (
                <div key={item.id} className="rounded-lg border border-gray-200 bg-white px-3 py-3">
                  <p className="text-xs font-medium text-gray-500">{item.label}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                    {item.anterior} <ArrowRight className="h-3 w-3 text-gray-400" /> {item.atual}
                    {item.direcao === 'melhorou'
                      ? <TrendingUp className="h-4 w-4 text-emerald-600" />
                      : item.direcao === 'piorou' ? <TrendingDown className="h-4 w-4 text-red-600" /> : null}
                  </p>
                  <p className={`mt-1 text-[11px] font-semibold ${item.direcao === 'melhorou' ? 'text-emerald-700' : item.direcao === 'piorou' ? 'text-red-700' : 'text-gray-500'}`}>
                    {item.direcao === 'estavel' ? 'Sem variação relevante' : `${item.direcao} ${Math.abs(item.delta)} pontos`}
                  </p>
                </div>
              ))}
            </div>
          )}
          {briefing.positivos.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-xs text-emerald-800">
              {briefing.positivos.map(item => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />{item}</li>)}
            </ul>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-gray-500">{briefing.qualidade_dados.nota}</p>
        </details>
      )}
    </section>
  );
};
