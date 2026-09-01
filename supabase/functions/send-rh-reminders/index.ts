// =====================================================
// Malama — Edge Function: send-rh-reminders
//
// Roda no cron uma vez por dia. Manda dois tipos de e-mail para o RH:
//
//  1. DIGEST SEMANAL — no dia configurado (padrão: segunda), lista o que a
//     empresa tem em aberto. Dedupe pela semana ISO.
//  2. CAMPANHA FECHANDO — em qualquer dia, quando faltam 3 dias ou menos
//     para a janela fechar. Dedupe pelo id da campanha. Este é separado do
//     digest porque é o único irreversível: depois que a janela fecha, não
//     existe mais como obter resposta daquele ciclo.
//
// Empresa sem nenhuma pendência NÃO recebe e-mail. Um "está tudo em dia"
// semanal treina a pessoa a arquivar sem ler, e aí o e-mail que importa
// também é arquivado.
//
// O e-mail nunca pede para cobrar quem não respondeu — só sugere divulgar
// de novo. Cobrança individual enviesa o instrumento, e é a validade dele
// que sustenta o relatório num questionamento (mesma razão por que
// lib/rhJornada se recusa a pontuar adesão).
//
// Deploy: `supabase functions deploy send-rh-reminders`.
// Agendamento: ver o pg_cron ao final de 20260844_rh_lembretes_semanais.sql.
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { brandedEmailHtml, sendEmail } from '../_shared/emails.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://soumalama.com.br').replace(/\/$/, '');
/** 1 = segunda. Dia em que o digest sai. */
const DIA_DO_DIGEST = Number(Deno.env.get('RH_DIGEST_DIA_SEMANA') ?? '1');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Só a service role dispara — o pg_cron manda o SERVICE_KEY no Authorization.
// Mesmo padrão de expire-credits/index.ts:19-22 e process-payouts:360-368.
// Sem isto, a postura dependia inteiramente da flag verify_jwt do deploy,
// que não estava versionada em lugar nenhum.
function autorizado(req: Request): boolean {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  return token.length > 0 && token === SERVICE_KEY;
}


type Fechando = {
  campanha_id: string; instrumento: string; janela_fim: string;
  dias: number; respondentes: number; convidados: number;
};
type Baixa = {
  instrumento: string; janela_fim: string;
  respondentes: number; convidados: number; taxa: number;
};
type Vencida = { instrumento: string; desde: string };
type Pendencias = {
  empresa_id: string;
  empresa_nome: string;
  destinatarios: { email: string; nome: string | null }[];
  campanhas_fechando: Fechando[];
  adesao_baixa: Baixa[];
  medidas_atrasadas: number;
  medidas_vencendo: number;
  medicoes_vencidas: Vencida[];
  documentos_pendentes: number;
};

const fmt = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

const plural = (n: number, um: string, muitos: string) => (n === 1 ? um : muitos);

