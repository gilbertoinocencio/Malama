// =====================================================
// Malama — Edge Function: validate-crm
// Valida CRM médico via API pública do CFM
// POST { crm: string, uf: string }
// → { valid: boolean, name?: string, situation?: string, specialty?: string }
// =====================================================

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return err('Method not allowed', 405);

  let body: { crm: string; uf: string };
  try {
    body = await req.json();
  } catch {
    return err('JSON inválido');
  }

  const { crm, uf } = body;

  if (!crm || !uf) return err('crm e uf são obrigatórios');

  const ufClean = String(uf).toUpperCase().trim();
  if (!/^[A-Z]{2}$/.test(ufClean)) return err('UF inválida');

  const crmClean = crm.replace(/\D/g, '');
  if (crmClean.length < 4 || crmClean.length > 7) return err('Formato de CRM inválido');

  try {
    const cfmUrl = `https://portal.cfm.org.br/api/v1/medicos/?crm=${crmClean}&uf=${ufClean}`;

    const response = await fetch(cfmUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Malama-Platform/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return err('Serviço do CFM indisponível. Tente novamente.', 503);
    }

    const data = await response.json();

    // A API do CFM retorna { items: [...], total: number }
    const items: any[] = data?.items ?? data?.medicos ?? [];

    if (!items.length) {
      return ok({ valid: false });
    }

    const medico = items[0];
    const situacao: string = medico.situacao ?? medico.situation ?? '';
    const ativo = situacao.toLowerCase().includes('ativ');

    return ok({
      valid: ativo,
      name: medico.nome ?? medico.name ?? null,
      situation: situacao || null,
      specialty: medico.especialidade ?? medico.specialty ?? null,
    });
  } catch (e: any) {
    if (e?.name === 'TimeoutError') {
      return err('Tempo limite atingido ao consultar o CFM. Tente novamente.', 504);
    }
    console.error('[validate-crm]', e);
    return err('Falha ao consultar o CFM. Tente novamente mais tarde.', 503);
  }
});
