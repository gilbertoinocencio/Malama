// =====================================================
// Malama — Serviço do portal do psicólogo
//
// Regra de ouro deste módulo: o psicólogo NÃO lê tabela de dado do paciente
// diretamente. A migração 20260802 fechou esse acesso, e tudo que ele
// enxerga do paciente passa por RPCs dedicadas — que são o contrato único e
// auditável do escopo da psicologia.
//
// Escreve direto (via RLS) apenas no que é dele: prontuário, anamnese,
// notas interprofissionais e registro de crise.
// =====================================================

import { supabase } from './supabase';

// ── Contexto pré-sessão ──────────────────────────────
export type PsiAlerta = { codigo: string; texto: string };

export type PsiContexto = {
  paciente: { nome: string | null; idade: number | null };
  who5: { mes: string; score: number }[];
  checkins: {
    data: string;
    humor: number | null;
    energia: number | null;
    motivacao: number | null;
    sono_horas: number | null;
    sono_qualidade: number | null;
  }[];
  sono_dispositivo: { data: string; minutos: number }[];
  atividade: { semana: string; minutos: number }[];
  /** Percentual derivado em 90 dias. A série de peso NÃO é exposta. */
  peso_variacao_pct: number | null;
  sessoes: { realizadas?: number; ultima?: string | null; faltas?: number };
  alertas: PsiAlerta[];
};

export type PsiPaciente = {
  patient_id: string;
  nome: string | null;
  sessoes: number;
  ultima_sessao: string | null;
  proxima_sessao: string | null;
  tem_anamnese: boolean;
  who5_ultimo: number | null;
};

export type PsiContatoEmergencia = {
  nome: string | null;
  telefone: string | null;
  relacao: string | null;
};

// ── Anamnese ─────────────────────────────────────────
export type PsiAnamnese = {
  patient_id: string;
  queixa_inicial: string | null;
  diagnosticos_previos: string | null;
  medicacoes_psiquiatricas: string | null;
  psicoterapia_anterior: string | null;
  historico_familiar: string | null;
  uso_substancias: string | null;
  rede_apoio: string | null;
  historico_tentativa: boolean | null;
  historico_tentativa_obs: string | null;
  created_at?: string;
  updated_at?: string;
};

// ── Prontuário (evolução de sessão) ──────────────────
export type PsiEvolucao = {
  id: string;
  consultation_id: string | null;
  psychologist_id: string;
  patient_id: string;
  queixa: string | null;
  evolucao: string | null;
  plano: string | null;
  observacoes: string | null;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
};

// ── Notas interprofissionais ─────────────────────────
export type NotaVisibilidade = 'equipe_clinica' | 'psicologia';

export type NotaEquipe = {
  id: string;
  patient_id: string;
  author_doctor_id: string;
  consultation_id: string | null;
  visibilidade: NotaVisibilidade;
  texto: string;
  created_at: string;
};

// ── SRQ-20 (clínico — nunca vai para o agregado da empresa) ──
export type Srq20Aplicacao = {
  id: string;
  patient_id: string;
  psychologist_id: string;
  consultation_id: string | null;
  answers: Record<string, boolean>;
  score: number;
  item_risco: boolean;
  created_at: string;
};

// ── Crise ────────────────────────────────────────────
export type CriseNivel = 'ideacao' | 'plano' | 'tentativa_recente' | 'outro';

export type CriseEvento = {
  id: string;
  patient_id: string;
  psychologist_id: string;
  consultation_id: string | null;
  nivel: CriseNivel;
  acoes_tomadas: string;
  contato_acionado: boolean;
  encaminhamento: string | null;
  created_at: string;
};

