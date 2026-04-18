// =====================================================
// NURA — Edge Function: process-payouts
// Split quinzenal de repasses aos médicos via Asaas.
// Invocado via pg_cron nos dias 15 e 28 às 02:00 UTC,
// ou manualmente com { payout_id } para reprocessar falha.
// URL: /functions/v1/process-payouts
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')!;
const ASAAS_ENV    = Deno.env.get('ASAAS_ENV') ?? 'sandbox';

const ASAAS_BASE_URL = ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const DOCTOR_VALUE_PER_CONSULTATION = 100; // R$100 por consulta realizada

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Asaas API ────────────────────────────────────────────────────────────────

interface AsaasTransferResponse {
  id: string;
  status: string;
}

async function createAsaasTransfer(
  pixKey: string,
  amount: number,
  description: string
): Promise<AsaasTransferResponse> {
  const res = await fetch(`${ASAAS_BASE_URL}/transfers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
    },
    body: JSON.stringify({
      operationType: 'PIX',
      pixAddressKey: pixKey,
      value: amount,
      description,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Asaas transfer failed (${res.status}): ${errText}`);
  }

  return res.json();
}

// ─── Determinar período do split ──────────────────────────────────────────────

function determinePeriod(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDate();

  if (day <= 15) {
    // Executado no dia 15: processa consultas de 1-14 do mês corrente
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const end   = new Date(now.getFullYear(), now.getMonth(), 14, 23, 59, 59);
    return { start, end };
  } else {
    // Executado no dia 28+: processa consultas de 15 até fim do mês corrente
    const start = new Date(now.getFullYear(), now.getMonth(), 15, 0, 0, 0);
    // Último dia do mês
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }
}

// ─── Processar um único payout (para reprocessamento de falha) ───────────────

async function reprocessSinglePayout(payoutId: string): Promise<void> {
  const { data: payout, error: payoutErr } = await supabase
    .from('payouts')
    .select('*, doctors:doctor_id (name, pix_key)')
    .eq('id', payoutId)
    .eq('status', 'processing')
    .single();

  if (payoutErr || !payout) {
    throw new Error(`Payout ${payoutId} not found or not in processing state`);
  }

  const doctor = payout.doctors as any;
  if (!doctor?.pix_key) {
    throw new Error(`Doctor ${payout.doctor_id} has no pix_key configured`);
  }

  try {
    const transfer = await createAsaasTransfer(
      doctor.pix_key,
      payout.amount,
      `Repasse Nura — ${payout.period_start} a ${payout.period_end}`
    );

    await supabase
      .from('payouts')
      .update({
        status: 'paid',
        asaas_transfer_id: transfer.id,
        paid_at: new Date().toISOString(),
        paid_at_asaas: new Date().toISOString(),
        processing_error: null,
      })
      .eq('id', payoutId);

    console.log(`[process-payouts] Reprocessed payout ${payoutId}: transfer ${transfer.id}`);
  } catch (err) {
    await supabase
      .from('payouts')
      .update({
        status: 'failed',
        processing_error: String(err),
      })
      .eq('id', payoutId);
    throw err;
  }
}

// ─── Processar split do período ───────────────────────────────────────────────

