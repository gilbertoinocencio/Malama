// =====================================================
// Malama — Marca de "já viu a apresentação do painel"
//
// Por usuário, e não por navegador: RH e SST costumam dividir a mesma
// máquina na sala, e uma chave global faria o segundo a entrar nunca ver a
// apresentação — justamente o perfil que chega sem contexto da venda.
//
// localStorage e não banco: errar para o lado de mostrar de novo (máquina
// nova, aba anônima) é barato; errar para o lado de esconder deixa alguém
// perdido sem ter como pedir de volta. Mesmo assim há como reabrir pelo
// "Como funciona".
// =====================================================

const chave = (usuarioId: string) => `Malama_rh_apresentacao_${usuarioId}`;

export function jaViuApresentacao(usuarioId: string): boolean {
  try {
    return localStorage.getItem(chave(usuarioId)) === 'true';
  } catch {
    // Sem localStorage não dá para lembrar da decisão; mostrar toda vez
    // seria hostil, então tratamos como já visto.
    return true;
  }
}

export function marcarApresentacaoVista(usuarioId: string): void {
  try {
    localStorage.setItem(chave(usuarioId), 'true');
  } catch {
    // Ambiente sem localStorage: silencioso de propósito.
  }
}
