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
  // Billing / bloqueio (migration 20260619)
  acesso_bloqueado?: boolean;
  bloqueado_em?: string | null;
  bloqueio_motivo?: string | null;
  cobranca_email?: string | null;
  cobranca_responsavel?: string | null;
  // Plano psicológico — upsell B2B (migration 20260723)
  plano_psicologico?: boolean;
  valor_assento_psi?: number | null;
  max_assentos_psi?: number | null;
};

export type EmpresaSummary = Empresa & {
  assentos_ativos: number;   // colaboradores ativos + convidados (ocupam assento)
  mrr: number;               // assentos_ativos * valor_por_assento
  inadimplente: boolean;     // tem ≥1 fatura 'atrasado'
};

export type EmpresaFatura = {
  id: string;
  empresa_id: string;
  competencia: string;
  valor: number;
  vencimento: string;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  asaas_payment_id: string | null;
  asaas_invoice_url: string | null;
  asaas_bankslip_url: string | null;
  asaas_pix_payload: string | null;
  pago_em: string | null;
  created_at: string;
};

export type BillingEvento = {
  id: string;
  empresa_id: string;
  tipo: 'inadimplente' | 'bloqueio' | 'reativacao' | 'cobranca_gerada';
  descricao: string | null;
  lido: boolean;
  created_at: string;
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
  // Recortes do relatório psicossocial k-anônimo (NR-1/PGR). Opcionais.
  setor: string | null;
  funcao: string | null;
  // Plano psicológico (upsell): RH alocou este colaborador?
  plano_psicologico?: boolean;
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

export type BancoAlimentos = {
  id: string;
  nome: string;
  cnpj: string | null;
  created_at: string;
};

export type CertificadoEsg = {
  id: string;
  empresa_id: string;
  repasse_id: string | null;
  competencia: string;
  colaboradores_ativos: number;
  kg_perdido: number;
  kg_doado: number;
  banco_nome: string | null;
  banco_cnpj: string | null;
  data_repasse: string;
  numero_sequencial: string;
  hash_verificacao: string;
  created_at: string;
};

export type B2BDashboard = {
  empresas_ativas: number;
  total_colaboradores: number; // colaboradores com acesso (ativos)
  mrr_total: number;
  leads_pendentes: number;
};

export type B2BDashboardStats = {
  empresas_ativas: number;
  novas_mes: number;
  total_assentos: number;
  total_colaboradores: number;
  mrr_b2b: number;
  bloqueadas: number;
  inadimplentes: number;
  reducoes_agendadas: number;
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
    const [{ data: colabs }, { data: atrasadas }] = await Promise.all([
      supabase.from('empresa_colaboradores').select('empresa_id, status').in('empresa_id', ids),
      supabase.from('empresa_faturas').select('empresa_id').eq('status', 'atrasado').in('empresa_id', ids),
    ]);
    const inadimplentes = new Set((atrasadas ?? []).map(f => f.empresa_id));

    return empresas.map((e: Empresa) => {
      const ativos = (colabs ?? []).filter(
        c => c.empresa_id === e.id && OCUPAM_ASSENTO.includes(c.status as ColaboradorStatus)
      ).length;
      return {
        ...e,
        assentos_ativos: ativos,
        // Receita = valor por assento × assentos CONTRATADOS (independe do uso).
        mrr: (e.max_assentos ?? 0) * (e.valor_por_assento ?? 0),
        inadimplente: inadimplentes.has(e.id),
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

  async getDashboardStats(): Promise<B2BDashboardStats> {
    const primeiroDiaDoMes = new Date();
    primeiroDiaDoMes.setDate(1);
    primeiroDiaDoMes.setHours(0, 0, 0, 0);

    const [
      { data: empresas },
      { count: totalColabs },
      { count: inadimplentes },
      { count: leads },
    ] = await Promise.all([
      supabase
        .from('empresas')
        .select('id, status, max_assentos, valor_por_assento, acesso_bloqueado, max_assentos_agendado, created_at'),
      supabase
        .from('empresa_colaboradores')
        .select('*', { count: 'exact', head: true })
        .in('status', OCUPAM_ASSENTO),
      supabase
        .from('empresa_faturas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'atrasado'),
      supabase
        .from('empresa_leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'novo'),
    ]);

    const ativas = (empresas ?? []).filter(e => e.status === 'ativa');
    return {
      empresas_ativas: ativas.length,
      novas_mes: ativas.filter(e => new Date(e.created_at) >= primeiroDiaDoMes).length,
      total_assentos: ativas.reduce((s, e) => s + (e.max_assentos ?? 0), 0),
      total_colaboradores: totalColabs ?? 0,
      mrr_b2b: ativas.reduce((s, e) => s + (e.max_assentos ?? 0) * (e.valor_por_assento ?? 0), 0),
      bloqueadas: ativas.filter(e => e.acesso_bloqueado).length,
      inadimplentes: inadimplentes ?? 0,
      reducoes_agendadas: ativas.filter(e => e.max_assentos_agendado != null).length,
      leads_pendentes: leads ?? 0,
    };
  },

  async getAllFaturas(statusFilter?: EmpresaFatura['status']): Promise<(EmpresaFatura & { empresa_nome: string })[]> {
    let q = supabase
      .from('empresa_faturas')
      .select('*, empresas(nome)')
      .order('created_at', { ascending: false });
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...row,
      empresa_nome: row.empresas?.nome ?? '–',
      empresas: undefined,
    }));
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

  // ── Billing / bloqueio ──────────────────────────────
  // Bloqueio/desbloqueio MANUAL do acesso dos colaboradores (decisão do admin).
  async setBloqueio(id: string, bloqueado: boolean, motivo?: string): Promise<void> {
    const { error } = await supabase
      .from('empresas')
      .update({
        acesso_bloqueado: bloqueado,
        bloqueado_em: bloqueado ? new Date().toISOString() : null,
        bloqueio_motivo: bloqueado ? (motivo ?? null) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;

    await supabase.from('empresa_billing_eventos').insert([{
      empresa_id: id,
      tipo: bloqueado ? 'bloqueio' : 'reativacao',
      descricao: bloqueado
        ? `Acesso bloqueado manualmente pelo admin${motivo ? `: ${motivo}` : ''}.`
        : 'Acesso reativado manualmente pelo admin.',
    }]);
  },

  async getFaturas(empresaId: string): Promise<EmpresaFatura[]> {
    const { data, error } = await supabase
      .from('empresa_faturas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('competencia', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Gera cobrança no Asaas (via edge function). billingType: BOLETO | PIX | UNDEFINED.
  async gerarCobranca(
    empresaId: string,
    opts: { vencimento: string; billingType?: 'BOLETO' | 'PIX' | 'UNDEFINED' }
  ): Promise<{ ok: boolean; valor: number; invoice_url: string | null }> {
    const { data, error } = await supabase.functions.invoke('empresa-cobranca', {
      body: { empresa_id: empresaId, vencimento: opts.vencimento, billing_type: opts.billingType ?? 'UNDEFINED' },
    });
    if (error) {
      let msg = error.message;
      const resp = (error as { context?: Response }).context;
      if (resp && typeof resp.json === 'function') {
        try { const b = await resp.json(); if (b?.error) msg = b.error; } catch { /* mantém */ }
      }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async getBillingEventos(apenasNaoLidos = false): Promise<BillingEvento[]> {
    let q = supabase.from('empresa_billing_eventos').select('*').order('created_at', { ascending: false });
    if (apenasNaoLidos) q = q.eq('lido', false);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async marcarEventoLido(id: string): Promise<void> {
    await supabase.from('empresa_billing_eventos').update({ lido: true }).eq('id', id);
  },

  // ── Impacto / ESG ───────────────────────────────────
  async getBancosAlimentos(): Promise<BancoAlimentos[]> {
    const { data, error } = await supabase
      .from('bancos_alimentos').select('*').order('nome', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async addBancoAlimentos(nome: string, cnpj: string | null): Promise<BancoAlimentos> {
    const { data, error } = await supabase
      .from('bancos_alimentos').insert([{ nome, cnpj }]).select().single();
    if (error) throw error;
    return data;
  },

  // Preview do kg perdido agregado de um mês (antes de confirmar o repasse)
  async previewKgPerdido(empresaId: string, competencia: string): Promise<{ kg_perdido: number; colaboradores_ativos: number }> {
    const { data, error } = await supabase.rpc('calcular_kg_perdido', {
      p_empresa_id: empresaId,
      p_competencia: competencia,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return { kg_perdido: Number(row?.kg_perdido ?? 0), colaboradores_ativos: Number(row?.colaboradores_ativos ?? 0) };
  },

  // Confirma repasse e emite o certificado (atômico, server-side)
  async confirmarRepasse(empresaId: string, competencia: string, bancoId: string, dataRepasse: string): Promise<CertificadoEsg> {
    const { data, error } = await supabase.rpc('confirmar_repasse_esg', {
      p_empresa_id: empresaId,
      p_competencia: competencia,
      p_banco_id: bancoId,
      p_data_repasse: dataRepasse,
    });
    if (error) throw error;
    return (Array.isArray(data) ? data[0] : data) as CertificadoEsg;
  },

  // Certificados já emitidos (admin vê de todas as empresas)
  async getCertificadosEsg(empresaId?: string): Promise<CertificadoEsg[]> {
    let q = supabase.from('empresa_certificados_esg').select('*').order('competencia', { ascending: false });
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
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

export type RhEmpresa = Pick<Empresa,
  'id' | 'nome' | 'cnpj' | 'responsavel_nome' | 'max_assentos' | 'status' | 'data_inicio'
>;

export type RhComplianceMetricas = {
  empresa_id: string;
  nome: string;
  cnpj: string | null;
  data_inicio: string | null;
  colaboradores_elegiveis: number;
  colaboradores_ativos: number;
  consultas_realizadas: number;
};

export type RhMetricasBemestar = {
  agua_com_dados: number;
  agua_melhoraram: number;
  proteina_com_dados: number;
  proteina_melhoraram: number;
  atividade_com_dados: number;
  atividade_melhoraram: number;
  ativos_total: number;
  ativos_engajados: number;
  dias_em_flow: number;
};

export type RhEvolucaoBemestar = {
  mes: string;
  n_contribuintes: number;
  media_agua: number | null;
  media_proteina: number | null;
  media_minutos: number | null;
};

export type ComplianceDoc = {
  id: string;
  empresa_id: string;
  emitido_em: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  colaboradores_elegiveis: number;
  colaboradores_ativos: number;
  consultas_realizadas: number;
  numero_doc: string;
  created_at: string;
};

// ── Relatório psicossocial WHO-5 (agregado, k-anônimo) ──
export type PsychosocialGeral =
  | { n_respondentes: number; score_medio: number; faixa_reduzido: number; faixa_risco: number; suprimido?: false }
  | { n_respondentes: number; suprimido: true };

export type PsychosocialSetor = {
  setor: string;
  n_respondentes: number;
  score_medio: number;
  faixa_reduzido: number;
  faixa_risco: number;
};

export type RhRelatorioPsicossocial = {
  empresa_id: string;
  empresa_nome: string;
  empresa_cnpj: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  k_min: number;
  geral: PsychosocialGeral;
  setores: PsychosocialSetor[];
  setores_suprimidos: number;
};

// Linha do certificado de disponibilização (sem dados de uso)
export type CertificadoColaborador = {
  colaborador_id: string;
  nome: string;
  setor: string | null;
  funcao: string | null;
  data_adicao: string;
  data_ativacao: string | null;
  status: ColaboradorStatus;
};

export type RhResumoFinanceiro = {
  empresa_id: string;
  nome: string;
  cnpj: string | null;
  cobranca_email: string | null;
  cobranca_responsavel: string | null;
  valor_por_assento: number | null;
  max_assentos: number | null;
  assentos_ocupados: number;
  acesso_bloqueado: boolean;
  max_assentos_agendado: number | null;
  max_assentos_vigencia: string | null;
};

export const rhService = {
  // Empresa do RH logado (sem campos financeiros)
  async getMyEmpresa(): Promise<RhEmpresa | null> {
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
      .select('id, nome, cnpj, responsavel_nome, max_assentos, status, data_inicio')
      .eq('id', rh.empresa_id)
      .single();
    if (error) {
      console.error('[rhService] Falha ao ler empresa do RH:', error.message, '| empresa_id:', rh.empresa_id);
      return null;
    }
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
  async inviteColaborador(email: string, nome?: string, setor?: string, funcao?: string): Promise<{ status: ColaboradorStatus; linked?: boolean; invited?: boolean; existing?: boolean; emailed?: boolean; warning?: string }> {
    const { data, error } = await supabase.functions.invoke('invite-colaborador', {
      body: {
        email,
        nome: nome?.trim() || undefined,
        setor: setor?.trim() || undefined,
        funcao: funcao?.trim() || undefined,
        redirect_to: `${window.location.origin}/acesso`,
      },
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

  // Faturas da própria empresa (RLS garante o escopo)
  async getFaturas(): Promise<EmpresaFatura[]> {
    const { data, error } = await supabase
      .from('empresa_faturas')
      .select('*')
      .order('competencia', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Resumo financeiro da empresa do RH (inclui valor_por_assento via RPC SECURITY DEFINER)
  async getResumoFinanceiro(): Promise<RhResumoFinanceiro | null> {
    const { data, error } = await supabase.rpc('rh_get_resumo_financeiro');
    if (error) { console.error('[rhService] resumo financeiro:', error.message); return null; }
    const row = Array.isArray(data) ? data[0] : data;
    return row ?? null;
  },

  // RH atualiza só os dados de cobrança (e-mail/responsável) da própria empresa
  async updateCobranca(email: string, responsavel: string): Promise<void> {
    const { error } = await supabase.rpc('rh_update_cobranca', {
      p_email: email,
      p_responsavel: responsavel,
    });
    if (error) throw error;
  },

  // RH agenda REDUÇÃO de assentos (vigência no 1º dia do próximo mês). Retorna a data de vigência.
  async agendarAssentos(novo: number): Promise<string> {
    const { data, error } = await supabase.rpc('rh_agendar_assentos', { p_novo: novo });
    if (error) throw error;
    return data as string;
  },

  // ── Compliance NR-1 ─────────────────────────────────
  async getComplianceMetricas(): Promise<RhComplianceMetricas | null> {
    const { data, error } = await supabase.rpc('rh_compliance_metricas');
    if (error) { console.error('[rhService] compliance métricas:', error.message); return null; }
    const row = Array.isArray(data) ? data[0] : data;
    return row ?? null;
  },

  // Indicadores agregados de bem-estar (água, proteína, atividade, engajamento, dias em Flow).
  // Tolerante a erro: a RPC só existe após a migration 20260623.
  async getMetricasBemestar(): Promise<RhMetricasBemestar | null> {
    const { data, error } = await supabase.rpc('rh_metricas_bemestar');
    if (error) { console.error('[rhService] métricas bem-estar:', error.message); return null; }
    const row = Array.isArray(data) ? data[0] : data;
    return row ?? null;
  },

  async getEvolucaoBemestar(): Promise<RhEvolucaoBemestar[]> {
    const { data, error } = await supabase.rpc('rh_evolucao_bemestar');
    if (error) { console.error('[rhService] evolução bem-estar:', error.message); return []; }
    return (data ?? []) as RhEvolucaoBemestar[];
  },

  // Relatório psicossocial WHO-5 agregado e k-anônimo (mín. 5 respondentes
  // por recorte, corte feito no banco). Nunca traz dado individual.
  // Tolerante a erro: a RPC só existe após a migration 20260723.
  async getRelatorioPsicossocial(inicio: string, fim: string): Promise<RhRelatorioPsicossocial | null> {
    const { data, error } = await supabase.rpc('rh_relatorio_psicossocial', {
      p_inicio: inicio,
      p_fim: fim,
    });
    if (error) { console.error('[rhService] relatório psicossocial:', error.message); return null; }
    return (data ?? null) as RhRelatorioPsicossocial | null;
  },

  // Colaboradores para o certificado de disponibilização (nome + data de
  // ativação; NUNCA dados de uso). Tolerante a erro: RPC só existe após a
  // migration 20260723_certificado_disponibilizacao.
  async getCertificadoColaboradores(): Promise<CertificadoColaborador[]> {
    const { data, error } = await supabase.rpc('rh_certificado_colaboradores');
    if (error) { console.error('[rhService] certificado colaboradores:', error.message); return []; }
    return (data ?? []) as CertificadoColaborador[];
  },

  // ── Plano psicológico (upsell) ──────────────────────
  // Resumo dos assentos psi da empresa (plano ativo, contratados, em uso).
  // Tolerante a erro: RPC só existe após 20260723_rh_alocar_psicologo.
  async getResumoPsicologico(): Promise<{ plano_ativo: boolean; max_assentos: number; assentos_em_uso: number } | null> {
    const { data, error } = await supabase.rpc('rh_resumo_psicologico');
    if (error) { console.error('[rhService] resumo psicológico:', error.message); return null; }
    const row = Array.isArray(data) ? data[0] : data;
    return row ?? null;
  },

  // Liga/desliga o acesso psicológico de um colaborador. A RPC valida
  // empresa, plano ativo e limite de assentos.
  async alocarPsicologo(colaboradorId: string, ativar: boolean): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('rh_alocar_psicologo', {
      p_colaborador_id: colaboradorId,
      p_ativar: ativar,
    });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: 'Resposta vazia' }) as { ok: boolean; error?: string };
  },

  async getComplianceDocs(): Promise<ComplianceDoc[]> {
    const { data, error } = await supabase
      .from('empresa_compliance_docs')
      .select('*')
      .order('emitido_em', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async saveComplianceDoc(doc: {
    empresa_id: string;
    periodo_inicio: string | null;
    periodo_fim: string | null;
    colaboradores_elegiveis: number;
    colaboradores_ativos: number;
    consultas_realizadas: number;
    numero_doc: string;
  }): Promise<void> {
    const { error } = await supabase.from('empresa_compliance_docs').insert([doc]);
    if (error) throw error;
  },

  // Existe ≥1 certificado de impacto para a empresa do RH? (controla exibição da aba)
  // Tolerante a erro: a tabela só existe após a migration de ESG.
  async hasCertificados(): Promise<boolean> {
    const { count, error } = await supabase
      .from('empresa_certificados_esg')
      .select('id', { count: 'exact', head: true });
    if (error) return false;
    return (count ?? 0) > 0;
  },

  // Certificados de impacto da própria empresa (RLS garante o escopo)
  async getCertificados(): Promise<CertificadoEsg[]> {
    const { data, error } = await supabase
      .from('empresa_certificados_esg')
      .select('*')
      .order('competencia', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Reenvia e-mail de convite/ativação para colaborador ainda 'convidado'
  async resendInvite(colaboradorId: string): Promise<{ sent: boolean; warning?: string }> {
    const { data, error } = await supabase.functions.invoke('resend-invite', {
      body: { colaborador_id: colaboradorId, redirect_to: `${window.location.origin}/acesso` },
    });
    if (error) {
      let msg = error.message;
      const resp = (error as { context?: Response }).context;
      if (resp && typeof resp.json === 'function') {
        try { const b = await resp.json(); if (b?.error) msg = b.error; } catch { /* mantém */ }
      }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  },
};
