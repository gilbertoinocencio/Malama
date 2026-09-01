// =====================================================================
// Malama — integração Strava DESATIVADA (01/09/2026)
//
// Remoção completa da integração: a plataforma cobre atividade física só
// por Apple HealthKit e Google Health Connect agora. strava-oauth,
// strava-oauth-callback e strava-webhook já tinham sido desligadas antes
// (ver seus index.ts); esta e strava-refresh-token fecham o conjunto —
// sem elas, ninguém mais consegue se conectar, mas ainda dava pra
// sincronizar quem já estava conectado. Como não sobra caminho para uma
// conexão nova, mantê-las vivas não tinha mais propósito.
//
// Histórico de activities já sincronizado (service='strava') não foi
// apagado — é dado do próprio usuário, não credencial. O que para aqui é
// só a busca de novas atividades na API do Strava.
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
