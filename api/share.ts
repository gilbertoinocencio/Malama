/**
 * Página pública de um compartilhamento: /s/<id>
 *
 * Precisa ser servida pelo servidor, e não pela SPA, porque quem consome as
 * meta tags de preview (WhatsApp, Instagram, LinkedIn, Facebook) não executa
 * JavaScript. Servida pelo index.html, toda pré-visualização mostraria a mesma
 * imagem genérica do app em vez do card real.
 *
 * A resposta é HTML puro, sem script: a CSP do projeto usa `script-src 'self'`,
 * então script inline seria bloqueado de qualquer forma.
 */

interface ShareRow {
  id: string;
  type: string;
  image_url: string;
  headline: string | null;
  subline: string | null;
  referral_token: string | null;
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

const SITE = 'https://malama.app';

/** Impede que texto vindo do banco escape para dentro do HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchShare(id: string): Promise<ShareRow | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/shares?id=eq.${encodeURIComponent(id)}&select=id,type,image_url,headline,subline,referral_token`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as ShareRow[];
  return rows[0] ?? null;
}

/** Contador de visualizações. Falha aqui nunca derruba a página. */
async function countView(id: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_share_views`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ share_id: id }),
    });
  } catch {
    /* métrica não vale uma página quebrada */
  }
}

function renderPage(share: ShareRow): string {
  const title = escapeHtml(share.headline || 'Malama — Feed the Flow');
  const description = escapeHtml(
    share.subline || 'Alinhe sua nutrição com o seu ritmo natural.'
  );
  const image = escapeHtml(share.image_url);
  const url = `${SITE}/s/${share.id}`;

  // Quem compartilhou sendo influencer, o cadastro entra pelo link de indicação.
  const cta = share.referral_token
    ? `${SITE}/i/${encodeURIComponent(share.referral_token)}`
    : SITE;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${title} · Malama</title>
<meta name="description" content="${description}" />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="Malama" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${image}" />
<meta property="og:image:width" content="1080" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />

<link rel="icon" href="/favicon.png" />
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    padding: 32px 20px 40px;
    background: #f8f7f6;
    color: #221910;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    text-align: center;
  }
  @media (prefers-color-scheme: dark) {
    body { background: #14100e; color: #f8f7f6; }
    .sub { color: #a89f98; }
  }
  .card {
    width: 100%;
    max-width: 320px;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0,0,0,.22);
  }
  .card img { display: block; width: 100%; height: auto; }
  h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -.01em; }
  .sub { margin: 8px 0 0; font-size: 15px; color: #6d635c; max-width: 30ch; }
  .cta {
    display: inline-block;
    margin-top: 4px;
    padding: 15px 34px;
    border-radius: 14px;
    background: #8c473e;
    color: #fff;
    font-weight: 700;
    font-size: 16px;
    text-decoration: none;
  }
  .brand { font-size: 11px; letter-spacing: .3em; text-transform: uppercase; opacity: .5; }
</style>
</head>
<body>
  <div class="card"><img src="${image}" alt="${title}" /></div>
  <div>
    <h1>${title}</h1>
    <p class="sub">${description}</p>
  </div>
  <a class="cta" href="${cta}">Comece seu flow</a>
  <p class="brand">Malama · Feed the Flow</p>
</body>
</html>`;
}

export default async function handler(req: any, res: any) {
  const raw = req.query?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;

  if (!id || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.setHeader('Location', SITE);
    res.status(302).end();
    return;
  }

  const share = await fetchShare(id).catch(() => null);

  // Link inválido ou apagado pelo dono: manda para a home em vez de erro seco.
  if (!share) {
    res.setHeader('Location', SITE);
    res.status(302).end();
    return;
  }

  void countView(id);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // O snapshot é imutável; cache longo economiza banco e acelera o preview.
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=86400');
  res.status(200).send(renderPage(share));
}
