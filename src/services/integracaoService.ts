// =====================================================
// Malama — Integrações externas (admin)
//
// Hoje só o Asaas. A tela existe porque a cobrança B2B inteira depende de um
// webhook que ninguém consegue enxergar: se o Asaas parar de entregar evento,
// nada quebra visivelmente — as faturas só deixam de ser quitadas e os
// créditos deixam de ser emitidos, em silêncio.
//
// Nenhuma credencial do Asaas passa por aqui. A API key vive como secret de
// Edge Function (ASAAS_API_KEY / ASAAS_WEBHOOK_SECRET) e nunca é exposta ao
// navegador — nem para o super admin. O painel mostra apenas SE está
// configurada, nunca o valor.
// =====================================================

import { supabase } from './supabase';

export interface IntegracaoEvento {
  id: string;
  origem: string;
  evento: string;
  referencia: string | null;
  status: 'ok' | 'erro' | 'ignorado';
  detalhe: string | null;
  created_at: string;
}

export interface IntegracaoStatus {
  eventos: IntegracaoEvento[];
  erros_7d: number;
  ultimo_evento: string | null;
}

export interface WebhookSaude {
  alcancavel: boolean;
  segredo_configurado: boolean;
  alerta_admin_configurado: boolean;
  eventos_tratados: string[];
  erro?: string;
}

/** URL que deve ser cadastrada no painel do Asaas. */
export function webhookUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL ?? '';
  return `${base}/functions/v1/webhook-asaas`;
}

/**
 * Últimos eventos recebidos. Retorna null se o chamador não for super admin —
 * a RPC decide isso no banco, não aqui.
 */
export async function getIntegracaoStatus(limite = 20): Promise<IntegracaoStatus | null> {
  const { data, error } = await supabase.rpc('admin_integracao_status', { p_limite: limite });
  if (error) throw error;
  return (data as IntegracaoStatus | null) ?? null;
}

/**
 * Bate na própria Edge Function para saber se está publicada e se o segredo
 * está setado.
 *
 * A função roda com verify_jwt = false (o Asaas não manda JWT), então ela
 * mesma valida o super admin no GET. Mandamos o token da sessão para isso.
 */
export async function getWebhookSaude(): Promise<WebhookSaude> {
  const vazio: WebhookSaude = {
    alcancavel: false,
    segredo_configurado: false,
    alerta_admin_configurado: false,
    eventos_tratados: [],
  };

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return { ...vazio, erro: 'Sessão expirada.' };

    const res = await fetch(webhookUrl(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      // 404 aqui quase sempre significa "function nunca foi deployada" — que é
      // exatamente a falha que esta tela existe para tornar visível.
      return {
        ...vazio,
        erro: res.status === 404
          ? 'Function não encontrada. Rode: supabase functions deploy webhook-asaas'
          : `Resposta ${res.status} da function.`,
      };
    }

    const body = await res.json();
    return {
      alcancavel: true,
      segredo_configurado: Boolean(body.segredo_configurado),
      alerta_admin_configurado: Boolean(body.alerta_admin_configurado),
      eventos_tratados: body.eventos_tratados ?? [],
    };
  } catch (e) {
    return { ...vazio, erro: e instanceof Error ? e.message : 'Falha de rede.' };
  }
}
