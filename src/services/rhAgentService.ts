import type { PassoJornada } from '../lib/rhJornada';
import { supabase } from './supabase';

export type RhAgentHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

export type RhAgentSuggestion =
  | { label: string; action: 'navigate'; target: string }
  | { label: string; action: 'prompt'; prompt: string }
  // Rascunho de item do plano de ação sugerido pela leitura de JSS/WHO-5.
  // Nunca grava sozinho: só leva a um formulário pré-preenchido para o RH
  // revisar e confirmar.
  | {
      label: string; action: 'nova_acao'; setor?: string; fator: string;
      risco_descricao: string; medida: string; nivel_controle: string;
    };

export type RhAgentReply = {
  message: string;
  suggestions: RhAgentSuggestion[];
  requestId?: string | null;
};

export type RhBriefingSeverity = 'critico' | 'atencao' | 'oportunidade' | 'positivo' | 'informativo';

export type RhBriefingTrend = {
  id: string;
  label: string;
  atual: number;
  anterior: number;
  delta: number;
  direcao: 'melhorou' | 'piorou' | 'estavel';
  favoravel_quando: 'sobe' | 'cai';
  periodo_atual: { inicio?: string; fim?: string } | null;
  periodo_anterior: { inicio?: string; fim?: string } | null;
  n_atual: number;
  n_anterior: number;
};

/**
 * Força da evidência em CATEGORIA, nunca em porcentagem — não há método
 * defensável para uma probabilidade aqui. A definição determinística de
 * cada uma vive em supabase/functions/_shared/psicossocial-logica.ts.
 */
export type RhForcaEvidencia =
  'evidencia_insuficiente' | 'sinal_inicial' | 'padrao_recorrente' | 'padrao_consistente';

/**
 * Hipótese sobre fatores que vale investigar. NÃO é diagnóstico e não
 * afirma causa: descreve com o que o padrão observado é compatível e traz
 * as perguntas que validam isso com as equipes.
 */
export type RhHipotese = {
  id?: string;
  setor: string | null;
  indicador: string;
  fator: string;
  descricao: string;
  por_que_foi_sugerida: string;
  perguntas_validacao: string[];
  caminhos_possiveis: { medida: string; nivel_controle: string }[];
  forca_evidencia: RhForcaEvidencia;
  origem: string;
  /** Organização declarada do setor, em uma linha. Contexto, não evidência. */
  contexto_setor?: string | null;
  /** Confundidores a ler ANTES do número: pico sazonal, evento da empresa, calor. */
  ressalvas?: string[];
  /** Outros dados da empresa na mesma direção (absenteísmo cap. F, ambulatório). Convergência, não causa. */
  convergencias?: string[];
};

/**
 * Resultado observado de uma medida num ciclo posterior. `classificacao`
 * descreve o movimento do indicador no período, nunca o efeito da medida.
 */
export type RhReavaliacao = {
  plano_acao_id: string;
  campanha_followup_id?: string;
  setor: string | null;
  indicador: string;
  classificacao: 'favoravel' | 'estavel' | 'desfavoravel' | 'inconclusivo';
  comparabilidade: string;
  /** Estado da medida no cálculo: 'executada' | 'em_andamento' | 'nao_executada' | 'cancelada'. */
  execucao?: string;
  narrativa: string;
  medida?: string;
  nivel_controle?: string | null;
};

export type RhDirecaoFechamento = 'melhorou' | 'piorou' | 'estavel' | 'sem_par';

/**
 * Recap determinístico do último ciclo encerrado, calculado UMA vez na Edge
 * Function (supabase/functions/_shared/fechamento-ciclo.ts). A tela de
 * fechamento, o PDF do ciclo e o copiloto leem este mesmo objeto.
 */
export type RhFechamentoCiclo = {
  campanha: {
    id: string; instrumento: 'who5' | 'jss'; instrumento_nome: string;
    janela_inicio: string | null; janela_fim: string | null; encerrada_em: string | null;
    n_convidados: number; n_respondentes: number; leitura_registrada_em: string | null;
  };
  anterior: {
    id: string; instrumento: 'who5' | 'jss'; instrumento_nome: string;
    janela_inicio: string | null; janela_fim: string | null; encerrada_em: string | null;
    n_convidados: number; n_respondentes: number;
  } | null;
  dias_desde_encerramento: number;
  pendente: boolean;
  comparabilidade: 'mesma_epoca' | 'estacoes_diferentes' | 'pico_vs_fora_de_pico' | 'indeterminada';
  comparabilidade_texto: string;
  indicadores: {
    id: string; label: string; atual: number | null; anterior: number | null; delta: number | null;
    direcao: RhDirecaoFechamento; favoravel_quando: 'sobe' | 'cai'; n_atual: number; n_anterior: number;
  }[];
  setores: {
    setor: string; atual: number | null; anterior: number | null; delta: number | null;
    direcao: RhDirecaoFechamento; suprimido: boolean;
  }[];
  setores_suprimidos: number;
  medidas_no_intervalo: {
    id: string; setor: string | null; medida: string; nivel_controle: string;
    status: string; concluida_em: string | null;
  }[];
  resultados: RhReavaliacao[];
  proximo_pico: string | null;
  resumo: string;
};

export type RhBriefingPriority = {
  id: string;
  severidade: RhBriefingSeverity;
  titulo: string;
  descricao: string;
  evidencias: string[];
  acao?: { label: string; target: string };
  medida_sugerida?: {
    setor?: string;
    fator: string;
    risco_descricao: string;
    medida: string;
    nivel_controle: string;
    metrica_sucesso: string;
    abordagem_lideranca: string;
    /** Liga a medida ao ciclo que a originou. Ausente = sem linha de base. */
    hipotese_id?: string;
  };
  hipotese?: RhHipotese;
};

export type RhBriefing = {
  gerado_em: string;
  situacao: 'critico' | 'atencao' | 'estavel';
  resumo: string;
  prioridades: RhBriefingPriority[];
  tendencias: RhBriefingTrend[];
  /** O que vale investigar neste ciclo. */
  hipoteses: RhHipotese[];
  /** O que aconteceu na reavaliação das medidas com linha de base. */
  reavaliacoes: RhReavaliacao[];
  /** Recap do último ciclo encerrado; null fora da janela de leitura. */
  fechamento_ciclo?: RhFechamentoCiclo | null;
  positivos: string[];
  qualidade_dados: {
    comparacoes_disponiveis: number;
    dados_suprimidos: string[];
    nota: string;
  };
};

type FunctionError = { context?: Response; message?: string };

async function mensagemDoErro(error: FunctionError, fallback: string) {
  const response = error.context;
  if (response && typeof response.clone === 'function') {
    try {
      const body = await response.clone().json();
      if (typeof body?.error === 'string') return body.error;
    } catch { /* usa fallback */ }
  }
  return error.message || fallback;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('rh-agent', { body });
  if (error) throw new Error(await mensagemDoErro(error as FunctionError, 'Copiloto indisponível'));
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const rhAgentService = {
  /** Acorda o Caramel sem bloquear a abertura do painel. */
  async warmup(): Promise<void> {
    await invoke<{ status: string }>({ action: 'warmup' });
  },

  async obterBriefing(): Promise<RhBriefing> {
    const data = await invoke<{ briefing: RhBriefing }>({ action: 'briefing' });
    return data.briefing;
  },

  async conversar(params: {
    message: string;
    history: RhAgentHistoryItem[];
    screen: string;
    visibleStep: PassoJornada;
  }): Promise<RhAgentReply> {
    return invoke<RhAgentReply>({ action: 'chat', ...params });
  },
};
