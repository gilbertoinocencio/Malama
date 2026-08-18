/** Extrai o primeiro objeto JSON válido de uma resposta de IA. */
export function parseAiJson<T>(raw: string): T {
  const cleaned = (raw || '')
    .replace(/^\uFEFF/, '')
    .replace(/```(?:json)?/gi, '')
    .trim();

  if (!cleaned) throw new Error('A resposta estruturada veio vazia');

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // O modelo pode colocar uma frase antes/depois do JSON. Localiza objetos
    // balanceados respeitando strings e escapes, em vez de usar regex gulosa.
  }

  for (let start = 0; start < cleaned.length; start++) {
    if (cleaned[start] !== '{') continue;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < cleaned.length; index++) {
      const char = cleaned[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(cleaned.slice(start, index + 1)) as T;
          } catch {
            break;
          }
        }
      }
    }
  }

  throw new Error('A resposta estruturada da IA veio incompleta');
}
