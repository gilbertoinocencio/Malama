// =====================================================
// Malama — Edge Function: Excluir a própria conta
// Exigência da App Store (Guideline 5.1.1(v)): o usuário deve poder iniciar
// e concluir a exclusão da conta de dentro do app.
//
// Modelo (decidido 12/07/2026): pseudonimização, não hard delete puro.
// A conta de login (auth.users) é apagada de verdade; registros clínicos,
// nutricionais e chats sobrevivem órfãos, vinculados ao UUID antigo
// (as FKs foram removidas na migration 20260712_delete_account_foundation).
// account_deletions guarda SHA-256(email + pepper) para religação futura
// se o usuário voltar ("retoma com seu histórico").
//
// Ordem: cancelar Asaas → revogar tokens → limpar storage biométrico →
// finalize_account_deletion (RPC transacional) → deleteUser.
// Etapas externas são best-effort: falha vira warning, nunca impede a
// exclusão (o fluxo da Apple não pode travar por indisponibilidade de
// terceiros). A RPC e o deleteUser são obrigatórios.
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
const ASAAS_ENV     = Deno.env.get('ASAAS_ENV') ?? 'sandbox';
const ASAAS_BASE_URL = ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

// Pepper do hash de religação. Sem ele o hash ainda é gerado (a exclusão
// nunca pode falhar por config ausente), mas fica vulnerável a força bruta
// de emails — configurar via `supabase secrets set DELETE_EMAIL_PEPPER=...`
const EMAIL_PEPPER = Deno.env.get('DELETE_EMAIL_PEPPER') ?? '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Cancela assinaturas Asaas ativas (senão a cobrança continua num fantasma)
async function cancelAsaasSubscriptions(userId: string, warnings: string[]) {
  const { data: subs, error } = await supabaseAdmin
    .from('subscriptions')
    .select('id, asaas_subscription_id, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .not('asaas_subscription_id', 'is', null);

  if (error) {
    warnings.push(`subscriptions: ${error.message}`);
    return;
  }
  if (!subs?.length) return;

  if (!ASAAS_API_KEY) {
    warnings.push('Asaas: assinatura ativa encontrada mas ASAAS_API_KEY ausente — cancelar manualmente');
    return;
  }

  for (const sub of subs) {
    try {
      const res = await fetch(`${ASAAS_BASE_URL}/subscriptions/${sub.asaas_subscription_id}`, {
        method: 'DELETE',
        headers: { 'access_token': ASAAS_API_KEY },
      });
      if (!res.ok) warnings.push(`Asaas ${sub.asaas_subscription_id}: HTTP ${res.status}`);
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', sub.id);
    } catch (e) {
      warnings.push(`Asaas ${sub.asaas_subscription_id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

// Revoga o acesso no Strava (o token some no cascade, mas a autorização
// no provider só morre com o deauthorize)
async function revokeStrava(userId: string, warnings: string[]) {
  const { data: conn } = await supabaseAdmin
    .from('strava_connections')
    .select('access_token')
    .eq('user_id', userId)
    .maybeSingle();

  if (!conn?.access_token) return;
  try {
    await fetch('https://www.strava.com/oauth/deauthorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `access_token=${encodeURIComponent(conn.access_token)}`,
    });
  } catch (e) {
    warnings.push(`Strava deauthorize: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Revoga o token Google Fit (Health Connect é on-device, não tem token)
async function revokeGoogleFit(userId: string, warnings: string[]) {
  const { data: integ } = await supabaseAdmin
    .from('user_integrations')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .eq('service', 'google_fit')
    .maybeSingle();

  const token = integ?.refresh_token || integ?.access_token;
  if (!token) return;
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch (e) {
    warnings.push(`Google revoke: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Remove todos os arquivos de uma pasta {userId} de um bucket
async function purgeStorageFolder(bucket: string, folder: string, warnings: string[]) {
  try {
    const { data: files, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(folder, { limit: 1000 });
    if (error) {
      warnings.push(`storage ${bucket}/${folder}: ${error.message}`);
      return;
    }
    const paths = (files ?? [])
      .filter((f) => f.id) // ignora subpastas
      .map((f) => `${folder}/${f.name}`);
    if (paths.length) {
      const { error: rmError } = await supabaseAdmin.storage.from(bucket).remove(paths);
      if (rmError) warnings.push(`storage ${bucket}: ${rmError.message}`);
    }
  } catch (e) {
    warnings.push(`storage ${bucket}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autorizado' }, 401);

  // Identifica o chamador pelo próprio token — garante que só apaga a si mesmo.
  const { data: caller, error: callerError } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (callerError || !caller?.user) return json({ error: 'Sessão inválida' }, 401);

  const userId = caller.user.id;
  const email = caller.user.email ?? '';
  const warnings: string[] = [];

  try {
    // ---- Best-effort: terceiros e storage (falha não bloqueia) ----
    await cancelAsaasSubscriptions(userId, warnings);
    await revokeStrava(userId, warnings);
    await revokeGoogleFit(userId, warnings);

    // Fotos corporais são biométricas: apagar sempre. As MEDIÇÕES ficam
    // (body_scan_measurements etc.), então o histórico de composição
    // sobrevive para o caso de o usuário voltar — só as fotos morrem.
    await purgeStorageFolder('body-scans', userId, warnings);
    // Comunidade é apagada por inteiro (decisão de produto): mídia junto.
    await purgeStorageFolder('community-media', `community/${userId}`, warnings);

    // ---- Obrigatório: limpeza transacional DB-side ----
    if (!EMAIL_PEPPER) warnings.push('DELETE_EMAIL_PEPPER ausente — hash de religação sem pepper');
    const emailHash = await sha256Hex(`${email.toLowerCase()}:${EMAIL_PEPPER}`);

    const { error: rpcError } = await supabaseAdmin.rpc('finalize_account_deletion', {
      p_user_id: userId,
      p_email: email,
      p_email_hash: emailHash,
    });
    if (rpcError) return json({ error: `Falha ao finalizar exclusão: ${rpcError.message}` }, 500);

    // ---- Obrigatório: apaga a conta de login ----
    // O cascade leva profiles, comunidade, notificações, tokens e afins.
    // As tabelas clínicas/nutricionais/chats ficam órfãs por design.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return json({ error: error.message }, 400);

    return json({ success: true, warnings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
