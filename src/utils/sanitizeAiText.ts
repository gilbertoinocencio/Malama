/**
 * Sanitização de texto gerado pela IA — remove "vazamento" de scripts estrangeiros.
 *
 * Por que este arquivo existe: o gemini-2.5-flash ocasionalmente injeta tokens em
 * chinês/japonês/coreano/cirílico no meio de um parágrafo em português (ex.:
 * "o胆固醇 da gema", "perde nutrientes重要的 se tirar", "meta é 170g —刻意 eliminar").
 * É uma falha de geração em nível de token: a instrução no prompt reduz, mas não
 * elimina 100%. Este saneamento é a rede de segurança determinística aplicada à
 * resposta ANTES de mostrá-la ao usuário.
 *
 * O que remove: blocos contíguos de caracteres CJK (Han/Hiragana/Katakana/Hangul)
 * e cirílicos que aparecem grudados em texto latino. Emojis, acentos latinos,
 * pontuação e símbolos (kcal, →, ~, ×, etc.) são preservados.
 */

// Faixas de scripts que NUNCA devem aparecer numa resposta em português.
// Han (chinês/kanji), Hiragana, Katakana, Hangul (coreano) e Cirílico (russo etc.).
const FOREIGN_SCRIPT = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힣Ѐ-ӿԀ-ԯ]/;

// Um ou mais caracteres desses scripts, opcionalmente cercados de espaços,
// para que "o胆固醇 da" vire "o da" e não "o  da".
const FOREIGN_RUN = /\s?[぀-ヿ㐀-䶿一-鿿豈-﫿가-힣Ѐ-ӿԀ-ԯ]+\s?/g;

/**
 * Retorna true se `text` contém qualquer caractere CJK ou cirílico avulso.
 * Barato o suficiente para rodar em toda resposta.
 */
export function hasForeignScript(text: string): boolean {
  return FOREIGN_SCRIPT.test(text);
}

/**
 * Remove trechos em scripts estrangeiros (CJK/cirílico) que a IA tenha injetado
 * por engano numa resposta em português. Idempotente e seguro para textos limpos:
 * se não há nada a remover, devolve a string original.
 *
 * Colapsa espaços duplos e espaços antes de pontuação que sobrarem da remoção,
 * para não deixar buracos como "o  da" ou "nutrientes , se".
 */
export function sanitizeAiText(text: string): string {
  if (!text || !FOREIGN_SCRIPT.test(text)) return text;

  return text
    .replace(FOREIGN_RUN, ' ')
    // Espaço antes de pontuação de fechamento que sobrou da remoção.
    .replace(/\s+([,.;:!?…)\]])/g, '$1')
    // Espaço depois de pontuação de abertura.
    .replace(/([(\[])\s+/g, '$1')
    // Colapsa espaços múltiplos (sem tocar em quebras de linha).
    .replace(/[^\S\n]{2,}/g, ' ')
    .trim();
}
