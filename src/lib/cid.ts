// =====================================================
// Malama — Capítulos do CID-10
//
// Fonte única. Estava declarada dentro de RhAbsenteismo.tsx; a ingestão do
// eSocial precisa da mesma lista, e uma segunda cópia divergiria na primeira
// correção de rótulo.
//
// Só a LETRA é guardada no banco (empresa_afastamentos.cid_grupo). O código
// de quatro dígitos nunca é persistido: identifica diagnóstico, e a decisão
// da migration 20260731 foi guardar o mínimo que produz o indicador.
// =====================================================

export const CID_GRUPOS: { letra: string; label: string }[] = [
  { letra: 'F', label: 'F — Transtornos mentais e comportamentais' },
  { letra: 'M', label: 'M — Sistema osteomuscular e conjuntivo' },
  { letra: 'J', label: 'J — Aparelho respiratório' },
  { letra: 'S', label: 'S — Lesões e traumatismos' },
  { letra: 'T', label: 'T — Lesões e causas externas' },
  { letra: 'I', label: 'I — Aparelho circulatório' },
  { letra: 'K', label: 'K — Aparelho digestivo' },
  { letra: 'G', label: 'G — Sistema nervoso' },
  { letra: 'N', label: 'N — Aparelho geniturinário' },
  { letra: 'R', label: 'R — Sintomas e sinais' },
  { letra: 'A', label: 'A — Doenças infecciosas' },
  { letra: 'B', label: 'B — Doenças infecciosas (cont.)' },
  { letra: 'C', label: 'C — Neoplasias' },
  { letra: 'E', label: 'E — Endócrinas e metabólicas' },
  { letra: 'H', label: 'H — Olhos e ouvidos' },
  { letra: 'L', label: 'L — Pele e subcutâneo' },
  { letra: 'O', label: 'O — Gravidez e puerpério' },
  { letra: 'Z', label: 'Z — Outros fatores de saúde' },
];

/** Letra → rótulo curto, sem o prefixo "X — ". */
export const CID_LABEL: Record<string, string> = Object.fromEntries(
  CID_GRUPOS.map(g => [g.letra, g.label.split('— ')[1] ?? g.letra])
);
