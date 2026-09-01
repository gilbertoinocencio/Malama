// =====================================================================
// Malama — integração Strava DESATIVADA (2026-09-01)
//
// Ver supabase/functions/strava-webhook/index.ts para o motivo. Esta
// função trocava o code do OAuth por tokens e criava a conexão —
// desligada pelo mesmo motivo que strava-oauth.
// =====================================================================

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  return new Response(
    JSON.stringify({ error: 'Integração com o Strava foi descontinuada.' }),
    { status: 410, headers: { ...cors, 'Content-Type': 'application/json' } },
  );
});
