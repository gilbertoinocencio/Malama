import type { PassoJornada } from '../lib/rhJornada';
import type { EmpresaContextoOperacionalInput } from './empresaService';
import { supabase } from './supabase';

export type RhProfileDraft = EmpresaContextoOperacionalInput & {
  /** Sugestões para revisão no cadastro de setores; nunca são criadas pela IA. */
  setores_sugeridos: string[];
};

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
  };
};

export type RhBriefing = {
  gerado_em: string;
  situacao: 'critico' | 'atencao' | 'estavel';
  resumo: string;
  prioridades: RhBriefingPriority[];
  tendencias: RhBriefingTrend[];
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

  async criarRascunhoPerfil(description: string): Promise<RhProfileDraft> {
    const data = await invoke<{ draft: RhProfileDraft }>({
      action: 'profile_draft', description,
    });
    return data.draft;
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
