// =====================================================
// Malama — Briefing pré-sessão do psicólogo
//
// TRÊS REGRAS QUE DEFINEM ESTE ARQUIVO:
//
// 1. EXTRATIVO, NUNCA INTERPRETATIVO. O briefing diz "WHO-5 caiu de 62 para
//    41 em três meses; sono médio de 7h para 5h". Ele NÃO diz "paciente
//    aparenta quadro depressivo". Impressão diagnóstica é o trabalho do
//    psicólogo, e uma IA sugerindo quadro clínico ancora o profissional
//    antes dele ouvir a pessoa — além de ser o tipo de saída que vira
//    problema sério quando está errada.
//
// 2. NÃO LÊ PRONTUÁRIO. Conteúdo de sessão não é enviado a modelo de
//    linguagem nenhum. A entrada é só dado estruturado — números e rótulos
//    que já vieram da RPC psi_contexto_paciente, que por sua vez é o
//    contrato do que a psicologia enxerga.
//
// 3. NÃO PERSISTE. Diferente do briefing médico, que alimenta o loop
//    clínico, aqui o texto é efêmero: gerar de novo custa pouco numa
//    cadência mensal, e não criamos mais um depósito de texto sensível
//    derivado. O que fica registrado é o que o profissional escreve.
//
// Os FATOS determinísticos são devolvidos junto com a prosa, de propósito:
// a interface mostra os dois, então o psicólogo consegue conferir a fonte
// de cada afirmação. "Extrativo" precisa ser verificável, não prometido.
// =====================================================

import { GeminiProxy } from './geminiProxy';
import type { PsiContexto } from '../services/psychologyService';
import type { Srq20Aplicacao } from '../services/psychologyService';
import { CORTE_REFERENCIA } from '../services/srq20';

const genAI = new GeminiProxy();
const MODEL_NAME = 'gemini-2.5-flash';

export type PsiBriefing = {
  /** Prosa curta. Vazia se o modelo falhar — os fatos continuam de pé. */
  resumo: string;
  /** Fatos determinísticos que alimentaram o resumo. Sempre presentes. */
  fatos: string[];
  /** true quando a prosa veio do modelo; false quando é só a lista de fatos. */
  comIA: boolean;
};

const media = (vals: (number | null | undefined)[]): number | null => {
  const v = vals.filter((x): x is number => typeof x === 'number');
  if (v.length === 0) return null;
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
};

/**
 * Monta a lista de fatos a partir do contexto estruturado.
 * Nenhum juízo clínico aqui: só o que está registrado, com número e período.
 */
export function montarFatos(ctx: PsiContexto, srq: Srq20Aplicacao[]): string[] {
  const fatos: string[] = [];

  // Alertas já vêm prontos da RPC, calculados por regra fixa no banco.
  for (const a of ctx.alertas ?? []) fatos.push(a.texto);

  const who5 = ctx.who5 ?? [];
  if (who5.length > 0) {
    const ultimo = who5[who5.length - 1];
    fatos.push(`Último WHO-5: ${ultimo.score} de 100.`);
  } else {
    fatos.push('Sem respostas de WHO-5 registradas no período.');
  }

  const checkins = ctx.checkins ?? [];
  const ultimos14 = checkins.slice(-14);
  if (ultimos14.length > 0) {
    const humor = media(ultimos14.map(c => c.humor));
    const sono = media(ultimos14.map(c => c.sono_horas));
    const qualidade = media(ultimos14.map(c => c.sono_qualidade));
    const partes: string[] = [];
    if (humor != null) partes.push(`humor médio ${humor}`);
    if (sono != null) partes.push(`sono médio ${sono}h`);
    if (qualidade != null) partes.push(`qualidade do sono ${qualidade}`);
    if (partes.length) {
      fatos.push(`Check-ins dos últimos 14 dias (${ultimos14.length} registros): ${partes.join(', ')}.`);
    }
  } else {
    fatos.push('Nenhum check-in diário nos últimos 14 dias.');
  }

  const ativ = ctx.atividade ?? [];
  if (ativ.length > 0) {
    fatos.push(`Atividade física na última semana registrada: ${ativ[ativ.length - 1].minutos} minutos.`);
  }

  if (ctx.peso_variacao_pct != null) {
    const sinal = ctx.peso_variacao_pct > 0 ? 'ganho' : 'perda';
    fatos.push(`Variação de peso em 90 dias: ${sinal} de ${Math.abs(ctx.peso_variacao_pct)}%.`);
  }

  const s = ctx.sessoes ?? {};
  fatos.push(
    `Sessões realizadas: ${s.realizadas ?? 0}${s.faltas ? `; faltas: ${s.faltas}` : ''}.`
  );

  if (srq.length > 0) {
    const ult = srq[0];
    fatos.push(
      `Último SRQ-20: escore ${ult.score} de 20 `
      + `(referência mais citada: ${CORTE_REFERENCIA})`
      + `${ult.item_risco ? '; item de ideação respondido afirmativamente' : ''}.`
    );
  }

  return fatos;
}

const PROMPT_REGRAS = `
Você organiza dados já apurados para um psicólogo ler em 30 segundos antes de
uma sessão. Português brasileiro, no máximo 120 palavras, em 2 ou 3 frases
corridas — sem bullets, sem títulos, sem emojis.

REGRAS ABSOLUTAS:
- Use SOMENTE os fatos listados. Não acrescente nada que não esteja neles.
- NÃO faça hipótese diagnóstica, NÃO nomeie transtorno, NÃO diga que o
  paciente "aparenta" ou "sugere" qualquer quadro clínico.
- NÃO recomende conduta, encaminhamento ou técnica.
- NÃO especule causa para nenhum dado.
- Se os fatos forem escassos, diga isso em uma frase e pare.
- Ordene pelo que mudou mais desde o período anterior.
Seu papel é encadear os fatos em texto legível. A leitura clínica é do
profissional.
`.trim();

/**
 * Gera o briefing. Nunca lança: se o modelo falhar, devolve os fatos, que
 * são o conteúdo que realmente importa.
 */
export async function gerarPsiBriefing(
  ctx: PsiContexto,
  srq: Srq20Aplicacao[],
): Promise<PsiBriefing> {
  const fatos = montarFatos(ctx, srq);

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(
      `${PROMPT_REGRAS}\n\nFatos apurados:\n${fatos.map(f => `- ${f}`).join('\n')}`
    );
    const resumo = (result.response.text() || '').trim();
    if (!resumo) return { resumo: '', fatos, comIA: false };
    return { resumo, fatos, comIA: true };
  } catch {
    // Falha do modelo não pode tirar o contexto do profissional.
    return { resumo: '', fatos, comIA: false };
  }
}
