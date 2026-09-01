// =====================================================
// Malama — Edge Function: Criar usuário auth do influenciador
// Requer service_role para criar usuário sem afetar sessão do admin.
// Após criar, envia link de uso unico para o influenciador definir a senha.
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail, brandedEmailHtml, escapeHtml } from '../_shared/emails.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SITE_URL = (Deno.env.get('SITE_URL') || 'https://soumalama.com.br').replace(/\/$/, '');
const COLOR_PETROL = '#8c473e';

function welcomeHtml(rawName: string, rawEmail: string, passwordSetupLink: string, referralLink: string): string {
  // name/email vêm do corpo da requisição do admin. Escapa mesmo assim: o
  // e-mail é montado como HTML e a origem do dado não é o template.
  const name = escapeHtml(rawName);
  const email = escapeHtml(rawEmail);
  return brandedEmailHtml({
    eyebrow: 'Rede de Afiliados',
    preheader: `Bem-vindo à rede Malama, ${name}! Seu acesso está pronto.`,
    heading: `Bem-vindo à rede <em style="font-style:italic;color:${COLOR_PETROL};">Malama</em>.`,
    bodyParagraphs: [
      `Olá, <strong>${name}</strong>! Sua conta de afiliado foi criada e já está ativa.`,
      `Use o botão abaixo para definir sua própria senha. O link é individual e de uso único.
       <br><br>
       <span style="display:inline-block;background:#F2EBE6;border-radius:10px;padding:14px 20px;font-family:monospace,monospace;font-size:14px;color:#1C1917;line-height:1.8;">
         <strong>Login:</strong> ${email}
       </span>
       <br><br>Depois, entre no app Malama com seu e-mail e a senha escolhida.`,
      `Seu link de indicação — compartilhe com seus seguidores:
       <br><br>
       <span style="display:inline-block;background:#F2EBE6;border-radius:10px;padding:12px 20px;font-family:monospace,monospace;font-size:13px;color:${COLOR_PETROL};word-break:break-all;">
         ${referralLink}
       </span>
       <br><br>
       Cada pessoa que se cadastrar pelo seu link gera uma comissão para você.`,
    ],
    ctaText: 'Definir minha senha',
    ctaUrl: passwordSetupLink,
    footnote: 'Não encaminhe este e-mail. Se você não esperava esta mensagem, ignore-o e avise o Malama.',
  });
}

function welcomeText(name: string, email: string, passwordSetupLink: string, referralLink: string): string {
  return [
    `Bem-vindo à rede Malama, ${name}!`,
    ``,
    `Sua conta de afiliado está pronta. Seu login é: ${email}`,
    ``,
    `Defina sua própria senha neste link individual:`,
    passwordSetupLink,
    ``,
    `Seu link de indicação (compartilhe com seus seguidores):`,
    referralLink,
    ``,
    `Cada cadastro pelo seu link gera uma comissão para você.`,
    ``,
    `Malama — Cuide de quem faz sua empresa crescer.`,
  ].join('\n');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Só super_admin pode criar influenciadores (cria conta auth + define comissão)
  const { data: caller } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (caller?.user?.app_metadata?.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Acesso restrito ao super admin' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const {
      email, name,
      instagram_handle, pix_key,
      commission_per_referral, notes, status,
    } = await req.json();

    if (!email || !name) {
      return new Response(JSON.stringify({ error: 'email e name são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Senha aleatoria nunca e enviada nem devolvida. O titular a substitui por
    // um link de recovery de uso unico gerado pelo proprio Supabase.
    const temporaryPassword = `${crypto.randomUUID()}Aa1!${crypto.randomUUID()}`;

    // 1. Criar usuário no Supabase Auth (confirmado imediatamente)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
    });

    if (userError) {
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    const referral_token = `inf_${crypto.randomUUID().replace(/-/g, '')}`;

    // 2. Inserir registro do influenciador já vinculado ao user_id
    const { data: influencer, error: infError } = await supabaseAdmin
      .from('influencers')
      .insert([{
        user_id: userId,
        name,
        email,
        instagram_handle: instagram_handle || null,
        pix_key: pix_key || null,
        commission_per_referral: parseFloat(commission_per_referral) || 10,
        notes: notes || null,
        status: status || 'active',
        referral_token,
        access_token: null,
        setup_token: null,
      }])
      .select()
      .single();

    if (infError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: infError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${SITE_URL}/influencer/definir-senha` },
    });
    if (linkError || !linkData?.properties?.action_link) {
      await supabaseAdmin.from('influencers').delete().eq('id', influencer.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: 'Não foi possível gerar o link seguro de acesso' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Enviar e-mail de boas-vindas (não bloqueia nem falha o cadastro)
    const referralLink = `${SITE_URL}/i/${referral_token}`;
    const { sent, warning } = await sendEmail({
      to: email,
      subject: `Bem-vindo à rede Malama, ${name}!`,
      html: welcomeHtml(name, email, linkData.properties.action_link, referralLink),
      text: welcomeText(name, email, linkData.properties.action_link, referralLink),
    });

    return new Response(
      JSON.stringify({ ...influencer, email_sent: sent, ...(warning ? { email_warning: warning } : {}) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
