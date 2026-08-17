// =====================================================
// Malama — Canal de suporte do Portal do RH
//
// O painel dizia "Fale com a Malama" em quatro telas — todas elas de
// bloqueio (conta inativa, empresa não vinculada, nenhum questionário
// liberado) — e nenhuma dizia como. O cliente travado no segundo dia não
// tinha para onde ir de dentro do produto.
//
// Um lugar só define o endereço: se ele mudar, muda aqui e em nenhum outro
// arquivo.
//
// O assunto e o corpo já vão preenchidos com empresa, usuário e a tela de
// origem. Não é conveniência: o primeiro e-mail de suporte quase sempre é
// "não estou conseguindo", e a ida e volta para descobrir de quem e de onde
// custa um dia inteiro na primeira semana do cliente — que é a semana em
// que ele decide se o produto funciona.
// =====================================================

export const EMAIL_SUPORTE = 'suporte@soumalama.com.br';

export type ContextoSuporte = {
  empresa?: string | null;
  usuario?: string | null;
  /** O que a pessoa estava tentando fazer, em uma linha. */
  assunto: string;
  /** Detalhe técnico do bloqueio, quando a tela souber de algum. */
  detalhe?: string;
};

/** `mailto:` com assunto e corpo já montados a partir do contexto da tela. */
export function linkSuporte(ctx: ContextoSuporte): string {
  const assunto = ctx.empresa
    ? `[Portal do RH] ${ctx.assunto} — ${ctx.empresa}`
    : `[Portal do RH] ${ctx.assunto}`;

  const corpo = [
    'Descreva abaixo o que aconteceu:',
    '',
    '',
    '---',
    'Informações que ajudam no atendimento (pode deixar como está):',
    ctx.empresa ? `Empresa: ${ctx.empresa}` : null,
    ctx.usuario ? `Usuário: ${ctx.usuario}` : null,
    `Tela: ${typeof window !== 'undefined' ? window.location.pathname : '—'}`,
    ctx.detalhe ? `Situação: ${ctx.detalhe}` : null,
  ].filter(Boolean).join('\n');

  return `mailto:${EMAIL_SUPORTE}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}
