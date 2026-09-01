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

// ─── Escape de dado dinâmico ───────────────────────────────────────────
// O template abaixo CARREGA markup de propósito (o <em> do heading, o
// <strong> dos parágrafos), então escapar a string inteira quebraria o
// layout. O escape vai no ponto onde o dado externo entra — cada função
// de e-mail aplica em suas variáveis antes de compor.
//
// Por que importa: `empresas.nome` é gravado por self-register-empresa,
// que é uma função PÚBLICA e não autenticada. Sem escape, o nome escolhido
// no autocadastro vira markup dentro de um e-mail com a marca Malama,
// enviado pela infraestrutura da Malama — âncora para o site do atacante
// inclusive.
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Origens que podem aparecer em href de CTA. `redirect_to` chega do corpo
// da requisição em invite-lead; sem allowlist, um convite legítimo do admin
// vira porta de phishing se o parâmetro for adulterado.
const ORIGENS_PERMITIDAS = [
  SITE_URL,
  'https://soumalama.com.br',
  'https://www.soumalama.com.br',
];

/** Devolve a URL se a origem for conhecida; senão, cai no site. */
export function safeCtaUrl(url: unknown): string {
  const bruto = String(url ?? '').trim();
  try {
    const parsed = new URL(bruto);
    if (parsed.protocol !== 'https:') return SITE_URL;
    const origem = parsed.origin;
    return ORIGENS_PERMITIDAS.some(o => {
      try { return new URL(o).origin === origem; } catch { return false; }
    }) ? bruto : SITE_URL;
  } catch {
    return SITE_URL;
  }
}

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
            <td style="background-color:${COLOR.main};padding:28px 40px;" align="left">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <img src="${LOGO_URL}" alt="Malama" width="90" style="width:90px;height:auto;display:block;border:0;outline:none;text-decoration:none;">
                  </td>
                  <td align="left" valign="middle" style="padding-left:24px;">
                    <p style="margin:0 0 4px;font-family:${SERIF};font-size:26px;font-weight:400;color:#ffffff;letter-spacing:1px;">Malama</p>
                    <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${COLOR.petrol};font-family:Helvetica,Arial,sans-serif;">${eyebrow}</p>
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
  // O nome da empresa vem do autocadastro público — escapa antes de compor.
  const nome = escapeHtml(empresaNome);
  return brandedEmailHtml({
    preheader: `${nome} liberou o benefício Malama para você.`,
    heading: `Seu benefício Malama foi <em style="font-style:italic;color:${COLOR.petrol};">liberado</em>.`,
    bodyParagraphs: [
      `A <strong>${nome}</strong> adicionou você ao benefício de saúde Malama.`,
      `Você já tem conta — é só abrir o app para ativar o acesso e continuar sua jornada de cuidado, agora pela sua empresa.`,
    ],
    ctaText: 'Acessar o app e ativar',
    ctaUrl,
    footnote: 'Se você não reconhece esta empresa, ignore este e-mail — nada muda na sua conta até você acessar.',
  });
}

// ─── E-mail de CONVITE PARA O CADASTRO PROFISSIONAL ──
// O convite NÃO cria conta: é só um link para o formulário completo, onde o
// profissional define a própria senha e envia os documentos. A conta nasce no
// submit do formulário, e o admin só aprova depois — com o cadastro inteiro à
// vista. Sem isso o aprovado ficava em limbo: liberado, mas sem senha nem dados.
export function professionalSignupEmailText(tipo: 'medico' | 'psicologo', ctaUrl: string): string {
  const papel = tipo === 'psicologo' ? 'psicólogo(a)' : 'médico(a)';
  ctaUrl = safeCtaUrl(ctaUrl);
  return [
    `Sua vaga de ${papel} na Malama foi liberada.`,
    ``,
    `Analisamos sua inscrição na fila de espera e liberamos seu cadastro no portal profissional.`,
    `Use o link abaixo para completar o cadastro — você define sua senha de acesso na hora:`,
    ctaUrl,
    ``,
    `Depois de enviado, nossa equipe confere seus dados e libera o acesso ao portal.`,
    ``,
    `Malama — Cuidado contínuo, com gente de verdade por trás.`,
  ].join('\n');
}

export function professionalSignupEmailHtml(tipo: 'medico' | 'psicologo', ctaUrl: string): string {
  const papel = tipo === 'psicologo' ? 'psicólogo(a)' : 'médico(a)';
  const conselho = tipo === 'psicologo' ? 'CRP e e-Psi' : 'CRM';
  // Único CTA cuja URL chega no corpo da requisição (invite-lead.redirect_to):
  // passa pela allowlist de origem antes de virar href.
  ctaUrl = safeCtaUrl(ctaUrl);
  return brandedEmailHtml({
    eyebrow: 'Malama Profissionais',
    preheader: `Sua vaga no portal profissional da Malama foi liberada.`,
    heading: `Sua vaga de ${papel} foi <em style="font-style:italic;color:${COLOR.petrol};">liberada</em>.`,
    bodyParagraphs: [
      `Analisamos sua inscrição na fila de espera e liberamos seu cadastro no portal profissional da Malama.`,
      `Leva poucos minutos: dados pessoais, ${conselho}, especialidade e valor da consulta. Você define sua <strong>senha de acesso</strong> no próprio formulário.`,
      `Assim que enviar, nossa equipe confere os dados e libera seu acesso ao portal.`,
    ],
    ctaText: 'Completar meu cadastro',
    ctaUrl,
    footnote: 'Se você não se inscreveu na Malama, pode ignorar este e-mail.',
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
