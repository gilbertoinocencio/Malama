// =====================================================================
// Malama — integração Strava DESATIVADA (2026-09-01)
//
// A plataforma passou a cobrir dados de atividade física por
// Apple HealthKit e Google Health Connect — on-device, sem OAuth de
// terceiro e sem a superfície de webhook que esta função representava.
// A auditoria de segurança de 01/09/2026 (achado F4) apontou que este
// endpoint aceitava POST sem autenticação e escrevia no banco com
// service_role. Em vez de autenticar um endpoint que não serve mais a
// nenhum propósito do produto, ele foi desligado — decommissionar é mais
// seguro que proteger algo que ninguém deveria mais poder chamar.
//
// O arquivo continua aqui (em vez de apagado) só para a remoção completa
// da integração — código de frontend, tabelas, migrations — ser feita
// como uma tarefa própria depois, sem pressa. Enquanto isso, esta função
// não lê nem escreve nada: para o Strava, é como se o endpoint não
// existisse mais.
//
// Depois do deploy, apague a assinatura de webhook no Strava
// (DELETE /api/v3/push_subscriptions/{id}) — não é obrigatório por
// segurança (esta função não faz nada mesmo que o Strava continue
// chamando), mas evita retries inúteis do lado deles.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  return new Response(
    JSON.stringify({ error: 'Integração com o Strava foi descontinuada.' }),
    { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
