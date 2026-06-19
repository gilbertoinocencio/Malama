// =====================================================
// Malama — Módulo compartilhado de e-mail transacional
// Banner e identidade visual espelhando as landings /empresas e /pitchdeck.
// Provedor configurável por env (ZeptoMail/Zoho ou Resend). Sem chave → no-op.
// =====================================================

// ─── Paleta (igual ao tailwind.config.js) ──────────────
const COLOR = {
  bg: '#FDFBF9',        // Malama-bg (off-white quente)
  main: '#1C1917',      // Malama-main (preto suave)
  muted: '#57534E',     // Malama-muted
  petrol: '#8c473e',    // Malama-petrol (vermelho queimado — acento)
  petrolLight: '#F2EBE6', // Malama-petrol-light
  border: '#E7E5E4',    // Malama-border
};

const SITE_URL = (Deno.env.get('SITE_URL') || 'https://soumalama.com.br').replace(/\/$/, '');
const LOGO_URL = `${SITE_URL}/malama-passaro.png`;
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";

// ─── Builder do layout de e-mail (banner + corpo) ──────
// heading aceita <em>…</em> para o acento itálico em petrol.
export function brandedEmailHtml(opts: {
  eyebrow?: string;
  heading: string;
  bodyParagraphs: string[];
  ctaText?: string;
  ctaUrl?: string;
  footnote?: string;
  preheader?: string;
}): string {
  const {
    eyebrow = 'Malama Empresas',
    heading,
    bodyParagraphs,
    ctaText,
    ctaUrl,
    footnote,
    preheader = '',
  } = opts;

  const paragraphs = bodyParagraphs
    .map(
      (p) =>
        `<p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:${COLOR.muted};font-family:Helvetica,Arial,sans-serif;">${p}</p>`
    )
    .join('');

  const cta =
    ctaText && ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
           <tr>
             <td align="center" bgcolor="${COLOR.main}" style="border-radius:999px;">
               <a href="${ctaUrl}" target="_blank"
                  style="display:inline-block;padding:15px 34px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;border-radius:999px;">
                 ${ctaText} &nbsp;&rarr;
               </a>
             </td>
           </tr>
         </table>`
      : '';

  const foot = footnote
    ? `<p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:${COLOR.muted};opacity:0.7;font-family:Helvetica,Arial,sans-serif;">${footnote}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Malama</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR.petrolLight};">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.petrolLight};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:${COLOR.bg};border-radius:20px;overflow:hidden;border:1px solid ${COLOR.border};">

          <!-- ░░ BANNER ░░ -->
          <tr>
            <td style="background-color:${COLOR.main};padding:30px 40px 26px;" align="left">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="left">
                    <img src="${LOGO_URL}" alt="Malama" width="150" height="150" style="width:150px;height:auto;display:block;border:0;outline:none;text-decoration:none;">
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:22px;" align="left">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:28px;border-bottom:1px solid ${COLOR.petrol};font-size:0;line-height:0;">&nbsp;</td>
                        <td style="padding-left:12px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${COLOR.petrol};font-family:Helvetica,Arial,sans-serif;">${eyebrow}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ░░ CORPO ░░ -->
          <tr>
            <td style="padding:38px 40px 8px;" align="left">
              <h1 style="margin:0 0 22px;font-family:${SERIF};font-size:34px;line-height:1.12;font-weight:400;color:${COLOR.main};">${heading}</h1>
              ${paragraphs}
              ${cta}
              ${foot}
            </td>
          </tr>

          <!-- ░░ RODAPÉ ░░ -->
          <tr>
            <td style="padding:30px 40px 36px;" align="left">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td style="border-top:1px solid ${COLOR.border};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>
              </table>
              <p style="margin:20px 0 4px;font-family:${SERIF};font-size:20px;color:${COLOR.petrol};">Malama</p>
              <p style="margin:0 0 14px;font-size:13px;color:${COLOR.muted};font-family:Helvetica,Arial,sans-serif;">Cuide de quem faz sua empresa crescer.</p>
              <p style="margin:0;font-size:12px;color:${COLOR.muted};opacity:0.6;font-family:Helvetica,Arial,sans-serif;">© ${new Date().getFullYear()} Malama. Todos os direitos reservados.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Versão texto puro (multipart) — reduz spam e cobre clientes sem HTML ──
