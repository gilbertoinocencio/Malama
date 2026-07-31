// =====================================================================
// MALAMA — Edge Function: compute-clinical-outcomes
// Calcula desfechos (peso/gordura/cintura/IMC) para cada conduta madura,
// vinculando conduta → desfecho em T+N (7/30/90 dias).
// Invocada por cron (pg_cron faz isso direto; esta function é p/ trigger
// manual/HTTP). Idempotente: só calcula o que ainda não existe.
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const HORIZONS = [7, 30, 90];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (token !== SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Nao autorizado' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const results: Record<string, number> = {};
    for (const h of HORIZONS) {
      const { data, error } = await supabase.rpc('compute_clinical_outcomes', { p_horizon_days: h });
      if (error) {
        console.error(`compute_clinical_outcomes(${h}) erro:`, error);
        results[`h${h}`] = -1;
      } else {
        results[`h${h}`] = (data as number) ?? 0;
      }
    }

    return new Response(JSON.stringify({ ok: true, computed: results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('compute-clinical-outcomes error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
