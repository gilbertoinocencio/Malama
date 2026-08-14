import { supabase } from './supabase';

export type CategoriaRelato =
  | 'assedio_moral' | 'assedio_sexual' | 'violencia' | 'discriminacao' | 'retaliacao' | 'outro';
export type UrgenciaRelato = 'imediata' | 'alta' | 'normal';

export type RelatoEnviado = { ok: true; protocolo: string; chave: string };
export type AcompanhamentoRelato = {
  protocolo: string; status: string; retorno: string | null; criado_em: string; atualizado_em: string;
};

export const relatoConfidencialService = {
  async disponivel(): Promise<boolean> {
    const { data, error } = await supabase.rpc('tem_canal_confidencial_empresa');
    if (error) return false;
    return Boolean(data);
  },

  async enviar(p: {
    categoria: CategoriaRelato;
    urgencia: UrgenciaRelato;
    descricao: string;
    setor?: string;
    envolvidos?: string;
    quandoOcorreu?: string;
  }): Promise<RelatoEnviado> {
    const { data, error } = await supabase.rpc('enviar_relato_confidencial', {
      p_categoria: p.categoria,
      p_urgencia: p.urgencia,
      p_descricao: p.descricao,
      p_setor: p.setor || null,
      p_envolvidos: p.envolvidos || null,
      p_quando_ocorreu: p.quandoOcorreu || null,
    });
    if (error) throw error;
    return data as RelatoEnviado;
  },

  async acompanhar(protocolo: string, chave: string): Promise<AcompanhamentoRelato> {
    const { data, error } = await supabase.rpc('acompanhar_relato_confidencial', {
      p_protocolo: protocolo, p_chave: chave,
    });
    if (error) throw error;
    return data as AcompanhamentoRelato;
  },
};
