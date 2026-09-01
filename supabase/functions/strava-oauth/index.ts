// =====================================================================
// Malama — integração Strava DESATIVADA (2026-09-01)
//
// Ver supabase/functions/strava-webhook/index.ts para o motivo. Esta
// função iniciava o fluxo OAuth de uma nova conexão — desligada para que
// ninguém consiga mais conectar o Strava, mesmo que o botão ainda exista
// no app (remoção do frontend fica para a tarefa de remoção completa).
// =====================================================================

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  return new Response(
    JSON.stringify({ error: 'Integração com o Strava foi descontinuada.' }),
    { status: 410, headers: { ...cors, 'Content-Type': 'application/json' } },
  );
});
