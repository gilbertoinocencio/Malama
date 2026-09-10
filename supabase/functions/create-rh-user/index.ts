// =====================================================
// Malama — Edge Function: Criar conta de login do RH
// Requer service_role para criar usuário sem afetar a sessão do super admin.
// Espelha create-influencer-user (cria empresa + RH de forma atômica com rollback).
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Só super_admin autenticado pode criar empresas/RH
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autorizado' }, 401);

  const { data: caller } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (caller?.user?.app_metadata?.role !== 'super_admin') {
    return json({ error: 'Acesso restrito ao super admin' }, 403);
  }

  try {
    const {
      empresa, // { nome, cnpj, responsavel_nome, responsavel_email, responsavel_telefone, valor_por_assento, valor_assento_mental, valor_assento_metabolico, max_assentos, modo_mental, modo_metabolico, status, data_inicio }
      rh,      // { email, password, nome }
    } = await req.json();

    if (!empresa?.nome) return json({ error: 'Nome da empresa é obrigatório' }, 400);
    if (!rh?.email || !rh?.password) return json({ error: 'Email e senha do RH são obrigatórios' }, 400);

    // 1. Criar a empresa
    const { data: empresaRow, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .insert([{
        nome: empresa.nome,
        cnpj: empresa.cnpj || null,
        responsavel_nome: empresa.responsavel_nome || rh.nome || null,
        responsavel_email: empresa.responsavel_email || rh.email,
        responsavel_telefone: empresa.responsavel_telefone || null,
        valor_por_assento: empresa.valor_por_assento ?? null,
        // Preço por modalidade (migration 20260807). Sem estes campos a
        // empresa nascia sem valor: MRR zero e "—" na coluna de valor.
        valor_assento_mental: empresa.valor_assento_mental ?? null,
        valor_assento_metabolico: empresa.valor_assento_metabolico ?? null,
        max_assentos: empresa.max_assentos ?? null,
        // Modos do contrato (migration 20260727). Default preserva o
        // comportamento antigo: metabólico ligado, mental desligado.
        modo_mental: empresa.modo_mental ?? false,
        modo_metabolico: empresa.modo_metabolico ?? true,
        // Compliance e o preço dele faltavam nesta lista: o formulário do
        // admin manda os dois, e o insert descartava. Contrato só-compliance
        // nascia sem modalidade nenhuma e sem preço — ou seja, impossível de
        // faturar, porque empresa_valor_assento() devolve NULL nesse estado.
        // O trigger de 20260846 ainda liga compliance sozinho quando há
        // mental ou metabólico; aqui importa o caso em que ele vai sozinho.
        modo_compliance: empresa.modo_compliance ?? true,
        valor_assento_compliance: empresa.valor_assento_compliance ?? null,
        status: empresa.status || 'ativa',
        data_inicio: empresa.data_inicio || null,
        // Período grátis (migration 20260907): normalmente definido já na
        // criação, que é quando se combina a cortesia com o cliente.
        cortesia_ate: empresa.cortesia_ate || null,
      }])
      .select()
      .single();

    if (empresaError) return json({ error: empresaError.message }, 400);

    // 2. Criar a conta auth do RH (confirmada, com role 'rh')
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: rh.email,
      password: rh.password,
      email_confirm: true,
      app_metadata: { role: 'rh' },
      user_metadata: { name: rh.nome || empresa.responsavel_nome || '' },
    });

    if (userError) {
      // Rollback da empresa
      await supabaseAdmin.from('empresas').delete().eq('id', empresaRow.id);
      return json({ error: userError.message }, 400);
    }

    // 3. Vincular rh_usuarios
    const { error: rhError } = await supabaseAdmin
      .from('rh_usuarios')
      .insert([{
        empresa_id: empresaRow.id,
        user_id: userData.user.id,
        auth_user_id: userData.user.id,
        email: rh.email,
        nome: rh.nome || empresa.responsavel_nome || null,
        papel: 'proprietario',
        principal: true,
        permissoes: [
          'colaboradores', 'saude_mental', 'absenteismo', 'plano_acao',
          'importar', 'financeiro', 'compliance', 'empresa', 'usuarios', 'apuracao',
        ],
      }]);

    if (rhError) {
      // Rollback de usuário + empresa
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      await supabaseAdmin.from('empresas').delete().eq('id', empresaRow.id);
      return json({ error: rhError.message }, 400);
    }

    return json({ empresa: empresaRow });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return json({ error: message }, 500);
  }
});
