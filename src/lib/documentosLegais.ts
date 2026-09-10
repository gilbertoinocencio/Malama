// =====================================================
// Malama — Cabeçalho de versão e vigência dos documentos legais
//
// O texto dos Termos não carrega "Versão X — vigente a partir de Y". Já
// carregou, num rascunho, e com os dois campos por preencher à mão. Número
// de versão e data de publicação são colunas de `documentos_legais` — são
// elas que o aceite carimba e que o registro de ciência guarda. Repetir a
// informação dentro do corpo criaria uma segunda fonte que um dia diverge
// da primeira, e aí a prova aponta para uma data que o próprio documento
// desmente.
//
// Então a linha é IMPRESSA pelo painel, a partir do documento vigente.
// Publicar uma versão nova atualiza o cabeçalho sozinho, em todo lugar que
// exibe o documento: a área da empresa e o aceite do primeiro acesso.
// =====================================================

import type { DocumentoLegal } from '../services/empresaService';

/** Data ISO (YYYY-MM-DD) em pt-BR, sem escorregar de dia por fuso. */
export const fmtDataDocumento = (iso: string | null): string | null =>
  iso
    ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : null;

/**
 * "Versão 2.0 — vigente a partir de 10/09/2026".
 * Sem `publicado_em` (documento antigo, migrado antes da coluna existir),
 * devolve só a versão em vez de inventar uma data.
 */
export function cabecalhoVigencia(doc: Pick<DocumentoLegal, 'versao' | 'publicado_em'>): string {
  const data = fmtDataDocumento(doc.publicado_em);
  return data
    ? `Versão ${doc.versao} — vigente a partir de ${data}`
    : `Versão ${doc.versao}`;
}
