// =====================================================
// Malama — Edge Function: Gerar cobrança B2B da empresa (Asaas)
// Chamada pelo super admin. Cria/garante o customer Asaas da empresa,
// emite a cobrança (BOLETO/PIX), grava em empresa_faturas e registra evento.
// URL: /functions/v1/empresa-cobranca
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')!;
const ASAAS_ENV     = Deno.env.get('ASAAS_ENV') ?? 'sandbox';
const ASAAS_BASE_URL = ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function asaas(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Asaas ${res.status} (${path}): ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autorizado' }, 401);

  // Só super_admin
  const { data: caller } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (caller?.user?.user_metadata?.role !== 'super_admin') {
    return json({ error: 'Acesso restrito ao super admin' }, 403);
  }

  try {
    const { empresa_id, vencimento, billing_type } = await req.json();
    if (!empresa_id) return json({ error: 'empresa_id é obrigatório' }, 400);
    if (!vencimento) return json({ error: 'vencimento (YYYY-MM-DD) é obrigatório' }, 400);
    const billingType = ['BOLETO', 'PIX', 'UNDEFINED'].includes(billing_type) ? billing_type : 'UNDEFINED';

    // 1. Carregar empresa
    const { data: empresa, error: empErr } = await supabaseAdmin
      .from('empresas')
      .select('id, nome, cnpj, cobranca_email, responsavel_email, valor_por_assento, asaas_customer_id')
      .eq('id', empresa_id)
      .single();
    if (empErr || !empresa) return json({ error: 'Empresa não encontrada' }, 404);
    if (empresa.valor_por_assento == null) {
      return json({ error: 'Defina o valor por assento da empresa antes de cobrar' }, 422);
    }

    // 2. Assentos ocupados (ativo + convidado) → valor da fatura
    const { count } = await supabaseAdmin
      .from('empresa_colaboradores')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresa_id)
      .in('status', ['ativo', 'convidado']);
    const assentos = count ?? 0;
    if (assentos === 0) return json({ error: 'Empresa sem colaboradores para cobrar' }, 422);
    const valor = Number((assentos * Number(empresa.valor_por_assento)).toFixed(2));

    // 3. Garantir customer Asaas
    let customerId = empresa.asaas_customer_id;
    if (!customerId) {
      const cust = await asaas('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: empresa.nome,
          cpfCnpj: (empresa.cnpj ?? '').replace(/\D/g, '') || undefined,
          email: empresa.cobranca_email ?? empresa.responsavel_email ?? undefined,
        }),
      });
      customerId = cust.id;
      await supabaseAdmin.from('empresas').update({ asaas_customer_id: customerId }).eq('id', empresa_id);
    }

    // 4. Criar registro de fatura (para externalReference) — competência = mês do vencimento
    const competencia = `${vencimento.slice(0, 7)}-01`;
    const { data: fatura, error: fatErr } = await supabaseAdmin
      .from('empresa_faturas')
      .insert([{ empresa_id, competencia, valor, vencimento, status: 'pendente' }])
      .select()
      .single();
    if (fatErr) return json({ error: fatErr.message }, 400);

    // 5. Criar cobrança no Asaas
    const payment = await asaas('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType,
        value: valor,
        dueDate: vencimento,
        description: `Malama — benefício corporativo (${assentos} assentos) — ${competencia.slice(0, 7)}`,
        externalReference: fatura.id,
      }),
    });

    // 6. PIX QR (quando aplicável)
    let pixPayload: string | null = null;
    if (billingType === 'PIX' || billingType === 'UNDEFINED') {
      try {
        const pix = await asaas(`/payments/${payment.id}/pixQrCode`);
        pixPayload = pix?.payload ?? null;
      } catch { /* boleto-only ou PIX indisponível: ignora */ }
    }

    // 7. Atualizar fatura com dados do Asaas
    await supabaseAdmin
      .from('empresa_faturas')
      .update({
        asaas_payment_id:   payment.id,
        asaas_invoice_url:  payment.invoiceUrl ?? null,
        asaas_bankslip_url: payment.bankSlipUrl ?? null,
        asaas_pix_payload:  pixPayload,
      })
      .eq('id', fatura.id);

    // 8. Evento
    await supabaseAdmin.from('empresa_billing_eventos').insert([{
      empresa_id,
      tipo: 'cobranca_gerada',
      descricao: `Cobrança de R$ ${valor.toFixed(2)} gerada (venc. ${vencimento}, ${assentos} assentos).`,
    }]);

    return json({
      ok: true,
      fatura_id: fatura.id,
      valor,
      assentos,
      invoice_url: payment.invoiceUrl ?? null,
      bankslip_url: payment.bankSlipUrl ?? null,
      pix_payload: pixPayload,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
