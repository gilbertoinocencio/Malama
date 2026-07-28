import { supabase } from './supabase';
import { WHO5, getInstrumento } from './psychosocialInstruments';

// =====================================================
// Módulo psicossocial (NR-1/PGR) — WHO-5 Índice de Bem-Estar
//
// O WHO-5 é instrumento validado de domínio público (OMS, 1998;
// versão brasileira validada). A redação das perguntas e das opções
// é FIXA — alterar o texto invalida o instrumento e derruba o valor
// jurídico do relatório agregado. Não reescrever, não "melhorar".
//
// Escore: cada item 0–5; bruto = soma (0–25); percentual = bruto × 4
// (0–100). Calculado aqui de forma determinística — nunca por IA.
// Score < 50 indica bem-estar reduzido; ≤ 28 sugere rastreio
// aprofundado (referências do manual do instrumento).
// =====================================================

// A redação, as opções e a chave de correção do WHO-5 vivem no registro de
// instrumentos (fonte única, junto com os demais). Re-exportadas aqui para
// não quebrar quem já importa deste módulo.
export {
  WHO5_INTRO, WHO5_QUESTIONS, WHO5_OPTIONS,
} from './psychosocialInstruments';

export interface Who5Result {
  rawScore: number; // 0–25
  score: number;    // 0–100
}

export interface PsychosocialAssessment {
  id: string;
  user_id: string;
  instrument: string;
  campaign_id: string | null;
  reference_month: string | null; // 'YYYY-MM-01' (só instrumentos mensais)
  answers: Record<string, number>;
  raw_score: number;
  score: number;
  subscores: Record<string, number> | null;
  created_at: string;
}

/** Campanha aberta e ainda não respondida pelo usuário. */
export interface CampanhaPendente {
  campaign_id: string;
  instrument: string;
  instrument_nome: string;
  janela_inicio: string;
  janela_fim: string;
  empresa_nome: string;
}

/** Primeiro dia do mês corrente, no fuso local: 'YYYY-MM-01'. */
export function getCurrentReferenceMonth(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/** Escore WHO-5 determinístico a partir das 5 respostas (0–5 cada). */
export function computeWho5Score(answers: number[]): Who5Result {
  if (answers.length !== WHO5.blocks[0].items.length) {
    throw new Error('WHO-5 exige exatamente 5 respostas');
  }
  const porChave: Record<string, number> = {};
  answers.forEach((a, i) => { porChave[`q${i + 1}`] = a; });
  const { rawScore, score } = WHO5.score(porChave);
  return { rawScore, score };
}

const snoozeKey = (userId: string, referenceMonth: string) =>
  `who5-snooze:${userId}:${referenceMonth.slice(0, 7)}`;

export const PsychosocialService = {
  /** Resposta do mês corrente, se existir. */
  async getCurrentMonthAssessment(userId: string): Promise<PsychosocialAssessment | null> {
    const { data, error } = await supabase
      .from('psychosocial_assessments')
      .select('*')
      .eq('user_id', userId)
      .eq('instrument', 'who5')
      .eq('reference_month', getCurrentReferenceMonth())
      .maybeSingle();
    if (error) {
      console.error('getCurrentMonthAssessment:', error);
      return null;
    }
    return data as PsychosocialAssessment | null;
  },

  /**
   * Decide se o modal WHO-5 deve abrir agora.
   * Cadência acordada: pergunta desde o início do mês; se o usuário
   * pular, volta a insistir a cada 7 dias até responder. Snooze fica
   * em localStorage com chave por mês — mês novo zera a insistência.
   * Fail closed: em erro de rede/consulta, não abre (não incomoda).
   */
  async shouldPromptWho5(userId: string): Promise<boolean> {
    const referenceMonth = getCurrentReferenceMonth();
    const key = snoozeKey(userId, referenceMonth);

    const snoozedUntil = localStorage.getItem(key);
    if (snoozedUntil === 'done') return false;
    if (snoozedUntil && new Date(snoozedUntil) > new Date()) return false;

    try {
      const existing = await this.getCurrentMonthAssessment(userId);
      if (existing) {
        localStorage.setItem(key, 'done');
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  /** Usuário pulou o modal: silencia por 7 dias dentro do mês corrente. */
  snoozeWho5(userId: string): void {
    const until = new Date();
    until.setDate(until.getDate() + 7);
    localStorage.setItem(snoozeKey(userId, getCurrentReferenceMonth()), until.toISOString());
  },

  /** Grava a resposta do mês (imutável — sem update por design). */
  async submitWho5(userId: string, answers: number[]): Promise<PsychosocialAssessment> {
    const { rawScore, score } = computeWho5Score(answers);
    const referenceMonth = getCurrentReferenceMonth();

    const answersJson: Record<string, number> = {};
    answers.forEach((a, i) => { answersJson[`q${i + 1}`] = a; });

    const { data, error } = await supabase
      .from('psychosocial_assessments')
      .insert([{
        user_id: userId,
        instrument: 'who5',
        reference_month: referenceMonth,
        answers: answersJson,
        raw_score: rawScore,
        score,
      }])
      .select()
      .single();

    if (error) {
      // 23505 = já respondeu este mês (corrida entre devices) — trata como sucesso lógico
      if ((error as { code?: string }).code === '23505') {
        localStorage.setItem(snoozeKey(userId, referenceMonth), 'done');
        const existing = await this.getCurrentMonthAssessment(userId);
        if (existing) return existing;
      }
      throw error;
    }

    localStorage.setItem(snoozeKey(userId, referenceMonth), 'done');
    return data as PsychosocialAssessment;
  },

  // ── Campanhas (motor genérico) ───────────────────────

  /** Campanhas abertas dirigidas a este usuário e ainda não respondidas. */
  async getCampanhasPendentes(): Promise<CampanhaPendente[]> {
    const { data, error } = await supabase.rpc('minhas_campanhas_pendentes');
    if (error) {
      console.error('getCampanhasPendentes:', error.message);
      return [];
    }
    return (data ?? []) as CampanhaPendente[];
  },

  /**
   * Grava a resposta de uma campanha, para qualquer instrumento do registro.
   * O escore é calculado aqui, de forma determinística, a partir da chave de
   * correção do instrumento — nunca por IA e nunca no cliente sem validação:
   * o banco ainda checa empresa, janela, status e público-alvo via trigger.
   *
   * `answers` usa as chaves declaradas no instrumento ('q1'..'q5' no WHO-5,
   * 'a'..'q' na JSS) com o valor ORIGINAL da opção escolhida — é o que
   * mantém a resposta auditável contra o instrumento publicado.
   */
  async submitCampanha(
    userId: string,
    campaignId: string,
    instrumentCode: string,
    answers: Record<string, number>,
  ): Promise<PsychosocialAssessment> {
    const def = getInstrumento(instrumentCode);
    const { rawScore, score, subscores } = def.score(answers);

    const { data, error } = await supabase
      .from('psychosocial_assessments')
      .insert([{
        user_id: userId,
        campaign_id: campaignId,
        instrument: def.code,
        // Instrumento mensal mantém o mês de referência; os demais gravam
        // NULL e são chaveados pela campanha.
        reference_month: def.cadenciaMeses === 1 ? getCurrentReferenceMonth() : null,
        answers,
        raw_score: rawScore,
        score,
        subscores,
      }])
      .select()
      .single();

    if (error) throw error;
    return data as PsychosocialAssessment;
  },
};
