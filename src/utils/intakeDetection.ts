/**
 * Detecção de ingestão (água / comida) — fonte ÚNICA de verdade.
 *
 * Por que este arquivo existe: a mesma lógica de "isto é um log de água?" estava
 * copiada e divergente em 3 pontos (unifiedChatService ×2 + MealLogger), e todas as
 * cópias usavam `\b` colado em palavra acentuada — o que NUNCA casa. Em "de água",
 * o char antes de `á` é espaço (não-`\w`) e `á` também não é `\w` (acento fica fora
 * de `[A-Za-z0-9_]` sem flag `u`), então não existe fronteira de palavra antes do `á`
 * e `/\bágua\b/` falha em silêncio. Resultado: água relatada não era registrada e o
 * agente acabava comentando refeições antigas como se fossem de agora.
 *
 * A correção é casar "palavra inteira" de forma Unicode-aware, via lookarounds de
 * letra/número (`\p{L}`/`\p{N}`) com a flag `u`, em vez de `\b`. Lookbehind é
 * suportado no WebView Chromium do Capacitor 8 e pelo build do Vite.
 */

/**
 * Testa se `text` contém alguma das alternativas como palavra inteira, tratando
 * letras acentuadas como letras. Ex.: containsWord("de água", "água|agua") → true;
 * containsWord("aguardar", "agua") → false (o lookahead exige fim de palavra).
 */
function containsWord(text: string, alternation: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternation})(?![\\p{L}\\p{N}])`, 'iu').test(text);
}

/** Menciona água/hidratação (não diz nada sobre ter bebido). */
export function userMentionsWater(text: string): boolean {
  return containsWord(text.toLowerCase(), 'água|agua|water|h2o|hidrat\\w*');
}

/** Bebida calórica na mesma mensagem → não é log de água pura; <meal_json> é dono. */
export function mentionsCalorieBeverage(text: string): boolean {
  return containsWord(
    text.toLowerCase(),
    'coca|pepsi|guaraná|guarana|refrigerante|suco|café|cafe|chá|cha|cerveja|vinho|leite|energético|energetico|whey|isotônico|isotonico|gatorade|powerade|kombucha|smoothie|vitamina|shake|achocolatado|alcohol|álcool|alcool',
  );
}

/**
 * O usuário relatou DE FATO ter bebido água? Exige menção a água + sinal real de
 * ingestão (verbo no passado, quantidade em ml/l, ou nº de copos/garrafas/goles),
 * e descarta quando há bebida calórica na mesma frase. É a única fonte de verdade
 * para SE houve consumo — a estimativa de quantidade da IA nunca decide isso.
 */
export function userReportedWaterIntake(text: string): boolean {
  const lower = text.toLowerCase();
  if (!userMentionsWater(lower)) return false;
  if (mentionsCalorieBeverage(lower)) return false;
  const reportsIntake =
    containsWord(lower, 'bebi|bebei|tomei|ingeri|bebendo|tomando|bebo|tomo|enchi|tomada')
    || /\d+\s*(ml|l\b|litro|litros)\b/.test(lower)
    || containsWord(lower, '(?:um|uma|dois|duas|tr[êe]s|quatro|\\d+)\\s*(?:copo|copos|garrafa|garrafas|gole|goles)');
  return reportsIntake;
}

/**
 * Extrai a quantidade em ml declarada pelo usuário (ml, litro/litros, "2l").
 * Dígitos são `\w`, então as regras numéricas com `\b` funcionam normalmente.
 * Retorna 0 quando nenhuma quantidade explícita foi dada.
 */
export function parseStatedMl(text: string): number {
  const lower = text.toLowerCase();
  const mlMatch    = lower.match(/(\d+(?:[.,]\d+)?)\s*ml/);
  const litroMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:litro|litros)\b/);
  const lMatch     = lower.match(/(\d+(?:[.,]\d+)?)\s*l\b/);
  if (mlMatch)    return parseFloat(mlMatch[1].replace(',', '.'));
  if (litroMatch) return parseFloat(litroMatch[1].replace(',', '.')) * 1000;
  if (lMatch)     return parseFloat(lMatch[1].replace(',', '.')) * 1000;
  return 0;
}

/** Menciona comida / refeição (usado para distinguir log de água pura). */
export function mentionsFood(text: string): boolean {
  return containsWord(
    text.toLowerCase(),
    'comi|almoc\\w*|almoç\\w*|jantei|jantar|lanchei|lanche|café da manhã|cafe da manha|ovo|ovos|pão|pao|pães|paes|arroz|feijão|feijao|frango|carne|salada|fruta|poke|bowl|salmão|salmao|refeição|refeicao|prato|sanduíche|sanduiche|pizza',
  );
}

/**
 * Log de água PURA: o usuário está reportando SÓ água — sem comida e sem outra
 * bebida. Nesse caso o contexto de refeições recentes deve ser suprimido para o
 * agente focar exclusivamente em hidratação e nunca comentar uma refeição passada.
 */
export function isPureWaterLog(text: string): boolean {
  const lower = text.toLowerCase();
  return userReportedWaterIntake(lower) && !mentionsFood(lower);
}

/**
 * Limite máximo, por registro, de água que é gravado automaticamente. Acima disso
 * a agente NÃO registra: confirma com o usuário, aconselha e sugere correção (um
 * único copo/garrafa raramente passa de alguns litros). Mantido como constante
 * única para que prompt e interceptor concordem. Ajustável em um só lugar.
 */
export const WATER_MAX_ML = 4000;

/**
 * A mensagem traz um SINAL DE QUANTIDADE de bebida (número em ml/l, ou recipiente
 * como copo/garrafa/gole)? Usado para reconhecer a RESPOSTA do usuário quando a
 * agente perguntou "quanto você bebeu?" — mesmo que ele responda só "300ml" ou
 * "2 copos", sem repetir a palavra "água".
 */
export function mentionsQuantitySignal(text: string): boolean {
  const lower = text.toLowerCase();
  return /\d+\s*(ml|l\b|litro|litros)\b/.test(lower)
    || /\d/.test(lower)
    || containsWord(lower, '(?:um|uma|dois|duas|tr[êe]s|quatro|meio|meia)?\\s*(?:copo|copos|garrafa|garrafas|gole|goles)');
}

/**
 * A mensagem é APENAS uma quantidade de bebida (ex: "300ml", "2 copos", "meio litro",
 * "1l"), nada mais? Indica que o usuário está respondendo a uma pergunta da agente
 * ("quanto você bebeu?"). Restrito de propósito para não capturar porção de comida
 * ("300g de arroz" não casa — "g" não está na lista).
 */
export function isBareQuantityAnswer(text: string): boolean {
  return /^\s*(?:meio|meia|um|uma|dois|duas|tr[êe]s|quatro|\d+(?:[.,]\d+)?)?\s*(?:ml|l|litros?|copos?|garrafas?|goles?)\s*$/iu.test(text.trim());
}
