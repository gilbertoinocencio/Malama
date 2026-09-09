import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ChevronDown,
  ClipboardCheck, Clock, RefreshCw, ShieldAlert, Sparkles, TrendingDown, TrendingUp,
} from 'lucide-react';
import {
  rhAgentService, type RhBriefing as RhBriefingData,
  type RhBriefingPriority, type RhBriefingSeverity,
  type RhForcaEvidencia, type RhReavaliacao,
} from '../../services/rhAgentService';
import type { CompromissoRitmo, EtapaChave, PassoJornada } from '../../lib/rhJornada';

// ONDE CADA CARD BUSCA A SUA DATA.
//
// O ritmo do ciclo era um paredão separado, com quatro linhas gordas
// repetindo assuntos que os cards acima já tratavam. A informação que só
// ele tinha era a DATA — então é a data que se muda de lugar, e o paredão
// encolhe.
//
// Uma prioridade sem compromisso correspondente simplesmente não mostra
// data: melhor um card sem linha do que uma data que não é daquilo.
const COMPROMISSO_DA_PRIORIDADE: Record<string, CompromissoRitmo['chave']> = {
  medidas_atrasadas: 'plano',
  lacuna_fonte: 'plano',
  lideranca_pendente: 'lideranca',
};

/** Compromisso que corresponde à etapa em que o passo da jornada está. */
const COMPROMISSO_DA_ETAPA: Partial<Record<EtapaChave, CompromissoRitmo['chave']>> = {
  conversar: 'lideranca',
  medidas: 'plano',
  comprovar: 'plano',
};

// A JORNADA MANDA; O BRIEFING COMPLEMENTA.
//
// "Seu próximo passo" (lib/rhJornada) é a fonte única do que fazer agora.
// Quando o briefing repete o mesmo fato como prioridade, os dois lugares de
// maior destaque do painel dizem a mesma coisa e o RH tem que descobrir
// sozinho que é uma coisa só. Aqui a prioridade que o passo atual JÁ
// enuncia sai do card, e sobra o que só o briefing sabe: tendência entre
// coletas, o que vale investigar e o que aconteceu na reavaliação.
//
// A filtragem é de TELA, não de dados: o payload completo continua indo
// para o Copiloto, que precisa do quadro inteiro para responder.
//
// E é feita no cliente de propósito. O gate do briefing no servidor aceita
// 'plano_acao' OU 'compliance', enquanto a jornada exige 'plano_acao' —
// num usuário só-compliance o passo não aparece, e cortar no servidor
// deixaria a medida atrasada invisível para ele. Escondendo só quando o
// passo está de fato na tela, esse caso continua coberto.
const PRIORIDADE_JA_DITA_PELO_PASSO: Partial<Record<EtapaChave, string>> = {
  comprovar: 'medidas_atrasadas',
  conversar: 'lideranca_pendente',
  medir: 'sem_linha_base',
};

// Categoria, nunca porcentagem: o sistema não tem base para atribuir
// probabilidade a uma hipótese, e um número inventado viraria a parte mais
// citada do relatório.
const FORCA_LABEL: Record<RhForcaEvidencia, string> = {
  evidencia_insuficiente: 'Evidência insuficiente',
  sinal_inicial: 'Sinal inicial',
  padrao_recorrente: 'Padrão recorrente',
  padrao_consistente: 'Padrão consistente',
};

// Descreve o movimento do indicador no período — nunca o efeito da medida.
const RESULTADO_LABEL: Record<RhReavaliacao['classificacao'], string> = {
  favoravel: 'Indicador no sentido desejado',
  estavel: 'Indicador estável',
  desfavoravel: 'Indicador no sentido oposto',
  inconclusivo: 'Sem comparação possível',
};

