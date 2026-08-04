// =====================================================
// Malama — Edge Function: Adicionar colaborador a uma empresa
// Chamada pelo RH. Valida limite de assentos, vincula usuário
// existente ou cria convite por e-mail. Requer service_role para
// resolver e-mail → user_id e enviar o convite.
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { activationEmailHtml, activationEmailText, sendEmail } from '../_shared/emails.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Destino fixo e verificado por Universal Links/App Links. Nunca aceite um
// redirect enviado pelo navegador, pois isso transformaria o convite em um
// vetor de phishing/open redirect.
const MOBILE_AUTH_REDIRECT_URL = Deno.env.get('MOBILE_AUTH_REDIRECT_URL')
  || 'https://www.soumalama.com.br/auth/callback';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autorizado' }, 401);

  try {
    const { email, nome, setor, funcao, cpf, whatsapp } = await req.json();
    if (!email) return json({ error: 'E-mail é obrigatório' }, 400);
    if (!whatsapp || !String(whatsapp).trim()) return json({ error: 'WhatsApp é obrigatório' }, 400);

    const normalizedEmail = String(email).trim().toLowerCase();
    const displayName = nome ? String(nome).trim() : '';
    // Setor/função alimentam os recortes k-anônimos do relatório psicossocial
    // do RH (NR-1/PGR). Opcionais — sem eles o colaborador entra no agregado
    // geral da empresa.
    const setorValue = setor ? String(setor).trim() || null : null;
    const funcaoValue = funcao ? String(funcao).trim() || null : null;
    const whatsappValue = String(whatsapp).trim();
    // CPF é a chave de junção com os eventos do eSocial (migration 20260814).
    // Só dígitos: máscara vinda do formulário faria a junção falhar em
    // silêncio depois. CPF fora do formato é ignorado, não rejeita o convite —
    // o vínculo pode ser feito depois na aba Importar.
    const cpfDigitos = cpf ? String(cpf).replace(/\D/g, '') : '';
    const cpfValue = cpfDigitos.length === 11 ? cpfDigitos : null;

    // 1. Identificar o RH chamador e a empresa dele
    const { data: caller } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller?.user) return json({ error: 'Sessão inválida' }, 401);

    const { data: rh, error: rhError } = await supabaseAdmin
      .from('rh_usuarios')
      .select('empresa_id')
      .eq('user_id', caller.user.id)
      .maybeSingle();

    if (rhError || !rh) return json({ error: 'Apenas o RH da empresa pode adicionar colaboradores' }, 403);
    const empresaId = rh.empresa_id;

    // 2. Carregar empresa (nome + limite de assentos + status)
    const { data: empresa, error: empError } = await supabaseAdmin
      .from('empresas')
      .select('nome, max_assentos, status')
      .eq('id', empresaId)
      .single();

    if (empError || !empresa) return json({ error: 'Empresa não encontrada' }, 404);
    if (empresa.status !== 'ativa') return json({ error: 'A conta da empresa não está ativa' }, 403);

    // 3. Já existe colaborador ativo/convidado com esse e-mail?
    const { data: existing } = await supabaseAdmin
      .from('empresa_colaboradores')
      .select('id, status')
      .eq('empresa_id', empresaId)
      .eq('email', normalizedEmail)
      .neq('status', 'removido')
      .maybeSingle();

    if (existing) return json({ error: 'Este colaborador já está vinculado à empresa' }, 409);

    // 4. Validar limite de assentos (ativos + convidados ocupam assento)
    const { count } = await supabaseAdmin
      .from('empresa_colaboradores')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .in('status', ['ativo', 'convidado']);

    if (empresa.max_assentos != null && (count ?? 0) >= empresa.max_assentos) {
      return json({ error: 'Limite de assentos contratados atingido' }, 422);
    }

    // 5. O e-mail já tem conta no app?
    const { data: existingUserId } = await supabaseAdmin
      .rpc('get_user_id_by_email', { p_email: normalizedEmail });

    if (existingUserId) {
      // Já tem conta Malama: cria o vínculo como 'convidado' (reserva o assento)
      // e envia e-mail de ATIVAÇÃO. O status vira 'ativo' quando o colaborador
      // acessa o app (RPC ativar_colaboradores_do_usuario). Modelo B2B2C: a pessoa
      // pode ter trocado de empresa — só ativa de fato ao usar o benefício.
      const { error: insErr } = await supabaseAdmin
        .from('empresa_colaboradores')
        .insert([{
          empresa_id: empresaId,
          user_id: existingUserId,
          email: normalizedEmail,
          status: 'convidado',
          setor: setorValue,
          funcao: funcaoValue,
          whatsapp: whatsappValue,
        }]);
      if (insErr) return json({ error: insErr.message }, 400);

      // Leva o WhatsApp coletado pelo RH para o perfil do paciente, sem
      // sobrescrever se ele já tiver preenchido o próprio (dado dele tem
      // prioridade sobre o que o RH informou no cadastro).
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('whatsapp')
        .eq('id', existingUserId)
        .maybeSingle();
      if (existingProfile && !existingProfile.whatsapp) {
        await supabaseAdmin
          .from('profiles')
          .update({ whatsapp: whatsappValue })
          .eq('id', existingUserId);
      }

      // Usuário existente loga normalmente na raiz do app; a RPC ativa o vínculo no acesso.
      const appUrl = `${(Deno.env.get('SITE_URL') || 'https://soumalama.com.br').replace(/\/$/, '')}/`;
      const { sent, warning } = await sendEmail({
        to: normalizedEmail,
        subject: `${empresa.nome} liberou seu benefício Malama`,
        html: activationEmailHtml(empresa.nome, appUrl),
        text: activationEmailText(empresa.nome, appUrl),
      });
      return json({ status: 'convidado', existing: true, emailed: sent, warning });
    }

    // 6. Não tem conta — cria registro 'convidado' e envia e-mail de convite
    const { error: insErr } = await supabaseAdmin
      .from('empresa_colaboradores')
      .insert([{
        empresa_id: empresaId,
        email: normalizedEmail,
        status: 'convidado',
        setor: setorValue,
        funcao: funcaoValue,
        cpf: cpfValue,
        whatsapp: whatsappValue,
      }]);
    if (insErr) return json({ error: insErr.message }, 400);

    const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: MOBILE_AUTH_REDIRECT_URL,
        // Guarda o nome no metadata para o app exibir o primeiro nome (não o e-mail).
        ...(displayName ? { data: { display_name: displayName } } : {}),
      }
    );
    // O convite falhar (ex.: e-mail já registrado em corrida) não deve reverter o
    // vínculo — o colaborador segue 'convidado' e pode ser reenviado depois.
    if (inviteErr) {
      return json({ status: 'convidado', invited: false, warning: inviteErr.message });
    }

    return json({ status: 'convidado', invited: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
