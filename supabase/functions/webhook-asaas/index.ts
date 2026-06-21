// =====================================================
// NURA — Edge Function: webhook-asaas
// Processa eventos de pagamento e assinatura do Asaas.
// URL: /functions/v1/webhook-asaas
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { brandedEmailHtml, sendEmail } from '../_shared/emails.ts';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY           = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ASAAS_WEBHOOK_SECRET  = Deno.env.get('ASAAS_WEBHOOK_SECRET')!;
const ADMIN_ALERT_EMAIL     = Deno.env.get('ADMIN_ALERT_EMAIL'); // opcional

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currentMonthRef(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Validade do crédito: 30 dias a partir do pagamento (prazo para AGENDAR). */
function rollingExpiry(): string {
  return new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
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

  const monthRef  = currentMonthRef(); // apenas rótulo/relatório
  const expiresAt = rollingExpiry();   // 30 dias a partir do pagamento

  // Guard de idempotência: já existe crédito ATIVO (disponivel/agendada) para
  // esta assinatura? Regra: um crédito ativo por assinatura por vez. Se o
  // anterior já foi usado/expirou, um novo pagamento gera um novo crédito.
  const { data: existing } = await supabase
    .from('consultation_credits')
    .select('id')
    .eq('subscription_id', sub.id)
    .in('status', ['disponivel', 'agendada'])
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`[webhook-asaas] Active credit already exists for sub=${sub.id}, skipping`);
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

// ─── B2B: faturas de empresa ────────────────────────────────────────────────

// Pagamento de fatura B2B confirmado → marca paga e, se a empresa estava
// bloqueada por inadimplência, REATIVA automaticamente o acesso.
async function handleEmpresaPaid(payment: any): Promise<void> {
  const paymentId = payment?.id;
  if (!paymentId) return;

  const { data: fatura } = await supabase
    .from('empresa_faturas')
    .select('id, empresa_id, valor')
    .eq('asaas_payment_id', paymentId)
    .maybeSingle();
  if (!fatura) return; // não é fatura B2B

  await supabase
    .from('empresa_faturas')
    .update({ status: 'pago', pago_em: new Date().toISOString() })
    .eq('id', fatura.id);

  const { data: empresa } = await supabase
    .from('empresas')
    .select('id, nome, acesso_bloqueado')
    .eq('id', fatura.empresa_id)
    .single();

  if (empresa?.acesso_bloqueado) {
    await supabase
      .from('empresas')
      .update({ acesso_bloqueado: false, bloqueado_em: null, bloqueio_motivo: null })
      .eq('id', empresa.id);

    await supabase.from('empresa_billing_eventos').insert([{
      empresa_id: empresa.id,
      tipo: 'reativacao',
      descricao: 'Pagamento confirmado — acesso dos colaboradores reativado automaticamente.',
    }]);

    // Notifica o RH (best-effort)
    const { data: rh } = await supabase
      .from('rh_usuarios')
      .select('email')
      .eq('empresa_id', empresa.id)
      .maybeSingle();
    if (rh?.email) {
      await sendEmail({
        to: rh.email,
        subject: 'Acesso Malama reativado',
        html: brandedEmailHtml({
          heading: `Acesso <em style="font-style:italic;color:#8c473e;">reativado</em>.`,
          bodyParagraphs: [
            `Recebemos o pagamento da <strong>${empresa.nome}</strong>.`,
            `O acesso dos seus colaboradores ao benefício Malama foi restabelecido automaticamente.`,
          ],
        }),
        text: `Recebemos o pagamento da ${empresa.nome}. O acesso dos colaboradores ao benefício Malama foi reativado.`,
      });
    }
  }

  console.log(`[webhook-asaas] Fatura B2B paga: ${fatura.id}`);
}

// Fatura B2B vencida → marca atrasada e ALERTA o admin (NÃO bloqueia — decisão manual).
async function handleEmpresaOverdue(payment: any): Promise<void> {
  const paymentId = payment?.id;
  if (!paymentId) return;

  const { data: fatura } = await supabase
    .from('empresa_faturas')
    .select('id, empresa_id, valor, vencimento')
    .eq('asaas_payment_id', paymentId)
    .maybeSingle();
  if (!fatura) return; // não é fatura B2B

  await supabase.from('empresa_faturas').update({ status: 'atrasado' }).eq('id', fatura.id);

  const { data: empresa } = await supabase
    .from('empresas').select('nome').eq('id', fatura.empresa_id).single();

  await supabase.from('empresa_billing_eventos').insert([{
    empresa_id: fatura.empresa_id,
    tipo: 'inadimplente',
    descricao: `Fatura vencida em ${fatura.vencimento} (R$ ${Number(fatura.valor).toFixed(2)}). Decisão de bloqueio é manual.`,
  }]);

  if (ADMIN_ALERT_EMAIL) {
    await sendEmail({
      to: ADMIN_ALERT_EMAIL,
      subject: `Empresa inadimplente: ${empresa?.nome ?? fatura.empresa_id}`,
      html: brandedEmailHtml({
        eyebrow: 'Malama Admin',
        heading: `Fatura <em style="font-style:italic;color:#8c473e;">vencida</em>.`,
        bodyParagraphs: [
          `A empresa <strong>${empresa?.nome ?? ''}</strong> está com fatura vencida (R$ ${Number(fatura.valor).toFixed(2)}, venc. ${fatura.vencimento}).`,
          `Nenhuma ação automática foi tomada. Decida no painel: bloquear acesso ou manter ativo.`,
        ],
      }),
      text: `Empresa ${empresa?.nome ?? ''} inadimplente. Fatura R$ ${Number(fatura.valor).toFixed(2)} venc. ${fatura.vencimento}. Decisão de bloqueio é manual no painel admin.`,
    });
  }

  console.log(`[webhook-asaas] Fatura B2B atrasada: ${fatura.id}`);
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
      // Pagamento confirmado ou recebido → gera crédito (B2C) e/ou quita fatura (B2B)
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        await handlePaymentConfirmed(payment);
        await handleEmpresaPaid(payment);
        break;

      // Pagamento atrasado, deletado ou reembolsado → inativa assinatura (B2C)
      case 'PAYMENT_OVERDUE':
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
        await handlePaymentInactive(payment);
        if (event === 'PAYMENT_OVERDUE') await handleEmpresaOverdue(payment);
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
