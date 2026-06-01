// =====================================================
// Malama — Serviço do módulo Empresas (B2B)
// empresaAdminService → usado pelo Super Admin
// rhService           → usado pelo portal do RH (/rh)
// =====================================================

import { supabase } from './supabase';

// ─── Tipos ─────────────────────────────────────────────
export type EmpresaStatus = 'ativa' | 'pausada' | 'encerrada';

export type Empresa = {
  id: string;
  nome: string;
  cnpj: string | null;
  responsavel_nome: string | null;
  responsavel_email: string | null;
  responsavel_telefone: string | null;
  valor_por_assento: number | null;
  max_assentos: number | null;
  status: EmpresaStatus;
  data_inicio: string | null;
  created_at: string;
  updated_at: string;
};

export type EmpresaSummary = Empresa & {
  assentos_ativos: number;   // colaboradores ativos + convidados (ocupam assento)
  mrr: number;               // assentos_ativos * valor_por_assento
};

export type ColaboradorStatus = 'convidado' | 'ativo' | 'removido';

export type EmpresaColaborador = {
  id: string;
  empresa_id: string;
  user_id: string | null;
  email: string;
  status: ColaboradorStatus;
  data_adicao: string;
  data_ativacao: string | null;
  removido_em: string | null;
};

export type EmpresaLead = {
  id: string;
  nome: string | null;
  empresa: string | null;
  email: string | null;
  num_colaboradores: string | null;
  status: 'novo' | 'em_contato' | 'convertido' | 'descartado';
  created_at: string;
};

export type B2BDashboard = {
  empresas_ativas: number;
  total_colaboradores: number; // colaboradores com acesso (ativos)
  mrr_total: number;
  leads_pendentes: number;
};

const OCUPAM_ASSENTO: ColaboradorStatus[] = ['ativo', 'convidado'];

// ─── Super Admin ───────────────────────────────────────
export const empresaAdminService = {
  // Lista empresas com agregados de assentos ativos e MRR
  async getAll(): Promise<EmpresaSummary[]> {
    const { data: empresas, error } = await supabase
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!empresas?.length) return [];

    const ids = empresas.map(e => e.id);
    const { data: colabs } = await supabase
      .from('empresa_colaboradores')
      .select('empresa_id, status')
      .in('empresa_id', ids);

    return empresas.map((e: Empresa) => {
      const ativos = (colabs ?? []).filter(
        c => c.empresa_id === e.id && OCUPAM_ASSENTO.includes(c.status as ColaboradorStatus)
      ).length;
      return {
        ...e,
        assentos_ativos: ativos,
        mrr: ativos * (e.valor_por_assento ?? 0),
      };
    });
  },

  async getDashboard(): Promise<B2BDashboard> {
    const [empresas, leads] = await Promise.all([
      this.getAll(),
      supabase
        .from('empresa_leads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'novo'),
    ]);

    const ativas = empresas.filter(e => e.status === 'ativa');
    return {
      empresas_ativas: ativas.length,
      total_colaboradores: empresas.reduce((s, e) => s + e.assentos_ativos, 0),
      mrr_total: ativas.reduce((s, e) => s + e.mrr, 0),
      leads_pendentes: leads.count ?? 0,
    };
  },

  // Cria empresa + conta de login do RH (via Edge Function service_role)
  async create(payload: {
    empresa: Partial<Empresa>;
    rh: { email: string; password: string; nome?: string };
  }): Promise<Empresa> {
    const { data, error } = await supabase.functions.invoke('create-rh-user', {
      body: payload,
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data.empresa as Empresa;
  },

  async update(id: string, data: Partial<Empresa>): Promise<Empresa> {
    const { data: updated, error } = await supabase
      .from('empresas')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  },

  async setStatus(id: string, status: EmpresaStatus): Promise<void> {
    const { error } = await supabase
      .from('empresas')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  // Colaboradores de uma empresa (visão do admin)
  async getColaboradores(empresaId: string): Promise<EmpresaColaborador[]> {
    const { data, error } = await supabase
      .from('empresa_colaboradores')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_adicao', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Leads da landing /empresas
  async getLeads(): Promise<EmpresaLead[]> {
    const { data, error } = await supabase
      .from('empresa_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async updateLeadStatus(id: string, status: EmpresaLead['status']): Promise<void> {
    const { error } = await supabase
      .from('empresa_leads')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  },
};

// ─── Portal do RH ──────────────────────────────────────
// Importante: o RH NUNCA enxerga valor_por_assento nem MRR.
export const rhService = {
  // Empresa do RH logado (sem campos financeiros)
  async getMyEmpresa(): Promise<Pick<Empresa, 'id' | 'nome' | 'max_assentos' | 'status'> | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: rh } = await supabase
      .from('rh_usuarios')
      .select('empresa_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!rh) return null;

    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('id, nome, max_assentos, status')
      .eq('id', rh.empresa_id)
      .single();
    if (error) return null;
    return empresa;
  },

  async getColaboradores(empresaId: string): Promise<EmpresaColaborador[]> {
    const { data, error } = await supabase
      .from('empresa_colaboradores')
      .select('*')
      .eq('empresa_id', empresaId)
      .neq('status', 'removido')
      .order('data_adicao', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Adiciona colaborador por e-mail (via Edge Function: valida assentos, vincula ou convida)
  async inviteColaborador(email: string): Promise<{ status: ColaboradorStatus; linked?: boolean; invited?: boolean; warning?: string }> {
    const { data, error } = await supabase.functions.invoke('invite-colaborador', {
      body: { email, redirect_to: `${window.location.origin}/acesso` },
    });
    if (error) {
      // FunctionsHttpError expõe a Response em .context — lê o { error } do corpo
      let msg = error.message;
      const resp = (error as { context?: Response }).context;
      if (resp && typeof resp.json === 'function') {
        try {
          const body = await resp.json();
          if (body?.error) msg = body.error;
        } catch { /* mantém msg padrão */ }
      }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  },

  // Remove vínculo (mantém conta/dados do usuário); libera o assento
  async removeColaborador(id: string): Promise<void> {
    const { error } = await supabase
      .from('empresa_colaboradores')
      .update({ status: 'removido', removido_em: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};