export const psychologyService = {
  // ── Leitura via contrato ───────────────────────────
  async getPacientes(): Promise<PsiPaciente[]> {
    const { data, error } = await supabase.rpc('psi_meus_pacientes');
    if (error) { console.error('[psi] pacientes:', error.message); return []; }
    return (data ?? []) as PsiPaciente[];
  },

  /** Contexto pré-sessão. Devolve null se o psicólogo não atende o paciente. */
  async getContexto(patientId: string): Promise<PsiContexto | null> {
    const { data, error } = await supabase.rpc('psi_contexto_paciente', {
      p_patient_id: patientId,
    });
    if (error) { console.error('[psi] contexto:', error.message); return null; }
    return (data ?? null) as PsiContexto | null;
  },

  /**
   * Contato de emergência. RPC separada de propósito: revelar o contato é
   * ato deliberado do profissional, não dado ambiente na tela.
   */
  async getContatoEmergencia(patientId: string): Promise<PsiContatoEmergencia | null> {
    const { data, error } = await supabase.rpc('psi_contato_emergencia', {
      p_patient_id: patientId,
    });
    if (error) { console.error('[psi] contato de emergência:', error.message); return null; }
    return (data ?? null) as PsiContatoEmergencia | null;
  },

  // ── Anamnese ───────────────────────────────────────
  async getAnamnese(patientId: string): Promise<PsiAnamnese | null> {
    const { data, error } = await supabase
      .from('psychology_intake')
      .select('*')
      .eq('patient_id', patientId)
      .maybeSingle();
    if (error) { console.error('[psi] anamnese:', error.message); return null; }
    return (data ?? null) as PsiAnamnese | null;
  },

  /** Uma anamnese por paciente — qualquer psicólogo que o atenda atualiza. */
  async salvarAnamnese(
    patientId: string,
    doctorId: string,
    dados: Partial<PsiAnamnese>,
  ): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase
      .from('psychology_intake')
      .upsert({
        ...dados,
        patient_id: patientId,
        preenchido_por: doctorId,
        atualizado_por: doctorId,
      }, { onConflict: 'patient_id' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  // ── Prontuário ─────────────────────────────────────
  /** Só devolve as evoluções escritas pelo próprio psicólogo (RLS por autor). */
  async getEvolucoes(patientId: string): Promise<PsiEvolucao[]> {
    const { data, error } = await supabase
      .from('psychology_notes')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) { console.error('[psi] evoluções:', error.message); return []; }
    return (data ?? []) as PsiEvolucao[];
  },

  async salvarEvolucao(
    nota: Partial<PsiEvolucao> & { patient_id: string; psychologist_id: string },
  ): Promise<{ ok: boolean; id?: string; error?: string }> {
    const { data, error } = await supabase
      .from('psychology_notes')
      .upsert(nota)
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  },

  // ── Notas interprofissionais ───────────────────────
  async getNotasEquipe(patientId: string): Promise<NotaEquipe[]> {
    const { data, error } = await supabase
      .from('care_team_notes')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) { console.error('[psi] notas de equipe:', error.message); return []; }
    return (data ?? []) as NotaEquipe[];
  },

  async criarNotaEquipe(
    patientId: string,
    doctorId: string,
    visibilidade: NotaVisibilidade,
    texto: string,
    consultationId?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.from('care_team_notes').insert({
      patient_id: patientId,
      author_doctor_id: doctorId,
      visibilidade,
      texto,
      consultation_id: consultationId ?? null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  // Sem update: nota que outro profissional já usou na conduta não muda de
  // conteúdo depois. Correção é nota nova; o autor pode apagar a errada.
  async excluirNotaEquipe(id: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.from('care_team_notes').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  // ── SRQ-20 ─────────────────────────────────────────
  async getSrq20(patientId: string): Promise<Srq20Aplicacao[]> {
    const { data, error } = await supabase
      .from('psychology_srq20')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) { console.error('[psi] SRQ-20:', error.message); return []; }
    return (data ?? []) as Srq20Aplicacao[];
  },

  /**
   * Grava uma aplicação do SRQ-20. O escore vem calculado por computeSrq20 —
   * determinístico, nunca por IA. Sem update: aplicou errado, aplica de novo.
   */
  async salvarSrq20(a: {
    patient_id: string;
    psychologist_id: string;
    consultation_id: string | null;
    answers: Record<string, boolean>;
    score: number;
    item_risco: boolean;
  }): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.from('psychology_srq20').insert(a);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  // ── Crise ──────────────────────────────────────────
  async getCrises(patientId: string): Promise<CriseEvento[]> {
    const { data, error } = await supabase
      .from('psychology_crisis_events')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) { console.error('[psi] crises:', error.message); return []; }
    return (data ?? []) as CriseEvento[];
  },

  /**
   * Registra a conduta adotada num episódio de risco. O sistema não aciona
   * ninguém — quem decide e aciona é o profissional. Isto é o registro do
   * que ele fez.
   */
  async registrarCrise(
    e: Omit<CriseEvento, 'id' | 'created_at'>,
  ): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.from('psychology_crisis_events').insert(e);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },
};