/** Semana ISO — a chave de dedupe do digest. */
function semanaIso(d: Date): string {
  const alvo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Quinta-feira da mesma semana define o ano ISO.
  alvo.setUTCDate(alvo.getUTCDate() + 4 - (alvo.getUTCDay() || 7));
  const inicioAno = new Date(Date.UTC(alvo.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((alvo.getTime() - inicioAno.getTime()) / 86400000 + 1) / 7);
  return `${alvo.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
}

/**
 * As pendências viram frases. Cada uma diz o FATO e a data — nunca "você
 * está atrasado": o painel já ordena a prioridade, e o e-mail que julga
 * antes de a pessoa abrir a tela é o que faz o RH parar de abrir o e-mail.
 */
function linhasDoDigest(p: Pendencias): string[] {
  const linhas: string[] = [];

  for (const c of p.campanhas_fechando) {
    linhas.push(
      `<strong>${c.instrumento}</strong> fecha em ${fmt(c.janela_fim)} — `
      + `${c.respondentes} de ${c.convidados} responderam até agora.`,
    );
  }
  // Campanha prestes a fechar entra numa linha só. As duas condições se
  // sobrepõem o tempo todo (janela acabando + adesão baixa), e repetir o
  // mesmo "3 de 41" em dois itens faz a lista parecer maior do que é.
  const jaListadas = new Set(p.campanhas_fechando.map(c => `${c.instrumento}|${c.janela_fim}`));
  for (const b of p.adesao_baixa) {
    if (jaListadas.has(`${b.instrumento}|${b.janela_fim}`)) continue;
    linhas.push(
      `<strong>${b.instrumento}</strong> passou da metade da janela com ${b.taxa}% de resposta `
      + `(${b.respondentes} de ${b.convidados}). Vale reenviar o link ou repor o cartaz — `
      + `adesão baixa costuma ser receio, não desinteresse.`,
    );
  }
  if (p.medidas_atrasadas > 0) {
    linhas.push(
      `<strong>${p.medidas_atrasadas} ${plural(p.medidas_atrasadas, 'medida passou', 'medidas passaram')} do prazo</strong> `
      + `no plano de ação. Concluir com evidência ou repactuar a data mantém o dossiê de pé.`,
    );
  }
  if (p.medidas_vencendo > 0) {
    linhas.push(
      `${p.medidas_vencendo} ${plural(p.medidas_vencendo, 'medida vence', 'medidas vencem')} nos próximos 7 dias.`,
    );
  }
  for (const v of p.medicoes_vencidas) {
    linhas.push(
      `<strong>${v.instrumento}</strong> não é aplicado desde ${fmt(v.desde)} — a próxima medição já era esperada.`,
    );
  }
  if (p.documentos_pendentes > 0) {
    linhas.push(
      `${p.documentos_pendentes} ${plural(p.documentos_pendentes, 'documento aguarda', 'documentos aguardam')} aceite. `
      + `É o aceite que registra a base legal da coleta de dados de saúde.`,
    );
  }
  return linhas;
}

function corpoDigest(p: Pendencias, linhas: string[]) {
  const itens = linhas.map(l => `<li style="margin:0 0 10px;">${l}</li>`).join('');
  return brandedEmailHtml({
    eyebrow: 'Malama · Portal do RH',
    heading: `O que <em>${p.empresa_nome}</em> tem em aberto`,
    bodyParagraphs: [
      'Um resumo do que está com data marcada esta semana. Nada aqui exige resposta a este e-mail — tudo se resolve no painel.',
      `<ul style="margin:0 0 18px;padding-left:20px;">${itens}</ul>`,
    ],
    ctaText: 'Abrir o painel',
    ctaUrl: `${SITE_URL}/rh/dashboard`,
    footnote:
      'Você recebe este resumo porque tem acesso ao Portal do RH da sua empresa. '
      + 'Para deixar de recebê-lo, fale com o usuário principal do painel.',
    preheader: linhas.length === 1 ? '1 item em aberto' : `${linhas.length} itens em aberto`,
  });
}

function corpoCampanhaFechando(p: Pendencias, c: Fechando) {
  const faltam = c.dias <= 0 ? 'hoje' : c.dias === 1 ? 'amanhã' : `em ${c.dias} dias`;
  return brandedEmailHtml({
    eyebrow: 'Malama · Portal do RH',
    heading: `A janela do <em>${c.instrumento}</em> fecha ${faltam}`,
    bodyParagraphs: [
      `Na ${p.empresa_nome}, ${c.respondentes} de ${c.convidados} responderam até agora. `
      + `Depois de ${fmt(c.janela_fim)} não é mais possível receber resposta deste ciclo.`,
      'Se ainda quiser alcançar mais gente, o painel gera o link e o cartaz com QR de cada setor, '
      + 'além do texto pronto para o grupo. Reenviar o convite ao setor inteiro funciona; '
      + 'perguntar a uma pessoa se ela respondeu, não — além de constranger, distorce o resultado.',
    ],
    ctaText: 'Divulgar ou encerrar',
    ctaUrl: `${SITE_URL}/rh/saude-mental#campanhas`,
    footnote: 'Você recebe este aviso uma única vez por campanha.',
    preheader: `${c.respondentes} de ${c.convidados} responderam`,
  });
}

/** Envia para todos os destinatários e devolve quantos saíram. */
async function enviarPara(
  p: Pendencias,
  assunto: string,
  html: string,
): Promise<{ enviados: number; avisos: string[] }> {
  let enviados = 0;
  const avisos: string[] = [];
  for (const d of p.destinatarios) {
    const { sent, warning } = await sendEmail({ to: d.email, subject: assunto, html });
    if (sent) enviados++;
    else if (warning) avisos.push(`${d.email}: ${warning}`);
  }
  return { enviados, avisos };
}

