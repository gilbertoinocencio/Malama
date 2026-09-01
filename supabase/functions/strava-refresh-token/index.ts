// =====================================================================
// Malama — integração Strava DESATIVADA (01/09/2026)
//
// Ver supabase/functions/strava-sync/index.ts para o motivo. Esta função
// renovava o access_token OAuth de quem já estava conectado — sem
// strava-oauth para criar conexão nova, deixá-la viva não tinha mais
// propósito. Os tokens existentes em strava_connections vão simplesmente
// expirar e parar de funcionar; não são apagados por aqui (ver decisão
// de dado histórico no cabeçalho de strava-sync).
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  return new Response(
    JSON.stringify({ error: 'Integração com o Strava foi descontinuada.' }),
    { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
