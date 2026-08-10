// =====================================================
// Malama — Edge Function: convidar lead da fila de espera
// Chamada só pelo super_admin (médico/psicólogo em doctor_leads,
// paciente em patient_leads).
//
// PROFISSIONAL (type='doctor'): o convite NÃO cria conta. Manda um e-mail
// com o link do formulário completo, onde ele define a própria senha e envia
// documentos; a conta nasce no submit e o admin aprova depois, vendo o
// cadastro inteiro. Criar a conta aqui deixava o profissional em limbo —
// liberado pelo admin, mas sem senha e sem dados — e quebrava com
// "email already registered" para quem já era paciente Malama.
//
// PACIENTE (type='patient'): não há formulário pesado, então segue o convite
// nativo do Supabase (a senha é definida no link do convite).
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  professionalSignupEmailHtml,
  professionalSignupEmailText,
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
  /** Destino do convite: formulário de cadastro (doctor) ou login (patient). */
  redirect_to: string;
  /** Só para type='doctor': muda o texto do e-mail. */
  tipo_profissional?: 'medico' | 'psicologo';
}

// Traduz o erro cru do GoTrue para algo que o admin consiga agir.
function traduzErroAuth(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return 'Limite de envio de e-mails atingido. Aguarde alguns minutos antes de convidar de novo.';
  }
  if (m.includes('already been registered') || m.includes('already registered')) {
    return 'Este e-mail já tem conta na Malama — a pessoa pode entrar direto, sem convite.';
  }
  if (m.includes('invalid') && m.includes('email')) {
    return 'E-mail inválido — corrija o endereço na fila de espera.';
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
    if (!redirect_to) return json({ error: 'Destino do convite não informado' }, 400);

    const normalizedEmail = String(email).trim().toLowerCase();
    const table = type === 'doctor' ? 'doctor_leads' : 'patient_leads';

    let warning: string | undefined;

    if (type === 'doctor') {
      // Convite = link para o formulário. Nada de conta aqui.
      const tipo = tipo_profissional === 'psicologo' ? 'psicologo' : 'medico';
      const { sent, warning: emailWarning } = await sendEmail({
        to: normalizedEmail,
        subject: 'Sua vaga no portal profissional da Malama foi liberada',
        html: professionalSignupEmailHtml(tipo, redirect_to),
        text: professionalSignupEmailText(tipo, redirect_to),
      });
      if (!sent) {
        return json({ error: emailWarning ?? 'Falha ao enviar o e-mail de convite' }, 400);
      }
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
      warning = `E-mail enviado, mas a fila não foi atualizada: ${updateError.message}`;
    }

    return json({ success: true, warning });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
