// =====================================================
// Malama — SRQ-20 (Self-Reporting Questionnaire, OMS)
//
// ⚠️ INSTRUMENTO CLÍNICO. NÃO PERTENCE AO CATÁLOGO DE CAMPANHAS.
// O SRQ-20 é aplicado pelo psicólogo em sessão e o resultado vive no
// prontuário. Ele NUNCA pode ir para psychosocial_assessments, que alimenta
// o relatório agregado da empresa — por isso mora aqui, e não em
// psychosocialInstruments.ts. Registrar o SRQ-20 como campanha faria
// resposta clínica virar insumo de painel de RH.
//
// PROVENIÊNCIA DA REDAÇÃO
// Transcrita da Tabela 1 de: Gonçalves DM, Stein AT, Kapczinski F.
// "Estrutura fatorial e consistência interna do Self-Reporting Questionnaire
// (SRQ-20) em população urbana". Cad. Saúde Pública. Instrumento da OMS,
// validado no Brasil por Mari & Williams (Br J Psychiatry, 1986).
//
// Ortografia atualizada pela reforma de 2009 ("freqüentemente" →
// "frequentemente", "idéia" → "ideia"). Mudança ortográfica, não semântica.
//
// ⚠️ TRÊS PONTOS PENDENTES DE CONFERÊNCIA — ver PENDENCIAS_SRQ20 abaixo.
// =====================================================

export const PENDENCIAS_SRQ20 = `
1. ORDEM DOS ITENS. A lista abaixo segue o agrupamento POR FATOR usado na
   tabela do artigo (humor, somáticos, energia, pensamentos depressivos), que
   é uma apresentação analítica — não a ordem de aplicação do instrumento.
   O escore é soma simples e não muda, mas a ordem de administração deveria
   ser conferida contra uma fonte canônica (guia da OMS ou Mari & Williams).

2. ITEM DE IDEAÇÃO SUICIDA. A tabela do artigo traz "Tem pensado em dar fim
   à sua vida?"; o texto do MESMO artigo cita "Tem tido ideia de acabar com a
   vida?". Adotei a redação da tabela por ser a listagem formal. Item mais
   sensível do instrumento — vale confirmar.

3. ITEM DE PAPEL ÚTIL. Mesma divergência: tabela diz "Sente-se incapaz de
   desempenhar papel útil em sua vida?"; o texto diz "Você é incapaz de
   desempenhar um papel útil em sua vida?".

Corrigir = editar o array ITENS_SRQ20. As chaves (q1..q20) são estáveis e
não devem mudar: elas são o que está gravado no banco.
`.trim();

export type ItemSrq20 = {
  /** Chave estável gravada em answers. Nunca renomear. */
  key: string;
  texto: string;
  grupo: 'humor' | 'somaticos' | 'energia' | 'pensamentos';
  /**
   * Item de risco. Não é identificado por número porque a numeração
   * canônica varia entre publicações — a marcação vive no próprio item.
   */
  risco?: true;
};

export const ITENS_SRQ20: readonly ItemSrq20[] = [
  // ── Humor depressivo-ansioso ──
  { key: 'q1',  grupo: 'humor', texto: 'Sente-se nervoso, tenso ou preocupado?' },
  { key: 'q2',  grupo: 'humor', texto: 'Assusta-se com facilidade?' },
  { key: 'q3',  grupo: 'humor', texto: 'Sente-se triste ultimamente?' },
  { key: 'q4',  grupo: 'humor', texto: 'Você chora mais do que de costume?' },

  // ── Sintomas somáticos ──
  { key: 'q5',  grupo: 'somaticos', texto: 'Tem dores de cabeça frequentemente?' },
  { key: 'q6',  grupo: 'somaticos', texto: 'Você dorme mal?' },
  { key: 'q7',  grupo: 'somaticos', texto: 'Você sente desconforto estomacal?' },
  { key: 'q8',  grupo: 'somaticos', texto: 'Você tem má digestão?' },
  { key: 'q9',  grupo: 'somaticos', texto: 'Você tem falta de apetite?' },
  { key: 'q10', grupo: 'somaticos', texto: 'Tem tremores nas mãos?' },

  // ── Decréscimo de energia vital ──
  // A tabela do artigo imprime "Você se cansa-se com facilidade?" — erro de
  // composição evidente. Corrigido para a forma que aparece em outra
  // publicação sobre o mesmo instrumento.
  { key: 'q11', grupo: 'energia', texto: 'Você se cansa com facilidade?' },
  { key: 'q12', grupo: 'energia', texto: 'Tem dificuldade em tomar decisão?' },
  { key: 'q13', grupo: 'energia', texto: 'Tem dificuldades de ter satisfação em suas tarefas?' },
  { key: 'q14', grupo: 'energia', texto: 'O seu trabalho traz sofrimento?' },
  { key: 'q15', grupo: 'energia', texto: 'Sente-se cansado todo o tempo?' },
  { key: 'q16', grupo: 'energia', texto: 'Tem dificuldade de pensar claramente?' },

  // ── Pensamentos depressivos ──
  { key: 'q17', grupo: 'pensamentos', texto: 'Sente-se incapaz de desempenhar papel útil em sua vida?' },
  { key: 'q18', grupo: 'pensamentos', texto: 'Tem perdido o interesse pelas coisas?' },
  { key: 'q19', grupo: 'pensamentos', texto: 'Tem pensado em dar fim à sua vida?', risco: true },
  { key: 'q20', grupo: 'pensamentos', texto: 'Sente-se inútil em sua vida?' },
] as const;

export const GRUPO_LABEL: Record<ItemSrq20['grupo'], string> = {
  humor: 'Humor depressivo-ansioso',
  somaticos: 'Sintomas somáticos',
  energia: 'Decréscimo de energia vital',
  pensamentos: 'Pensamentos depressivos',
};

export const ITEM_RISCO = ITENS_SRQ20.find(i => i.risco)!;

/**
 * Ponto de corte.
 *
 * A literatura brasileira NÃO converge num valor único: estudos usam de 5 a 8,
 * e há trabalhos com corte diferente por sexo. 7/8 é o mais citado; um estudo
 * mais recente encontrou 6 para a amostra total.
 *
 * Por isso a interface mostra o escore com a faixa, e não um veredito. Cravar
 * um número e chamar de "positivo" daria ao rastreio uma aparência
 * diagnóstica que ele não tem.
 */
export const CORTE_REFERENCIA = 7;
export const CORTE_FAIXA = '5 a 8, conforme o estudo e a população';

export type Srq20Resultado = {
  score: number;          // 0–20
  itemRisco: boolean;     // item de ideação respondido "sim"
  porGrupo: Record<ItemSrq20['grupo'], number>;
};

/** Escore determinístico: soma das respostas afirmativas. Nunca por IA. */
export function computeSrq20(answers: Record<string, boolean>): Srq20Resultado {
  const faltando = ITENS_SRQ20.filter(i => typeof answers[i.key] !== 'boolean');
  if (faltando.length > 0) {
    throw new Error(`SRQ-20 incompleto: faltam ${faltando.length} resposta(s)`);
  }

  const porGrupo: Record<ItemSrq20['grupo'], number> = {
    humor: 0, somaticos: 0, energia: 0, pensamentos: 0,
  };
  let score = 0;
  for (const item of ITENS_SRQ20) {
    if (answers[item.key]) { score += 1; porGrupo[item.grupo] += 1; }
  }

  return { score, itemRisco: answers[ITEM_RISCO.key] === true, porGrupo };
}