const RESULTADO_CLS: Record<RhReavaliacao['classificacao'], string> = {
  favoravel: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  estavel: 'bg-gray-50 text-gray-700 border-gray-200',
  desfavoravel: 'bg-red-50 text-red-800 border-red-200',
  inconclusivo: 'bg-gray-50 text-gray-500 border-gray-200',
};

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
  // Sem hipótese o rascunho segue funcionando: a medida só nasce sem linha
  // de base, que é o comportamento correto para vínculo não inequívoco.
  if (measure.hipotese_id) params.set('hipotese', measure.hipotese_id);
  return `/rh/plano-acao?${params.toString()}`;
}

/**
 * O próximo passo como PRIMEIRO card da grade, em verde.
 *
 * Verde porque é o único cartão da tela que não é alerta: os outros pedem
 * atenção ou apontam oportunidade, este diz "siga por aqui". Cor de avanço
 * ao lado de cores de aviso é o que faz a decisão ser óbvia sem precisar
 * de instrução.
 *
 * Ele é renderizado em TODOS os estados do briefing — inclusive quando a
 * leitura falha. A condução vem da jornada, que é calculada no cliente e
 * não depende de a Edge Function estar no ar; se dependesse, uma queda do
 * provedor apagaria a ação principal do painel.
 */
const ProximoPassoCard: React.FC<{ passo: PassoJornada; quando?: string | null }> = ({ passo, quando }) => (
  <article className="flex min-h-full flex-col rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-75">
      <ClipboardCheck className="h-3.5 w-3.5" /> Seu próximo passo
    </p>
    <h2 id="guia-rh-titulo" className="mt-2 text-sm font-semibold leading-snug">{passo.titulo}</h2>
    {quando && (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium opacity-75">
        <CalendarClock className="h-3.5 w-3.5 shrink-0" /> {quando}
      </p>
    )}
    <p className="mt-1.5 flex-1 text-xs leading-relaxed opacity-80">{passo.descricao}</p>
    {passo.atalho && (
      <Link to={passo.atalho.to} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold underline-offset-2 hover:underline">
        {passo.atalho.label} <ArrowRight className="h-3 w-3" />
      </Link>
    )}
    {passo.destino && (
      <Link to={passo.destino} className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800">
        {passo.acao} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    )}
  </article>
);