export function activationEmailText(empresaNome: string, ctaUrl: string): string {
  return [
    `Seu benefício Malama foi liberado.`,
    ``,
    `A ${empresaNome} adicionou você ao benefício de saúde Malama.`,
    `Você já tem conta — é só abrir o app para ativar o acesso:`,
    ctaUrl,
    ``,
    `Se você não reconhece esta empresa, ignore este e-mail — nada muda na sua conta até você acessar.`,
    ``,
    `Malama — Cuide de quem faz sua empresa crescer.`,
  ].join('\n');
}

// ─── E-mail de ATIVAÇÃO (colaborador que já tem conta Malama) ──
export function activationEmailHtml(empresaNome: string, ctaUrl: string): string {
  return brandedEmailHtml({
    preheader: `${empresaNome} liberou o benefício Malama para você.`,
    heading: `Seu benefício Malama foi <em style="font-style:italic;color:${COLOR.petrol};">liberado</em>.`,
    bodyParagraphs: [
      `A <strong>${empresaNome}</strong> adicionou você ao benefício de saúde Malama.`,
      `Você já tem conta — é só abrir o app para ativar o acesso e continuar sua jornada de cuidado, agora pela sua empresa.`,
    ],
    ctaText: 'Acessar o app e ativar',
    ctaUrl,
    footnote: 'Se você não reconhece esta empresa, ignore este e-mail — nada muda na sua conta até você acessar.',
  });
}

// ─── Envio (ZeptoMail/Zoho → Resend → no-op com aviso) ──
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; warning?: string }> {
  const from = Deno.env.get('EMAIL_FROM') || 'Malama <nao-responda@soumalama.com.br>';
  const zeptoToken = Deno.env.get('ZEPTOMAIL_TOKEN');
  const resendKey = Deno.env.get('RESEND_API_KEY');

  try {
    // 1) ZeptoMail (Zoho) — API transacional
    if (zeptoToken) {
      const fromAddr = parseAddress(from);
      const resp = await fetch('https://api.zeptomail.com/v1.1/email', {
        method: 'POST',
        headers: {
          Authorization: zeptoToken, // formato: "Zoho-enczapikey <token>"
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          from: { address: fromAddr.email, name: fromAddr.name || 'Malama' },
          to: [{ email_address: { address: opts.to } }],
          subject: opts.subject,
          htmlbody: opts.html,
          ...(opts.text ? { textbody: opts.text } : {}),
        }),
      });
      if (!resp.ok) {
        const body = await resp.text();
        return { sent: false, warning: `ZeptoMail ${resp.status}: ${body.slice(0, 200)}` };
      }
      return { sent: true };
    }

    // 2) Resend — fallback (tem tier gratuito)
    if (resendKey) {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html, ...(opts.text ? { text: opts.text } : {}) }),
      });
      if (!resp.ok) {
        const body = await resp.text();
        return { sent: false, warning: `Resend ${resp.status}: ${body.slice(0, 200)}` };
      }
      return { sent: true };
    }

    // 3) Sem provedor configurado
    return { sent: false, warning: 'Nenhum provedor de e-mail configurado (defina ZEPTOMAIL_TOKEN ou RESEND_API_KEY).' };
  } catch (err) {
    return { sent: false, warning: err instanceof Error ? err.message : 'Falha ao enviar e-mail' };
  }
}

// Extrai "Nome <email@dominio>" → { name, email }
function parseAddress(raw: string): { name?: string; email: string } {
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] || undefined, email: m[2] };
  return { email: raw.trim() };
}
