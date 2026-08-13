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
  // Plano psicológico — modelo antigo de adicional avulso (migration 20260723).
  // Substituído por modo_mental; mantido para empresas que já usam.
  plano_psicologico?: boolean;
  valor_assento_psi?: number | null;
  max_assentos_psi?: number | null;
  // Modos de contrato (migration 20260727). Definem o que o assento entrega.
  modo_mental?: boolean;
  modo_metabolico?: boolean;
  // Preço por assento de cada modalidade (migration 20260807). A empresa que
  // contrata as duas paga pelas duas. valor_por_assento vira o legado/fallback
  // do metabólico.
  valor_assento_mental?: number | null;
  valor_assento_metabolico?: number | null;
};

export type EmpresaSummary = Empresa & {
  assentos_ativos: number;   // colaboradores ativos + convidados (ocupam assento)
  mrr: number;               // max_assentos × soma dos valores das modalidades
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
  // Chave de junção com os eventos do eSocial, que identificam por CPF
  // (migration 20260814). Dado pessoal, não sensível: resolve o setor no
  // momento da ingestão e nunca é gravado junto do evento de saúde.
  cpf?: string | null;
  whatsapp?: string | null;
  // Plano psicológico adicional: RH alocou este colaborador? Só existe fora
  // do modo Mental, onde o acompanhamento é universal.
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

/**
 * Valor por assento de uma empresa: soma das modalidades contratadas.
 * Espelha a função empresa_valor_assento() do banco (migration 20260807).
 * valor_por_assento é o legado do metabólico e serve de fallback.
 */
export function valorAssentoEmpresa(e: Partial<Empresa>): number {
  let total = 0;
  if (e.modo_metabolico) total += e.valor_assento_metabolico ?? e.valor_por_assento ?? 0;
  if (e.modo_mental) total += e.valor_assento_mental ?? 0;
  // Contrato anterior aos modos: cai no valor legado.
  if (!e.modo_metabolico && !e.modo_mental) total = e.valor_por_assento ?? 0;
  return total;
}

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
  // Quebra por modalidade contratada. Uma empresa com os dois modos conta
  // nos dois — são produtos independentes, não categorias exclusivas.
  empresas_mental: number;
  empresas_metabolico: number;
  mrr_mental: number;
  mrr_metabolico: number;
  assentos_mental: number;
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
        // O valor por assento soma as modalidades contratadas — usar só
        // valor_por_assento zerava o MRR de empresa apenas com modo Mental.
        mrr: (e.max_assentos ?? 0) * valorAssentoEmpresa(e),
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
        .select('id, status, max_assentos, valor_por_assento, valor_assento_mental, valor_assento_metabolico, modo_mental, modo_metabolico, acesso_bloqueado, max_assentos_agendado, created_at'),
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
      // Antes somava só valor_por_assento — empresa só com modo Mental
      // aparecia com MRR zero desde a migração de preço por modalidade.
      mrr_b2b: ativas.reduce((s, e) => s + (e.max_assentos ?? 0) * valorAssentoEmpresa(e), 0),
      empresas_mental: ativas.filter(e => e.modo_mental).length,
      empresas_metabolico: ativas.filter(e => e.modo_metabolico).length,
      mrr_mental: ativas
        .filter(e => e.modo_mental)
        .reduce((s, e) => s + (e.max_assentos ?? 0) * (e.valor_assento_mental ?? 0), 0),
      mrr_metabolico: ativas
        .filter(e => e.modo_metabolico)
        .reduce((s, e) => s + (e.max_assentos ?? 0) * (e.valor_assento_metabolico ?? e.valor_por_assento ?? 0), 0),
      assentos_mental: ativas
        .filter(e => e.modo_mental)
        .reduce((s, e) => s + (e.max_assentos ?? 0), 0),
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
  | 'modo_mental' | 'modo_metabolico'
>;

// Dados cadastrais completos da empresa (migration 20260825). Diferente de
// RhEmpresa: traz e-mail e telefone do responsável, que são os campos que o
// próprio RH pode corrigir. Continua sem valor_por_assento.
export type EmpresaPerfil = RhEmpresa & {
  responsavel_email: string | null;
  responsavel_telefone: string | null;
};

// ── Documentos legais e aceite (migration 20260825) ──
export type DocumentoTipo = 'termos_b2b' | 'tratamento_dados' | 'privacidade';

export type DocumentoLegal = {
  id: string;
  tipo: DocumentoTipo;
  versao: string;
  titulo: string;
  /** Texto puro — a tela renderiza com whitespace-pre-wrap, sem HTML. */
  conteudo: string | null;
  /** Alternativa ao texto: documento que já vive numa página pública. */
  url: string | null;
  exige_aceite: boolean;
  publicado_em: string | null;
  /** Contrato negociado com esta empresa, e não o documento da plataforma. */
  especifico: boolean;
  aceito_em: string | null;
  aceito_por_nome: string | null;
  aceito_por_cargo: string | null;
  /**
   * Como o registro foi feito (migration 20260829):
   * 'automatico' = ciência gravada no acesso ao painel, sem clique;
   * 'explicito'  = alguém declarou nome e cargo e aceitou.
   * A distinção existe porque as duas coisas não valem o mesmo como prova.
   */
  modo: 'automatico' | 'explicito' | null;
};

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

// ── Relatório de exposição ocupacional JSS (agregado, k-anônimo) ──
// Documenta O QUE NO TRABALHO expõe a risco (demanda/controle/apoio),
// separado do WHO-5 porque são evidências de natureza diferente para o
// PGR e raramente compartilham o mesmo período (JSS é semestral).
export type JssGeral =
  | { n_respondentes: number; indice_medio: number; demanda_medio: number; controle_medio: number; apoio_medio: number; suprimido?: false }
  | { n_respondentes: number; suprimido: true };

export type JssSetor = {
  setor: string;
  n_respondentes: number;
  indice: number;
  demanda: number;
  controle: number;
  apoio: number;
  /** Quadrante clássico demanda × controle. Ausente em resultados gerados
   * antes da migration 20260835. */
  classificacao?: JssClassificacao | null;
  /** Média agregada, em 0–100, da contribuição adversa de cada item.
   * Nunca contém respostas individuais e só é publicado quando o setor
   * atinge o piso de anonimato. */
  itens_risco?: Partial<Record<JssItemKey, number>>;
};

export type JssClassificacao =
  | 'alta_exigencia'
  | 'trabalho_ativo'
  | 'trabalho_passivo'
  | 'baixa_exigencia';

export type JssItemKey =
  | 'a' | 'b' | 'c' | 'd' | 'e'
  | 'f' | 'g' | 'h' | 'i' | 'j' | 'k'
  | 'l' | 'm' | 'n' | 'o' | 'p' | 'q';

export type JssCortes = {
  demanda: number;
  controle: number;
  apoio: number;
  referencia: 'mediana_respondentes_periodo';
};

export type RhRelatorioJss = {
  empresa_id: string;
  empresa_nome: string;
  empresa_cnpj: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  k_min: number;
  geral: JssGeral;
  setores: JssSetor[];
  setores_suprimidos: number;
  /** Cortes relativos calculados sobre as respostas individuais do período,
   * sem expor nenhum registro individual. */
  cortes?: JssCortes | null;
};

// ── Motor de campanhas psicossociais (migration 20260728) ──
// Atenção ao que cada tipo carrega:
//   participação (convidados/respondentes/taxa) → não é dado de saúde,
//     aparece sem piso de k, inclusive por setor.
//   escore → só em RhRelatorioPsicossocial, agregado com k >= 5.
export type PsychosocialEixo = 'bemestar' | 'exposicao';

export type PsychosocialInstrumento = {
  code: string;
  nome: string;
  versao: string | null;
  descricao: string | null;
  eixo: PsychosocialEixo;
  cadencia_meses: number | null;
  fonte: string | null;
  licenca: string | null;
  ativo: boolean;
};

export type CampanhaStatus = 'aberta' | 'encerrada' | 'cancelada';

export type PsychosocialCampanha = {
  id: string;
  instrument: string;
  instrument_nome: string;
  eixo: PsychosocialEixo;
  janela_inicio: string;
  janela_fim: string;
  setores: string[] | null;   // null = empresa inteira
  status: CampanhaStatus;
  encerrada_em: string | null;
  created_at: string;
  n_convidados: number;
  n_respondentes: number;
};

export type CampanhaParticipacaoSetor = {
  setor: string;
  convidados: number;
  respondentes: number;
  taxa: number;               // 0–100
  /** Linha "Demais setores": junção dos setores pequenos demais para sair
   *  detalhados. Ver `CampanhaParticipacao.min_coorte`. */
  agrupado: boolean;
};

export type CampanhaParticipacao = {
  campaign_id: string;
  // Total da empresa — sem piso, de propósito: é o agregado contratado, e o
  // roster inteiro já é conhecido do RH.
  convidados: number;
  respondentes: number;
  taxa: number;
  setores: CampanhaParticipacaoSetor[];
  /** Piso de coorte aplicado no detalhamento por setor (k). */
  min_coorte: number;
  // Quantos setores/pessoas ficaram fora do detalhamento por coorte pequena.
  // A UI usa para explicar a diferença entre o total e a soma das linhas.
  ocultos_setores: number;
  ocultos_convidados: number;
};

/** Um link de campanha, válido para um SETOR inteiro. Ninguém se identifica
 *  ao responder — ver `rhService.getCampanhaLinks`. */
export type CampanhaLink = {
  setor: string;
  token: string;
  /** Quantas pessoas aquele link precisa alcançar. */
  colaboradores: number;
};

export type CampanhaLinks = {
  ok: boolean;
  error?: string;
  janela_fim: string;
  links: CampanhaLink[];
};

export type SetorEmpresa = {
  setor: string;
  /** Colaboradores com assento Malama neste setor. */
  n: number;
  /**
   * Efetivo declarado pelo RH (migration 20260832). NULL = não informado.
   * É este o tamanho real do setor: quem define alcance de campanha e
   * denominador de adesão, porque quem não tem app responde pelo link.
   */
  efetivo: number | null;
};

// ── Registro de setores da empresa (migration 20260824) ──
// O setor deixou de nascer da digitação no cadastro do colaborador: a
// empresa registra seus setores primeiro e o cadastro só escolhe da lista.
export type SetorAdmin = {
  id: string;
  nome: string;
  ativo: boolean;
  /** Colaboradores ativos/convidados hoje neste setor (derivado). */
  n: number;
  /** Já aparece em afastamento, ambulatório, plano ou campanha — só arquiva. */
  em_uso: boolean;
  /**
   * Total de pessoas do setor na empresa, declarado pelo RH (migration
   * 20260832). NULL = não informado, que é diferente de zero. Não confundir
   * com `n`: este inclui quem nunca abriu o app.
   */
  efetivo: number | null;
};

export type SetorMutacao = {
  ok: boolean;
  error?: string;
  id?: string;
  /** Criar um nome arquivado reativa a linha existente em vez de duplicar. */
  reativado?: boolean;
  /** Renomear para um nome que já existe: a tela pergunta antes de unir. */
  fusao_possivel?: boolean;
  destino?: string;
  fundido?: boolean;
  nome?: string;
  ativo?: boolean;
  efetivo?: number | null;
};

// ── Matriz de risco psicossocial por setor (migration 20260730) ──
// Cruza exposição ocupacional (JSS) com bem-estar (WHO-5).
export type MatrizQuadrante =
  | 'risco_ocupacional'  // alta exposição + baixo bem-estar → agir na fonte
  | 'fator_externo'      // baixa exposição + baixo bem-estar → cuidado individual
  | 'risco_latente'      // alta exposição + bem-estar ainda ok → agir antes de adoecer
  | 'estavel';

export type MatrizEixoBemestar = {
  n_respondentes: number;
  score_medio: number;
  faixa_reduzido: number;
  faixa_risco: number;
};

export type MatrizEixoExposicao = {
  n_respondentes: number;
  indice: number;    // 0–100, maior = mais exposição
  demanda: number;
  controle: number;
  apoio: number;
};

export type MatrizSetor = {
  setor: string;
  // null = recorte suprimido por não atingir o piso de respondentes
  bemestar: MatrizEixoBemestar | null;
  exposicao: MatrizEixoExposicao | null;
  quadrante: MatrizQuadrante | null;
};

export type RhMatrizPsicossocial = {
  empresa_id: string;
  empresa_nome: string;
  empresa_cnpj: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  k_min: number;
  min_setores: number;
  setores_comparaveis: number;
  // Cortes da classificação — medianas da própria empresa. null quando não
  // há setores comparáveis suficientes para a mediana significar algo.
  mediana_exposicao: number | null;
  mediana_bemestar: number | null;
  setores: MatrizSetor[];
  setores_suprimidos: number;
};

// ── Absenteísmo e ambulatório (migration 20260731) ──
// Registros NÃO apontam para pessoa: só setor, capítulo de CID e dias.
export type AbsenteismoGrupo = {
  grupo: string;      // letra do capítulo do CID-10
  episodios: number;
  dias: number;
};

export type AbsenteismoSetor = {
  setor: string;
  colaboradores: number;
  episodios: number;
  dias: number;
  dias_f: number;         // dias por transtorno mental (capítulo F)
  episodios_f: number;
  dias_por_colaborador: number;
};

export type RhAbsenteismo = {
  periodo_inicio: string;
  periodo_fim: string;
  k_min: number;
  total_episodios: number;
  total_dias: number;
  grupos: AbsenteismoGrupo[];
  setores: AbsenteismoSetor[];
  setores_suprimidos: number;
};

// Lançamentos individuais — existem só para o RH conferir e desfazer o que
// digitou errado. Não têm identificação de colaborador (ver migration).
// Correção é apagar e relançar: a tabela não tem policy de UPDATE, porque
// registro que vira evidência de PGR não deve ser editável em silêncio.
export type AfastamentoLancamento = {
  id: string;
  setor: string | null;
  cid_grupo: string;
  dias: number;
  data_inicio: string;
  created_at: string;
};

export type AmbulatorioLancamento = {
  id: string;
  setor: string | null;
  categoria: string;
  data: string;
  created_at: string;
};

export type AmbulatorioCategoria = { categoria: string; atendimentos: number };

export type AmbulatorioSetor = {
  setor: string;
  colaboradores: number;
  atendimentos: number;
  ansiedade: number;
  por_colaborador: number;
};

// ── Plano de ação (migration 20260801) ──
export type PlanoOrigem = 'matriz' | 'absenteismo' | 'ambulatorio' | 'campanha' | 'manual';
export type PlanoFator =
  'demanda' | 'controle' | 'apoio' | 'assedio' | 'jornada' | 'reconhecimento' | 'outro';
// Hierarquia de controle da NR-1: agir na fonte vem primeiro, cuidado
// individual por último — e sozinho não encerra risco de fonte.
export type PlanoNivel = 'fonte' | 'organizacional' | 'individual';
export type PlanoStatus = 'planejada' | 'em_andamento' | 'concluida' | 'cancelada';

export type PlanoAcao = {
  id: string;
  setor: string | null;
  origem: PlanoOrigem;
  fator: PlanoFator;
  risco_descricao: string;
  medida: string;
  nivel_controle: PlanoNivel;
  responsavel: string;
  prazo: string;
  status: PlanoStatus;
  evidencia: string | null;
  concluida_em: string | null;
  atrasada: boolean;
  created_at: string;
};

export type RhPlanosResumo = {
  total: number;
  abertas: number;
  concluidas: number;
  atrasadas: number;
  /** Setores em risco ocupacional sem medida de fonte ou organizacional. */
  setores_sem_acao_na_fonte: string[];
};

export type RhAmbulatorio = {
  periodo_inicio: string;
  periodo_fim: string;
  k_min: number;
  total: number;
  categorias: AmbulatorioCategoria[];
  setores: AmbulatorioSetor[];
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
      .select('id, nome, cnpj, responsavel_nome, max_assentos, status, data_inicio, modo_mental, modo_metabolico')
      .eq('id', rh.empresa_id)
      .single();
    if (error) {
      console.error('[rhService] Falha ao ler empresa do RH:', error.message, '| empresa_id:', rh.empresa_id);
      return null;
    }
    return empresa;
  },

  // ── Área da empresa: cadastro e documentos (migration 20260825) ──

  /** Cadastro completo, incluindo o contato do responsável. */
  async getEmpresaPerfil(): Promise<EmpresaPerfil | null> {
    const { data, error } = await supabase.rpc('rh_empresa_perfil');
    if (error) { console.error('[rhService] perfil da empresa:', error.message); return null; }
    return (data ?? null) as EmpresaPerfil | null;
  },

  /**
   * Só o contato do responsável. Nome, CNPJ, assentos, status e data de
   * início são termos comerciais — a RPC ignora qualquer tentativa de mexer
   * neles, e `empresas` não tem policy de UPDATE para o RH.
   */
  async atualizarContato(
    nome: string, email: string, telefone: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('rh_atualizar_contato', {
      p_nome: nome, p_email: email, p_telefone: telefone,
    });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: 'Resposta vazia' }) as { ok: boolean; error?: string };
  },

  /**
   * E-mail com que o RH entra no painel. Não é o mesmo campo do contato do
   * responsável: o login é criado pelo admin da Malama e pode ficar em nome de
   * outra pessoa. Mostrar os dois lado a lado evita a troca de senha na conta
   * errada.
   */
  async getEmailDeAcesso(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email ?? null;
  },

  /**
   * Troca a senha de acesso ao painel. Pede a senha atual de propósito:
   * `updateUser` sozinho deixaria qualquer sessão esquecida aberta tomar a
   * conta. Como o e-mail é o mesmo usuário já logado, o signInWithPassword
   * apenas revalida a credencial e renova a sessão — não abre uma segunda.
   */
  async alterarSenha(
    senhaAtual: string, novaSenha: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user.email, password: senhaAtual,
    });
    if (authErr) return { ok: false, error: 'Senha atual incorreta.' };

    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  /**
   * Registra ciência automática dos documentos vigentes (migration 20260829).
   * Chamada a cada carga do portal: na prática só escreve na primeira vez de
   * cada versão publicada, e não faz nada nas demais.
   */
  async registrarCiencia(): Promise<void> {
    const { error } = await supabase.rpc('rh_registrar_ciencia');
    if (error) console.error('[rhService] ciência de documentos:', error.message);
  },

  /** Documentos vigentes aplicáveis à empresa, com o aceite quando houver. */
  async getDocumentos(): Promise<DocumentoLegal[]> {
    const { data, error } = await supabase.rpc('rh_documentos');
    if (error) { console.error('[rhService] documentos:', error.message); return []; }
    return (data ?? []) as DocumentoLegal[];
  },

  async aceitarDocumento(
    documentoId: string, nome: string, cargo: string,
  ): Promise<{ ok: boolean; error?: string; ja_aceito?: boolean }> {
    const { data, error } = await supabase.rpc('rh_aceitar_documento', {
      p_documento_id: documentoId, p_nome: nome, p_cargo: cargo,
    });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: 'Resposta vazia' }) as { ok: boolean; error?: string; ja_aceito?: boolean };
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
  async inviteColaborador(email: string, nome?: string, setor?: string, funcao?: string, cpf?: string, whatsapp?: string): Promise<{ status: ColaboradorStatus; linked?: boolean; invited?: boolean; existing?: boolean; emailed?: boolean; warning?: string }> {
    const { data, error } = await supabase.functions.invoke('invite-colaborador', {
      body: {
        email,
        nome: nome?.trim() || undefined,
        setor: setor?.trim() || undefined,
        funcao: funcao?.trim() || undefined,
        cpf: cpf?.replace(/\D/g, '') || undefined,
        whatsapp: whatsapp?.trim() || undefined,
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

  // Relatório de exposição ocupacional JSS agregado e k-anônimo (mesmo piso
  // e mesmo padrão de rh_relatorio_psicossocial, eixo diferente). Tolerante
  // a erro: a RPC só existe após a migration 20260803_rh_relatorio_jss.
  async getRelatorioJss(inicio: string, fim: string): Promise<RhRelatorioJss | null> {
    const { data, error } = await supabase.rpc('rh_relatorio_jss', {
      p_inicio: inicio,
      p_fim: fim,
    });
    if (error) { console.error('[rhService] relatório JSS:', error.message); return null; }
    return (data ?? null) as RhRelatorioJss | null;
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

  // ── Campanhas psicossociais ──────────────────────────
  // Instrumentos do catálogo. Só os com ativo=true podem virar campanha:
  // instrumento validado sem redação conferida gera escore inválido.
  async getInstrumentos(): Promise<PsychosocialInstrumento[]> {
    const { data, error } = await supabase
      .from('psychosocial_instruments')
      .select('*')
      .order('eixo')
      .order('nome');
    if (error) { console.error('[rhService] instrumentos:', error.message); return []; }
    return (data ?? []) as PsychosocialInstrumento[];
  },

  async getCampanhas(): Promise<PsychosocialCampanha[]> {
    const { data, error } = await supabase.rpc('rh_listar_campanhas');
    if (error) { console.error('[rhService] campanhas:', error.message); return []; }
    return (data ?? []) as PsychosocialCampanha[];
  },

  async criarCampanha(
    instrument: string,
    janelaInicio: string,
    janelaFim: string,
    setores: string[] | null,
  ): Promise<{ ok: boolean; campaign_id?: string; error?: string }> {
    const { data, error } = await supabase.rpc('rh_criar_campanha', {
      p_instrument: instrument,
      p_janela_inicio: janelaInicio,
      p_janela_fim: janelaFim,
      p_setores: setores && setores.length > 0 ? setores : null,
    });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: 'Resposta vazia' }) as { ok: boolean; campaign_id?: string; error?: string };
  },

  async encerrarCampanha(campaignId: string, cancelar = false): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('rh_encerrar_campanha', {
      p_campaign_id: campaignId,
      p_cancelar: cancelar,
    });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: 'Resposta vazia' }) as { ok: boolean; error?: string };
  },

  async getCampanhaParticipacao(campaignId: string): Promise<CampanhaParticipacao | null> {
    const { data, error } = await supabase.rpc('rh_campanha_participacao', { p_campaign_id: campaignId });
    if (error) { console.error('[rhService] participação:', error.message); return null; }
    return (data ?? null) as CampanhaParticipacao | null;
  },

  /**
   * Emite (idempotente) e devolve UM link por setor da campanha, para o RH
   * distribuir por WhatsApp, e-mail interno ou cartaz com QR.
   *
   * Um link por setor, e não por pessoa: empresa de mil colaboradores geraria
   * mil links, e o RH ficaria com o link de cada um — o que derruba a
   * confiança na pesquisa mesmo que ninguém abuse. Aqui ninguém se
   * identifica; o setor vem embutido no link e é o único recorte gravado.
   */
  async getCampanhaLinks(campaignId: string): Promise<CampanhaLinks | null> {
    const { data, error } = await supabase.rpc('rh_campanha_links_setor', {
      p_campaign_id: campaignId,
    });
    if (error) { console.error('[rhService] links:', error.message); return null; }
    return (data ?? null) as CampanhaLinks | null;
  },

  /**
   * Setores disponíveis para seleção (registro + contagem de pessoas).
   * Depois da migration 20260824 a lista vem do REGISTRO da empresa, então
   * um setor recém-criado aparece com n = 0 — é o que permite planejar
   * ação para um setor antes de haver alguém nele.
   */
  async getSetores(): Promise<SetorEmpresa[]> {
    const { data, error } = await supabase.rpc('rh_setores');
    if (error) { console.error('[rhService] setores:', error.message); return []; }
    return (data ?? []) as SetorEmpresa[];
  },

  // ── Gestão do registro de setores (migration 20260824) ──
  // Escrita só por RPC: o texto do setor é chave de junção de matriz,
  // absenteísmo, JSS, plano de ação e campanhas, então renomear precisa
  // acontecer nas 7 tabelas de uma vez, no servidor.

  async getSetoresAdmin(): Promise<SetorAdmin[]> {
    const { data, error } = await supabase.rpc('rh_setores_admin');
    if (error) { console.error('[rhService] setores admin:', error.message); return []; }
    return (data ?? []) as SetorAdmin[];
  },

  async criarSetor(nome: string): Promise<SetorMutacao> {
    const { data, error } = await supabase.rpc('rh_setor_criar', { p_nome: nome });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: 'Resposta vazia' }) as SetorMutacao;
  },

  /**
   * Renomeia e propaga o texto. Se o nome de destino já existir, a primeira
   * chamada volta com `fusao_possivel` em vez de agir — a tela confirma com
   * o RH antes de unir duas coortes (e de invalidar links já divulgados).
   */
  async renomearSetor(id: string, nome: string, permitirFusao = false): Promise<SetorMutacao> {
    const { data, error } = await supabase.rpc('rh_setor_renomear', {
      p_id: id, p_nome: nome, p_permitir_fusao: permitirFusao,
    });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: 'Resposta vazia' }) as SetorMutacao;
  },

  /**
   * Efetivo declarado do setor (migration 20260832). `null` limpa o campo —
   * "não informado" não é a mesma coisa que "zero pessoas".
   */
  async definirEfetivoSetor(id: string, efetivo: number | null): Promise<SetorMutacao> {
    const { data, error } = await supabase.rpc('rh_setor_definir_efetivo', {
      p_id: id, p_efetivo: efetivo,
    });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: 'Resposta vazia' }) as SetorMutacao;
  },

  async arquivarSetor(id: string, ativo: boolean): Promise<SetorMutacao> {
    const { data, error } = await supabase.rpc('rh_setor_arquivar', { p_id: id, p_ativo: ativo });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: 'Resposta vazia' }) as SetorMutacao;
  },

  /**
   * Reclassifica o setor de um colaborador já cadastrado (migration 20260831).
   * Passar string vazia tira do setor. O servidor só aceita nome do registro
   * e grava a grafia canônica dele.
   */
  async definirSetorColaborador(
    colaboradorId: string, setor: string,
  ): Promise<{ ok: boolean; error?: string; setor?: string | null }> {
    const { data, error } = await supabase.rpc('rh_definir_setor_colaborador', {
      p_colaborador_id: colaboradorId, p_setor: setor,
    });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: 'Resposta vazia' }) as { ok: boolean; error?: string; setor?: string | null };
  },

  async excluirSetor(id: string): Promise<SetorMutacao> {
    const { data, error } = await supabase.rpc('rh_setor_excluir', { p_id: id });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: 'Resposta vazia' }) as SetorMutacao;
  },

  /**
   * Colaboradores ativos/convidados da empresa — o público-alvo real de uma
   * campanha "toda a empresa".
   *
   * Não dá para somar `getSetores()` para chegar neste número: aquela função
   * só devolve quem tem SETOR PREENCHIDO, então numa empresa que ainda não
   * classificou o quadro o total sai muito menor do que é.
   */
  async getAlvoTotal(): Promise<number> {
    const { data, error } = await supabase.rpc('rh_alvo_total');
    if (error) { console.error('[rhService] alvo total:', error.message); return 0; }
    return (data ?? 0) as number;
  },

  // Matriz exposição × bem-estar por setor. Escores já vêm agregados e
  // k-anonimizados pelo banco.
  async getMatrizPsicossocial(inicio: string, fim: string): Promise<RhMatrizPsicossocial | null> {
    const { data, error } = await supabase.rpc('rh_matriz_psicossocial', {
      p_inicio: inicio, p_fim: fim,
    });
    if (error) { console.error('[rhService] matriz psicossocial:', error.message); return null; }
    return (data ?? null) as RhMatrizPsicossocial | null;
  },

  // ── Absenteísmo e ambulatório ────────────────────────
  async lancarAfastamento(
    setor: string, cidGrupo: string, dias: number, dataInicio: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('rh_lancar_afastamento', {
      p_setor: setor, p_cid_grupo: cidGrupo, p_dias: dias, p_data_inicio: dataInicio,
    });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: 'Resposta vazia' }) as { ok: boolean; error?: string };
  },

  async lancarAmbulatorio(
    setor: string, categoria: string, data_: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('rh_lancar_ambulatorio', {
      p_setor: setor, p_categoria: categoria, p_data: data_,
    });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: 'Resposta vazia' }) as { ok: boolean; error?: string };
  },

  async getAbsenteismo(inicio: string, fim: string): Promise<RhAbsenteismo | null> {
    const { data, error } = await supabase.rpc('rh_absenteismo_resumo', {
      p_inicio: inicio, p_fim: fim,
    });
    if (error) { console.error('[rhService] absenteísmo:', error.message); return null; }
    return (data ?? null) as RhAbsenteismo | null;
  },

  async getAmbulatorio(inicio: string, fim: string): Promise<RhAmbulatorio | null> {
    const { data, error } = await supabase.rpc('rh_ambulatorio_resumo', {
      p_inicio: inicio, p_fim: fim,
    });
    if (error) { console.error('[rhService] ambulatório:', error.message); return null; }
    return (data ?? null) as RhAmbulatorio | null;
  },

  // Lançamentos individuais para conferência e exclusão. RLS já limita à
  // empresa do RH — não precisa (nem deve) filtrar empresa_id no cliente.
  async getLancamentosAfastamento(inicio: string, fim: string): Promise<AfastamentoLancamento[]> {
    const { data, error } = await supabase
      .from('empresa_afastamentos')
      .select('id, setor, cid_grupo, dias, data_inicio, created_at')
      .gte('data_inicio', inicio)
      .lte('data_inicio', fim)
      .order('data_inicio', { ascending: false })
      .limit(200);
    if (error) { console.error('[rhService] lançamentos de afastamento:', error.message); return []; }
    return (data ?? []) as AfastamentoLancamento[];
  },

  async excluirAfastamento(id: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.from('empresa_afastamentos').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  async getLancamentosAmbulatorio(inicio: string, fim: string): Promise<AmbulatorioLancamento[]> {
    const { data, error } = await supabase
      .from('empresa_ambulatorio')
      .select('id, setor, categoria, data, created_at')
      .gte('data', inicio)
      .lte('data', fim)
      .order('data', { ascending: false })
      .limit(200);
    if (error) { console.error('[rhService] lançamentos de ambulatório:', error.message); return []; }
    return (data ?? []) as AmbulatorioLancamento[];
  },

  async excluirAmbulatorio(id: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.from('empresa_ambulatorio').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  // ── Plano de ação ────────────────────────────────────
  async getPlanosAcao(): Promise<PlanoAcao[]> {
    const { data, error } = await supabase.rpc('rh_listar_planos_acao');
    if (error) { console.error('[rhService] planos de ação:', error.message); return []; }
    return (data ?? []) as PlanoAcao[];
  },

  async getPlanosResumo(inicio: string, fim: string): Promise<RhPlanosResumo | null> {
    const { data, error } = await supabase.rpc('rh_planos_acao_resumo', {
      p_inicio: inicio, p_fim: fim,
    });
    if (error) { console.error('[rhService] resumo de planos:', error.message); return null; }
    return (data ?? null) as RhPlanosResumo | null;
  },

  async criarPlanoAcao(p: {
    setor: string; origem: PlanoOrigem; fator: PlanoFator;
    risco_descricao: string; medida: string; nivel_controle: PlanoNivel;
    responsavel: string; prazo: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('rh_criar_plano_acao', {
      p_setor: p.setor,
      p_origem: p.origem,
      p_fator: p.fator,
      p_risco_descricao: p.risco_descricao,
      p_medida: p.medida,
      p_nivel_controle: p.nivel_controle,
      p_responsavel: p.responsavel,
      p_prazo: p.prazo,
    });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: 'Resposta vazia' }) as { ok: boolean; error?: string };
  },

  // Concluir exige evidência — validado no banco, não só na tela.
  async atualizarPlanoAcao(
    id: string, status: PlanoStatus, evidencia?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('rh_atualizar_plano_acao', {
      p_id: id, p_status: status, p_evidencia: evidencia ?? null,
    });
    if (error) return { ok: false, error: error.message };
    return (data ?? { ok: false, error: 'Resposta vazia' }) as { ok: boolean; error?: string };
  },

  async excluirPlanoAcao(id: string): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('rh_excluir_plano_acao', { p_id: id });
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
      body: { colaborador_id: colaboradorId },
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