const PriorityCard: React.FC<{
  priority: RhBriefingPriority;
  /** Prazo em cima (marcos vencendo). Tem precedência sobre `quando`. */
  urgencia?: string;
  /** A data do compromisso correspondente, vinda do ritmo do ciclo. */
  quando?: string | null;
}> = ({ priority, urgencia, quando }) => {
  const target = actionTarget(priority);
  const Icon = priority.severidade === 'critico' ? ShieldAlert : AlertTriangle;
  return (
    <article className={`flex min-h-full flex-col rounded-xl border p-4 ${severityStyles[priority.severidade]}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-75">
        <Icon className="h-3.5 w-3.5" /> {severityLabel[priority.severidade]}
      </p>
      <h3 className="mt-2 text-sm font-semibold leading-snug">{priority.titulo}</h3>
      {/* O prazo vem logo abaixo do título porque é a única parte do card
          com data marcada: é o que decide se isso é para hoje ou para a
          semana que vem. */}
      {/* Urgência ganha de data: quando há marco vencendo em três dias, a
          data do ciclo é a informação menos útil das duas. */}
      {urgencia ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold">
          <Clock className="h-3.5 w-3.5 shrink-0" /> {urgencia}
        </p>
      ) : quando ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium opacity-75">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" /> {quando}
        </p>
      ) : null}
      <p className="mt-1.5 flex-1 text-xs leading-relaxed opacity-80">{priority.descricao}</p>
      {priority.evidencias.length > 0 && (
        <p className="mt-3 border-t border-current/10 pt-2 text-[11px] font-medium opacity-75">
          Base: {priority.evidencias.join(' · ')}
        </p>
      )}
      {priority.hipotese && (
        <details className="group/hip mt-2 border-t border-current/10 pt-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-semibold opacity-80 [&::-webkit-details-marker]:hidden">
            <span>O que vale investigar</span>
            <span className="flex items-center gap-1">
              <span className="rounded-full border border-current/20 px-1.5 py-px text-[10px] font-medium">
                {FORCA_LABEL[priority.hipotese.forca_evidencia]}
              </span>
              <ChevronDown className="h-3 w-3 transition group-open/hip:rotate-180" />
            </span>
          </summary>
          <p className="mt-1.5 text-[11px] leading-relaxed opacity-80">{priority.hipotese.descricao}</p>
          <p className="mt-1.5 text-[11px] leading-relaxed opacity-70">
            <span className="font-semibold">Por que apareceu:</span> {priority.hipotese.por_que_foi_sugerida}
          </p>
          {priority.hipotese.perguntas_validacao.length > 0 && (
            <>
              <p className="mt-2 text-[11px] font-semibold opacity-80">Perguntas para validar com a equipe</p>
              <ul className="mt-1 space-y-1 text-[11px] leading-relaxed opacity-75">
                {priority.hipotese.perguntas_validacao.map(pergunta => (
                  <li key={pergunta} className="flex gap-1.5"><span aria-hidden>·</span>{pergunta}</li>
                ))}
              </ul>
            </>
          )}
          {priority.hipotese.caminhos_possiveis.length > 0 && (
            <>
              <p className="mt-2 text-[11px] font-semibold opacity-80">Caminhos possíveis</p>
              <ul className="mt-1 space-y-1 text-[11px] leading-relaxed opacity-75">
                {priority.hipotese.caminhos_possiveis.map(caminho => (
                  <li key={caminho.medida} className="flex gap-1.5"><span aria-hidden>·</span>{caminho.medida}</li>
                ))}
              </ul>
            </>
          )}
        </details>
      )}
      {target && priority.acao && (
        <Link to={target} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline">
          {priority.acao.label} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </article>
  );
};

/**
 * Bloco da leitura inteligente. NÃO é um card: mora dentro do card do
 * próximo passo, porque leitura e condução são a mesma conversa — dois
 * cartões lado a lado obrigavam o RH a descobrir sozinho que falavam do
 * mesmo ciclo.
 *
 * `etapaAtual` vem de quem já calculou o passo (a jornada é a fonte única);
 * este componente não recalcula nem discorda dela.
 */
export const RhBriefing: React.FC<{
  etapaAtual?: EtapaChave;
  /** Marcos de liderança com prazo em cima, calculados pela jornada. Entram
   *  DENTRO do card de prioridade correspondente — antes eram uma faixa
   *  âmbar separada, que repetia o assunto do card logo abaixo dela. */
  marcosVencendo?: { urgentes: number; dias: number };
  /** O passo calculado pela jornada. Vira o primeiro card, em verde. */
  passo?: PassoJornada;
  /** Compromissos do ciclo. Entram como DATA dentro dos cards. */
  ritmo?: CompromissoRitmo[];
}> = ({ etapaAtual, marcosVencendo, passo, ritmo = [] }) => {
  const [briefing, setBriefing] = useState<RhBriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Concorda com o título do card ("5 marco(s) pendente(s)"), então aqui
  // basta dizer quantos DESSES estão com a data em cima.
  const dataDe = (chave?: CompromissoRitmo['chave']) =>
    chave ? ritmo.find(item => item.chave === chave)?.quando ?? null : null;
  // Medição em curso: o instrumento que está com coleta aberta agora. É a
  // data que interessa a qualquer card sobre medir, seja ele o passo verde
  // ou o alerta de adesão.
  const medicaoEmCurso = ritmo.find(item =>
    (item.chave === 'who5' || item.chave === 'jss')
    && (item.situacao === 'em_andamento' || item.situacao === 'aguardando_encerramento'));

  const urgencia = marcosVencendo && marcosVencendo.urgentes > 0
    ? marcosVencendo.urgentes === 1
      ? `1 deles vence em até ${marcosVencendo.dias} dias`
      : `${marcosVencendo.urgentes} deles vencem em até ${marcosVencendo.dias} dias`
    : null;

  let prioridadeJaDita = etapaAtual
    ? PRIORIDADE_JA_DITA_PELO_PASSO[etapaAtual] ?? null
    : null;
  // Exceção à dedução: com prazo em cima, o card de liderança carrega uma
  // informação que o passo da jornada NÃO tem — a data. Esconder aqui
  // apagaria o único aviso de vencimento da tela.
  if (prioridadeJaDita === 'lideranca_pendente' && urgencia) prioridadeJaDita = null;

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

  // Sem retorno antecipado por carregando/erro: o card verde do próximo
  // passo precisa aparecer nos três estados. Só o CONTEÚDO DA LEITURA
  // depende da Edge Function; a condução, não.
  const prioridades = briefing
    ? briefing.prioridades
        .filter(item => item.id !== prioridadeJaDita)
        // Uma vaga da grade é do próximo passo, então sobram duas: três
        // cartões numa linha, sem quebrar para uma segunda fileira.
        .slice(0, passo ? 2 : 3)
    : [];
  // O bundle do app e as Edge Functions são publicados separadamente: uma
  // versão nova da tela pode conversar com uma função ainda sem estes
  // campos. Ausência vira lista vazia, não tela quebrada.
  const reavaliacoes = briefing?.reavaliacoes ?? [];

  const resumo = briefing?.resumo
    ?? (loading ? 'Atualizando a leitura dos dados…'
      : 'A leitura dos dados não pôde ser atualizada agora. O próximo passo ao lado continua valendo.');

  return (
    <section className="mt-5 border-t border-gray-100 pt-4" aria-labelledby="briefing-rh-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="briefing-rh-title" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#7d4a3c]">
            <Sparkles className="h-3.5 w-3.5" /> Leitura inteligente dos dados
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-600">{resumo}</p>
        </div>
        <button onClick={() => void load()} disabled={loading} title="Atualizar leitura" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {/* Prazo de liderança quando a leitura não carregou: o card que o
          exibiria não existe neste estado, e um aviso com data não pode
          depender do provedor de IA estar no ar. */}
      {!briefing && urgencia && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          <Clock className="h-3.5 w-3.5 shrink-0" /> Marcos de liderança pendentes: {urgencia.replace('deles ', '')}
        </p>
      )}

      {(passo || prioridades.length > 0) && (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {passo && (
            <ProximoPassoCard
              passo={passo}
              quando={passo.etapa === 'medir'
                ? medicaoEmCurso?.quando ?? null
                : dataDe(COMPROMISSO_DA_ETAPA[passo.etapa ?? 'setores'])}
            />
          )}
          {prioridades.map(priority => (
            <PriorityCard
              key={priority.id}
              priority={priority}
              urgencia={priority.id === 'lideranca_pendente' ? urgencia ?? undefined : undefined}
              quando={COMPROMISSO_DA_PRIORIDADE[priority.id]
                ? dataDe(COMPROMISSO_DA_PRIORIDADE[priority.id])
                // Cards de adesão e de linha de base falam da medição que
                // está rodando agora.
                : medicaoEmCurso?.quando ?? null}
            />
          ))}
        </div>
      )}

      {reavaliacoes.length > 0 && (
        <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4" aria-labelledby="reavaliacao-titulo">
          <h3 id="reavaliacao-titulo" className="text-sm font-semibold text-gray-800">
            O que aconteceu na reavaliação
          </h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">
            Comparação entre a medição que originou cada medida e o ciclo seguinte. É uma leitura
            descritiva do período: mostra como o indicador agregado se moveu, não que a medida
            tenha produzido o movimento.
          </p>
          <ul className="mt-3 space-y-2">
            {reavaliacoes.slice(0, 4).map(item => (
              <li key={`${item.plano_acao_id}-${item.indicador}`}
                  className={`rounded-lg border px-3 py-2 ${RESULTADO_CLS[item.classificacao]}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide opacity-75">
                  {RESULTADO_LABEL[item.classificacao]}
                </p>
                {item.medida && <p className="mt-0.5 text-xs font-medium">{item.medida}</p>}
                <p className="mt-1 text-[11px] leading-relaxed opacity-80">{item.narrativa}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {briefing && (briefing.tendencias.length > 0 || briefing.positivos.length > 0) && (
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
