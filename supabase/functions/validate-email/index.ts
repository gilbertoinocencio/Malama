// =====================================================
// Malama — Edge Function: validate-email
// Confere se o DOMÍNIO do e-mail existe e aceita correio, via DNS sobre HTTPS.
// POST { email: string } → { valid: boolean, reason?: string }
//
// Por que no servidor: o navegador não consulta DNS. E por que DNS e não só
// regex — "charli@n.com" passa em qualquer regex, mas n.com não existe
// (NXDOMAIN). É o que deixava cadastro de teste entrar como se fosse real.
//
// Limite honesto: isto prova que o domínio recebe e-mail, não que a caixa
// exista nem que seja da pessoa. Prova de posse só com link de confirmação.
// =====================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Sintaxe: um @, sem espaços, domínio com ponto e TLD de 2+ letras.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;

// Domínios descartáveis mais comuns. Lista curta de propósito: o filtro forte
// é o DNS; isto só barra o que é notoriamente temporário.
const DISPOSABLE = new Set([
  'mailinator.com', 'yopmail.com', 'guerrillamail.com', 'temp-mail.org',
  '10minutemail.com', 'tempmail.com', 'trashmail.com', 'sharklasers.com',
  'getnada.com', 'dispostable.com', 'maildrop.cc', 'throwawaymail.com',
]);

async function dnsQuery(name: string, type: 'MX' | 'A' | 'AAAA') {
  const resp = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
    { headers: { Accept: 'application/dns-json' } },
  );
  if (!resp.ok) throw new Error(`DNS ${resp.status}`);
  return await resp.json() as { Status: number; Answer?: { data: string }[] };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  if (!email) return json({ error: 'email é obrigatório' }, 400);

  if (!EMAIL_RE.test(email)) {
    return json({ valid: false, reason: 'Formato de e-mail inválido.' });
  }

  const domain = email.slice(email.lastIndexOf('@') + 1);

  if (DISPOSABLE.has(domain)) {
    return json({ valid: false, reason: 'E-mails temporários não são aceitos. Use seu e-mail profissional.' });
  }

  try {
    // MX é o registro que diz "este domínio recebe e-mail".
    const mx = await dnsQuery(domain, 'MX');

    // Status 3 = NXDOMAIN: o domínio não existe.
    if (mx.Status === 3) {
      return json({ valid: false, reason: `O domínio "${domain}" não existe. Confira o e-mail.` });
    }

    if (mx.Answer?.length) return json({ valid: true });

    // Sem MX, o correio ainda pode cair no A/AAAA do domínio (RFC 5321).
    const [a, aaaa] = await Promise.all([dnsQuery(domain, 'A'), dnsQuery(domain, 'AAAA')]);
    if (a.Answer?.length || aaaa.Answer?.length) return json({ valid: true });

    return json({ valid: false, reason: `O domínio "${domain}" não recebe e-mails. Confira o endereço.` });
  } catch {
    // DNS fora do ar não pode barrar um cadastro legítimo — deixa passar e
    // segue para as validações seguintes.
    return json({ valid: true, reason: 'Não foi possível verificar o domínio agora.' });
  }
});
