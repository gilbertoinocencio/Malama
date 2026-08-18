const EVENTO_SUGESTOES = 'malama:rh-setores-sugeridos';
const chave = (empresaId: string) => `malama:rh:setores-sugeridos:${empresaId}`;

const normalizar = (nomes: string[]) => {
  const unicos = new Map<string, string>();
  for (const item of nomes) {
    const nome = item.trim().slice(0, 60);
    if (nome) unicos.set(nome.toLocaleLowerCase('pt-BR'), nome);
  }
  return [...unicos.values()].slice(0, 50);
};

const avisar = (empresaId: string) => {
  window.dispatchEvent(new CustomEvent(EVENTO_SUGESTOES, { detail: { empresaId } }));
};

export const rhSetorSugestoes = {
  evento: EVENTO_SUGESTOES,

  listar(empresaId: string): string[] {
    try {
      const valor = JSON.parse(sessionStorage.getItem(chave(empresaId)) ?? '[]');
      return Array.isArray(valor) ? normalizar(valor.filter(x => typeof x === 'string')) : [];
    } catch {
      return [];
    }
  },

  adicionar(empresaId: string, nomes: string[]) {
    const atualizadas = normalizar([...this.listar(empresaId), ...nomes]);
    try {
      sessionStorage.setItem(chave(empresaId), JSON.stringify(atualizadas));
      avisar(empresaId);
    } catch {
      // Armazenamento bloqueado não pode transformar um perfil já salvo em erro.
    }
    return atualizadas;
  },

  remover(empresaId: string, nome: string) {
    const alvo = nome.trim().toLocaleLowerCase('pt-BR');
    const atualizadas = this.listar(empresaId)
      .filter(item => item.toLocaleLowerCase('pt-BR') !== alvo);
    try {
      sessionStorage.setItem(chave(empresaId), JSON.stringify(atualizadas));
      avisar(empresaId);
    } catch {
      // A criação/edição do setor continua funcional sem as sugestões locais.
    }
    return atualizadas;
  },
};
