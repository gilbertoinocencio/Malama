import { supabase } from './supabase';

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

export const WHO5_INTRO =
  'Nas últimas duas semanas, com que frequência você se sentiu assim?';

export const WHO5_QUESTIONS: readonly string[] = [
  'Eu me senti alegre e de bom humor',
  'Eu me senti calmo(a) e relaxado(a)',
  'Eu me senti ativo(a) e com energia',
  'Acordei me sentindo revigorado(a) e descansado(a)',
  'Meu dia a dia tem sido preenchido com coisas que me interessam',
] as const;

// Valor do item = índice na escala oficial (0 = pior, 5 = melhor)
export const WHO5_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 5, label: 'O tempo todo' },
  { value: 4, label: 'A maior parte do tempo' },
  { value: 3, label: 'Mais da metade do tempo' },
  { value: 2, label: 'Menos da metade do tempo' },
  { value: 1, label: 'Algumas vezes' },
  { value: 0, label: 'Em nenhum momento' },
] as const;

export interface Who5Result {
  rawScore: number; // 0–25
  score: number;    // 0–100
}

export interface PsychosocialAssessment {
  id: string;
  user_id: string;
  instrument: 'who5';
  reference_month: string; // 'YYYY-MM-01'
  answers: Record<string, number>;
  raw_score: number;
  score: number;
  created_at: string;
}

/** Primeiro dia do mês corrente, no fuso local: 'YYYY-MM-01'. */
export function getCurrentReferenceMonth(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/** Escore WHO-5 determinístico a partir das 5 respostas (0–5 cada). */
export function computeWho5Score(answers: number[]): Who5Result {
  if (answers.length !== WHO5_QUESTIONS.length) {
    throw new Error('WHO-5 exige exatamente 5 respostas');
  }
  if (answers.some(a => !Number.isInteger(a) || a < 0 || a > 5)) {
    throw new Error('Resposta WHO-5 fora da escala 0–5');
  }
  const rawScore = answers.reduce((s, a) => s + a, 0);
  return { rawScore, score: rawScore * 4 };
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
};
