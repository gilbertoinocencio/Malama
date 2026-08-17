require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

(async () => {
  const alvo = 'nalu@n.com';

  const { data: lista, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return console.log('erro listando usuários:', error.message);
  const u = lista.users.find(x => x.email === alvo);
  if (!u) return console.log(`conta ${alvo} NÃO EXISTE em auth.users`);

  console.log('conta:', u.email);
  console.log('  id:', u.id);
  console.log('  app_metadata.role:', u.app_metadata?.role, u.app_metadata?.role === 'rh' ? '(ok — o login do /rh exige exatamente isto)' : '*** PROBLEMA: o login do RH recusa se não for "rh" ***');
  console.log('  e-mail confirmado:', !!u.email_confirmed_at);
  console.log('  banido até:', u.banned_until ?? 'não');
  console.log('  último login:', u.last_sign_in_at);
  console.log('  criado em:', u.created_at);

  const { data: rh } = await admin.from('rh_usuarios')
    .select('id,empresa_id,email,nome,ativo,principal,papel,user_id,auth_user_id')
    .eq('email', alvo);
  console.log('\nregistro em rh_usuarios:', JSON.stringify(rh, null, 2));

  if (rh?.[0]) {
    const { data: emp } = await admin.from('empresas').select('nome,status').eq('id', rh[0].empresa_id).single();
    console.log('empresa:', emp?.nome, '· status:', emp?.status);
    console.log('user_id casa com auth.users:', rh[0].user_id === u.id);
    console.log('auth_user_id casa com auth.users:', rh[0].auth_user_id === u.id);
  }
})();
