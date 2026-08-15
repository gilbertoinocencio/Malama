// =====================================================
// Malama — Selo de verificação dos documentos emitidos
//
// Nenhum dos PDFs tinha como ser conferido: qualquer editor recriava um
// documento idêntico, e o valor probatório caía junto. O hash é do SNAPSHOT
// registrado no banco — quem recebe o PDF confere o número e o selo contra
// o registro da empresa.
//
// A serialização é canônica (chaves ordenadas) porque JSON.stringify comum
// depende da ordem de inserção: o mesmo conteúdo geraria selos diferentes
// dependendo de como o objeto foi montado.
// =====================================================

/** JSON com chaves ordenadas em todos os níveis. */
function canonico(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(canonico);
  if (valor && typeof valor === 'object') {
    return Object.keys(valor as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, chave) => {
        acc[chave] = canonico((valor as Record<string, unknown>)[chave]);
        return acc;
      }, {});
  }
  return valor;
}

/**
 * SHA-256 do payload, em hexadecimal maiúsculo e truncado em 32 caracteres
 * (128 bits) — o suficiente para conferência manual sem ocupar duas linhas
 * do rodapé do PDF.
 */
export async function hashDocumento(payload: unknown): Promise<string> {
  const texto = JSON.stringify(canonico(payload));
  const bytes = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
    .toUpperCase();
}

/** Selo formatado em grupos de 8, para conferir a olho sem se perder. */
export const formatarHash = (hash: string): string =>
  (hash.match(/.{1,8}/g) ?? [hash]).join(' ');
