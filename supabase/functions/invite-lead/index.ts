// =====================================================
// Malama — Edge Function: convidar lead da fila de espera
// Chamada só pelo super_admin (médico/psicólogo em doctor_leads,
// paciente em patient_leads). Requer service_role para resolver
// e-mail → user_id e disparar convite/magic link.
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  professionalAccessEmailHtml,
  professionalAccessEmailText,
  sendEmail,
} from '../_shared/emails.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface Payload {
  email: string;
  type: 'doctor' | 'patient';
  lead_id: string;
  redirect_to: string;
  /** Só para type='doctor': muda o texto do e-mail de acesso. */
  tipo_profissional?: 'medico' | 'psicologo';
}

// Traduz o erro cru do GoTrue para algo que o admin consiga agir.
function traduzErroAuth(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return 'Limite de envio de e-mails atingido. Aguarde alguns minutos antes de convidar de novo.';
  }
  if (m.includes('invalid') && m.includes('email')) {
    return 'E-mail inválido — corrija o endereço na fila de espera.';
  }
  if (m.includes('smtp') || m.includes('sending')) {
    return `Falha no envio do e-mail: ${message}`;
  }
  return message;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Só super_admin pode disparar convites (evita spam e phishing via redirect_to)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autorizado' }, 401);

  const { data: caller } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (caller?.user?.app_metadata?.role !== 'super_admin') {
    return json({ error: 'Acesso restrito ao super admin' }, 403);
  }

  try {
    const { email, type, lead_id, redirect_to, tipo_profissional }: Payload = await req.json();
    if (!email) return json({ error: 'E-mail é obrigatório' }, 400);
    if (type !== 'doctor' && type !== 'patient') return json({ error: 'Tipo de lead inválido' }, 400);
    if (!lead_id) return json({ error: 'Lead não identificado' }, 400);

    const normalizedEmail = String(email).trim().toLowerCase();
    const table = type === 'doctor' ? 'doctor_leads' : 'patient_leads';

    // O e-mail já tem conta no app? Um lead profissional costuma já ser
    // paciente Malama — nesse caso inviteUserByEmail falha com
    // "email already registered" e o convite morria com erro genérico.
    const { data: existingUserId } = await supabase
      .rpc('get_user_id_by_email', { p_email: normalizedEmail });

    let flow: 'invite' | 'magiclink' = 'invite';
    let emailed = true;
    let warning: string | undefined;

    if (existingUserId) {
      // Já tem conta: convite não se aplica. Geramos um magic link para o mesmo
      // destino e enviamos pelo nosso provedor transacional (ZeptoMail/Resend),
      // que não sofre o rate limit baixo do SMTP embutido do Supabase.
      const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail,
        options: { redirectTo: redirect_to },
      });

      if (linkError || !link?.properties?.action_link) {
        return json({ error: traduzErroAuth(linkError?.message ?? 'Falha ao gerar link de acesso') }, 400);
      }

      const actionLink = link.properties.action_link;

      if (type === 'doctor') {
        const tipo = tipo_profissional === 'psicologo' ? 'psicologo' : 'medico';
        const res = await sendEmail({
          to: normalizedEmail,
          subject: 'Seu acesso ao portal profissional da Malama',
          html: professionalAccessEmailHtml(tipo, actionLink),
          text: professionalAccessEmailText(tipo, actionLink),
        });
        emailed = res.sent;
        warning = res.warning;
      } else {
        // Paciente com conta: nada a convidar, só avisa o admin.
        emailed = false;
        warning = 'Este e-mail já tem conta na Malama — o paciente pode entrar normalmente.';
      }

      flow = 'magiclink';
    } else {
      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo: redirect_to,
      });
      if (inviteError) {
        return json({ error: traduzErroAuth(inviteError.message) }, 400);
      }
    }

    // Marca o lead como convidado. Falhar aqui não invalida o e-mail já
    // enviado — vira aviso para o admin, não erro.
    const { error: updateError } = await supabase
      .from(table)
      .update({ status: 'convidado', invited_at: new Date().toISOString() })
      .eq('id', lead_id);

    if (updateError) {
      warning = `E-mail processado, mas a fila não foi atualizada: ${updateError.message}`;
    }

    return json({ success: true, flow, emailed, warning });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
