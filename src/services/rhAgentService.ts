import type { PassoJornada } from '../lib/rhJornada';
import type { EmpresaContextoOperacionalInput } from './empresaService';
import { supabase } from './supabase';

export type RhAgentHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

export type RhAgentSuggestion =
  | { label: string; action: 'navigate'; target: string }
  | { label: string; action: 'prompt'; prompt: string };

export type RhAgentReply = {
  message: string;
  suggestions: RhAgentSuggestion[];
  requestId?: string | null;
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

  async criarRascunhoPerfil(description: string): Promise<EmpresaContextoOperacionalInput> {
    const data = await invoke<{ draft: EmpresaContextoOperacionalInput }>({
      action: 'profile_draft', description,
    });
    return data.draft;
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

