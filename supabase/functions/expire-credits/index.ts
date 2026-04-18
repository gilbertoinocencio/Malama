// =====================================================
// NURA — Edge Function: expire-credits
// Expira créditos de consulta vencidos.
// Invocado via pg_cron todo dia às 00:05 UTC.
// URL: /functions/v1/expire-credits
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (_req: Request) => {
  try {
    const now = new Date().toISOString();

    // Buscar e expirar todos os créditos disponíveis ou agendados que passaram do prazo
    const { data, error } = await supabase
      .from('consultation_credits')
      .update({
        status: 'expirada',
        updated_at: now,
      })
      .in('status', ['disponivel', 'agendada'])
      .lt('expires_at', now)
      .select('id, user_id, month_reference');

    if (error) throw error;

    const expiredCount = data?.length ?? 0;
    console.log(`[expire-credits] Expired ${expiredCount} credits at ${now}`);

    return new Response(
      JSON.stringify({ expired: expiredCount, timestamp: now }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[expire-credits] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
