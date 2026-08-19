import { supabase } from './supabase';

export type CategoriaRelato =
  | 'assedio_moral' | 'assedio_sexual' | 'violencia' | 'discriminacao' | 'retaliacao' | 'outro';
export type UrgenciaRelato = 'imediata' | 'alta' | 'normal';

export type DadosRelato = {
  categoria: CategoriaRelato;
  urgencia: UrgenciaRelato;
  descricao: string;
  setor?: string;
  envolvidos?: string;
  quandoOcorreu?: string;
};

/**
 * Canal confidencial de assédio, violência e discriminação.
 *
 * NÃO existe acompanhamento e isso é decisão de produto, não lacuna: o
 * protocolo é o número do caso do RH, para o arquivo de provas, e nunca foi
 * código do relator. Como nada liga o relato a uma pessoa, não há a quem
 * devolver retorno — e um código na mão de quem relatou seria só papel
 * comprometedor que não abre nada.
 *
 * Nenhum dos dois caminhos escreve em localStorage. Aparelho compartilhado é o
 * caso comum aqui, e um rastro local entrega a pessoa dentro de casa ou no
 * chão de fábrica.
 */
export const relatoConfidencialService = {
  async disponivel(): Promise<boolean> {
    const { data, error } = await supabase.rpc('tem_canal_confidencial_empresa');
    if (error) return false;
    return Boolean(data);
  },

  /** Colaborador logado no app. A empresa vem do vínculo ativo. */
  async enviar(p: DadosRelato): Promise<void> {
    const { error } = await supabase.rpc('enviar_relato_confidencial', {
      p_categoria: p.categoria,
      p_urgencia: p.urgencia,
      p_descricao: p.descricao,
      p_setor: p.setor || null,
      p_envolvidos: p.envolvidos || null,
      p_quando_ocorreu: p.quandoOcorreu || null,
    });
    if (error) throw error;
  },

  /**
   * Sem login, pelo link do questionário. Empresa em modo compliance não dá app
   * ao colaborador — este é o único caminho que essa base tem.
   *
   * O token serve só para o servidor resolver a empresa: ele não é gravado no
   * relato, e o setor que o token conhece NÃO é herdado. Em setor pequeno,
   * herdar identificaria a pessoa sem ela ter escolhido isso.
   */
  async enviarPublico(token: string, p: DadosRelato): Promise<void> {
    const { error } = await supabase.rpc('enviar_relato_publico', {
      p_token: token,
      p_categoria: p.categoria,
      p_urgencia: p.urgencia,
      p_descricao: p.descricao,
      p_setor: p.setor || null,
      p_envolvidos: p.envolvidos || null,
      p_quando_ocorreu: p.quandoOcorreu || null,
    });
    if (error) throw error;
  },
};
