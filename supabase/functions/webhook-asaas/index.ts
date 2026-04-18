// =====================================================
// NURA — Edge Function: webhook-asaas
// Processa eventos de pagamento e assinatura do Asaas.
// URL: /functions/v1/webhook-asaas
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY           = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ASAAS_WEBHOOK_SECRET  = Deno.env.get('ASAAS_WEBHOOK_SECRET')!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currentMonthRef(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function creditExpiry(monthReference: string): string {
  const ref = new Date(monthReference);
  const expiry = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  return expiry.toISOString();
}

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Handlers por evento ──────────────────────────────────────────────────────

async function handlePaymentConfirmed(payment: any): Promise<void> {
  const asaasSubId = payment?.subscription;
  if (!asaasSubId) return;

  // Buscar assinatura pelo ID Asaas
  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('id, user_id, status')
    .eq('asaas_subscription_id', asaasSubId)
    .maybeSingle();

  if (subError) throw subError;
  if (!sub) {
    console.warn(`[webhook-asaas] Subscription not found for asaas_id=${asaasSubId}`);
    return;
  }

  // Garantir que a assinatura está ativa
  if (sub.status !== 'active') {
    await supabase
      .from('subscriptions')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', sub.id);
  }

  const monthRef  = currentMonthRef();
  const expiresAt = creditExpiry(monthRef);

  // Guard de idempotência: verificar se já existe crédito ativo para este mês
  const { data: existing } = await supabase
    .from('consultation_credits')
    .select('id, status')
    .eq('subscription_id', sub.id)
    .eq('month_reference', monthRef)
    .not('status', 'in', '("expirada","perdida_cancelamento","cancelada_reagendada")')
    .maybeSingle();

  if (existing) {
    console.log(`[webhook-asaas] Credit already exists for sub=${sub.id} month=${monthRef}, skipping`);
    return;
  }

  // Criar crédito de consulta para o mês
  const { error: insertError } = await supabase
    .from('consultation_credits')
    .insert([{
      user_id: sub.user_id,
      subscription_id: sub.id,
      status: 'disponivel',
      month_reference: monthRef,
      expires_at: expiresAt,
    }]);

  if (insertError) throw insertError;
  console.log(`[webhook-asaas] Credit created for user=${sub.user_id} month=${monthRef}`);
}

async function handlePaymentInactive(payment: any): Promise<void> {
  const asaasSubId = payment?.subscription;
  if (!asaasSubId) return;

  await supabase
    .from('subscriptions')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('asaas_subscription_id', asaasSubId);

  console.log(`[webhook-asaas] Subscription inactive for asaas_id=${asaasSubId}`);
}

async function handleSubscriptionCancelled(body: any, payment: any): Promise<void> {
  // O evento pode conter o ID da assinatura de formas diferentes dependendo do tipo
  const asaasSubId = body.subscription?.id ?? payment?.subscription;
  if (!asaasSubId) return;

  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('asaas_subscription_id', asaasSubId);

  console.log(`[webhook-asaas] Subscription cancelled for asaas_id=${asaasSubId}`);
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Verificar autenticidade do webhook via token no header
  const token = req.headers.get('asaas-access-token');
  if (!token || token !== ASAAS_WEBHOOK_SECRET) {
    console.warn('[webhook-asaas] Unauthorized request - invalid token');
    return new Response('Unauthorized', { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const { event, payment } = body;
  console.log(`[webhook-asaas] Received event: ${event}`);

  try {
    switch (event) {
      // Pagamento confirmado ou recebido → gera crédito
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        await handlePaymentConfirmed(payment);
        break;

      // Pagamento atrasado, deletado ou reembolsado → inativa assinatura
      case 'PAYMENT_OVERDUE':
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
        await handlePaymentInactive(payment);
        break;

      // Assinatura cancelada
      case 'SUBSCRIPTION_DELETED':
      case 'SUBSCRIPTION_CANCELLED':
        await handleSubscriptionCancelled(body, payment);
        break;

      default:
        console.log(`[webhook-asaas] Unhandled event: ${event}`);
    }

    return jsonResponse({ ok: true, event });
  } catch (err) {
    console.error(`[webhook-asaas] Error processing event ${event}:`, err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