/**
 * Reserva o direito de enviar. Devolve `false` se outra execução já pegou
 * esta ocorrência — é o que impede o mesmo e-mail sair duas vezes quando o
 * cron sobrepõe execuções.
 */
async function reservar(empresaId: string, tipo: string, referencia: string, destinatarios: number) {
  const { data } = await supabase.rpc('rh_marcar_lembrete_enviado', {
    p_empresa_id: empresaId,
    p_tipo: tipo,
    p_referencia: referencia,
    p_destinatarios: destinatarios,
  });
  return data === true;
}

/**
 * Devolve a reserva quando NENHUM e-mail saiu.
 *
 * Sem isto, subir esta função antes de configurar ZEPTOMAIL_TOKEN/
 * RESEND_API_KEY queimaria a chave de dedupe de todas as empresas de uma
 * vez, em silêncio: `sendEmail` devolve `{sent:false}` em vez de lançar, e
 * o log ficaria marcado como enviado para uma semana inteira que ninguém
 * recebeu. Falha parcial (uma pessoa de três) mantém a reserva de
 * propósito — reenviar para quem já leu é pior do que faltar para uma.
 */
async function liberarReserva(empresaId: string, tipo: string, referencia: string) {
  const { error } = await supabase
    .from('rh_lembretes_enviados')
    .delete()
    .match({ empresa_id: empresaId, tipo, referencia });
  if (error) console.error('[rh-reminders] não consegui liberar a reserva:', error.message);
}

Deno.serve(async (req) => {
  if (!autorizado(req)) {
    return new Response(JSON.stringify({ error: 'Nao autorizado' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }
  // `?forcar=1` ignora o dia da semana — para testar sem esperar a segunda.
  // Só chega aqui quem provou o SERVICE_KEY: antes, qualquer um forçava o
  // digest fora do dia.
  // Não ignora o dedupe: reenviar de verdade exige apagar a linha do log.
  const url = new URL(req.url);
  const forcar = url.searchParams.get('forcar') === '1';
  const hoje = new Date();
  const ehDiaDoDigest = forcar || hoje.getUTCDay() === DIA_DO_DIGEST;

  const { data, error } = await supabase.rpc('rh_pendencias_para_lembrete');
  if (error) {
    console.error('[rh-reminders] leitura falhou:', error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const empresas = (data ?? []) as Pendencias[];
  const relatorio = { digests: 0, alertas: 0, emails: 0, avisos: [] as string[] };

  for (const p of empresas) {
    if (!p.destinatarios?.length) continue;

    // 1) Alerta de campanha fechando — um por campanha, em qualquer dia.
    for (const c of p.campanhas_fechando) {
      // Reserva ANTES de enviar, para duas execuções simultâneas do cron não
      // mandarem o mesmo alerta duas vezes. Se nada sair, a reserva volta.
      if (!await reservar(p.empresa_id, 'campanha_fechando', c.campanha_id, p.destinatarios.length)) continue;

      const assunto = `A janela do ${c.instrumento} fecha em ${fmt(c.janela_fim)}`;
      const { enviados, avisos } = await enviarPara(p, assunto, corpoCampanhaFechando(p, c));
      if (enviados === 0) {
        await liberarReserva(p.empresa_id, 'campanha_fechando', c.campanha_id);
      } else {
        relatorio.alertas++;
        relatorio.emails += enviados;
      }
      relatorio.avisos.push(...avisos);
    }

    // 2) Digest semanal.
    if (!ehDiaDoDigest) continue;
    const linhas = linhasDoDigest(p);
    if (linhas.length === 0) continue;

    const semana = semanaIso(hoje);
    if (!await reservar(p.empresa_id, 'semanal', semana, p.destinatarios.length)) continue;

    const assunto = linhas.length === 1
      ? `${p.empresa_nome}: 1 item em aberto no painel`
      : `${p.empresa_nome}: ${linhas.length} itens em aberto no painel`;
    const { enviados, avisos } = await enviarPara(p, assunto, corpoDigest(p, linhas));
    if (enviados === 0) {
      await liberarReserva(p.empresa_id, 'semanal', semana);
    } else {
      relatorio.digests++;
      relatorio.emails += enviados;
    }
    relatorio.avisos.push(...avisos);
  }

  console.log('[rh-reminders]', JSON.stringify(relatorio));
  return new Response(JSON.stringify({ ok: true, ...relatorio }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