async function processPeriodPayouts(period: { start: Date; end: Date }): Promise<number> {
  const pStart = period.start.toISOString();
  const pEnd   = period.end.toISOString();

  console.log(`[process-payouts] Processing period ${pStart} → ${pEnd}`);

  // Buscar créditos realizados no período ainda não incluídos em nenhum payout_item
  const { data: credits, error: creditsErr } = await supabase
    .rpc('get_unpaid_realized_credits', {
      p_start: pStart,
      p_end: pEnd,
    });

  if (creditsErr) throw creditsErr;
  if (!credits || credits.length === 0) {
    console.log('[process-payouts] No unpaid realized credits found');
    return 0;
  }

  console.log(`[process-payouts] Found ${credits.length} credits to pay`);

  // Agrupar por doctor_id
  const byDoctor = new Map<string, typeof credits>();
  for (const credit of credits) {
    if (!credit.doctor_id) continue; // ignora créditos sem médico atribuído
    const list = byDoctor.get(credit.doctor_id) ?? [];
    list.push(credit);
    byDoctor.set(credit.doctor_id, list);
  }

  let payoutsCreated = 0;

  for (const [doctorId, doctorCredits] of byDoctor) {
    // Buscar dados do médico
    const { data: doctor } = await supabase
      .from('doctors')
      .select('name, pix_key')
      .eq('id', doctorId)
      .single();

    if (!doctor?.pix_key) {
      console.warn(`[process-payouts] Doctor ${doctorId} has no pix_key, skipping`);
      continue;
    }

    const totalAmount = doctorCredits.length * DOCTOR_VALUE_PER_CONSULTATION;

    // Criar registro de payout com status 'processing'
    const { data: payout, error: payoutErr } = await supabase
      .from('payouts')
      .insert([{
        doctor_id: doctorId,
        amount: totalAmount,
        period_start: period.start.toISOString().split('T')[0],
        period_end: period.end.toISOString().split('T')[0],
        consultations_count: doctorCredits.length,
        status: 'processing',
        pix_key: doctor.pix_key,
      }])
      .select('id')
      .single();

    if (payoutErr || !payout) {
      console.error(`[process-payouts] Failed to create payout for doctor ${doctorId}:`, payoutErr);
      continue;
    }

    // Criar payout_items
    const { error: itemsErr } = await supabase
      .from('payout_items')
      .insert(
        doctorCredits.map((c: any) => ({
          payout_id: payout.id,
          consultation_credit_id: c.id,
          amount: DOCTOR_VALUE_PER_CONSULTATION,
        }))
      );

    if (itemsErr) {
      console.error(`[process-payouts] Failed to create payout_items for payout ${payout.id}:`, itemsErr);
      // Payout permanece em 'processing', pode ser reprocessado pelo admin
      continue;
    }

    // Chamar Asaas para transferência PIX
    try {
      const transfer = await createAsaasTransfer(
        doctor.pix_key,
        totalAmount,
        `Repasse Nura — Dr(a). ${doctor.name} — ${period.start.toLocaleDateString('pt-BR')} a ${period.end.toLocaleDateString('pt-BR')}`
      );

      await supabase
        .from('payouts')
        .update({
          status: 'paid',
          asaas_transfer_id: transfer.id,
          paid_at: new Date().toISOString(),
          paid_at_asaas: new Date().toISOString(),
          processing_error: null,
        })
        .eq('id', payout.id);

      console.log(`[process-payouts] Payout ${payout.id} paid: transfer ${transfer.id} for ${doctor.name}`);
      payoutsCreated++;
    } catch (transferErr) {
      await supabase
        .from('payouts')
        .update({
          status: 'failed',
          processing_error: String(transferErr),
        })
        .eq('id', payout.id);

      console.error(`[process-payouts] Transfer failed for payout ${payout.id}:`, transferErr);
    }
  }

  return payoutsCreated;
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  try {
    let body: any = {};
    if (req.method === 'POST') {
      try { body = await req.json(); } catch { /* body vazio é ok */ }
    }

    // Modo de reprocessamento: admin passou um payout_id específico
    if (body.payout_id) {
      await reprocessSinglePayout(body.payout_id);
      return new Response(
        JSON.stringify({ ok: true, reprocessed: body.payout_id }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Modo automático: processar período baseado no dia atual
    const period = determinePeriod();
    const payoutsCreated = await processPeriodPayouts(period);

    return new Response(
      JSON.stringify({
        ok: true,
        payouts_created: payoutsCreated,
        period_start: period.start.toISOString(),
        period_end: period.end.toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[process-payouts] Fatal error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
