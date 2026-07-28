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

// Adiamento por CAMPANHA (não mais por mês). O piso é a janela definida pelo
// RH; o snooze só evita reabrir o modal a cada vez que o app abre.
const ADIAR_DIAS = 3;
const adiarKey = (campaignId: string) => `campanha-adiada:${campaignId}`;

export const PsychosocialService = {
  // ── Campanhas (motor genérico) ───────────────────────

  /** Adia o modal desta campanha. A janela do RH continua valendo. */
  adiarCampanha(campaignId: string): void {
    const ate = new Date();
    ate.setDate(ate.getDate() + ADIAR_DIAS);
    localStorage.setItem(adiarKey(campaignId), ate.toISOString());
  },

  /**
   * Primeira campanha pendente que ainda não foi adiada — é a que o app abre
   * sozinho. A LISTA continua mostrando todas: adiar silencia o modal, não
   * esconde o questionário.
   */
  async proximaCampanhaParaAbrir(): Promise<CampanhaPendente | null> {
    const pendentes = await this.getCampanhasPendentes();
    const agora = Date.now();
    return pendentes.find(c => {
      const ate = localStorage.getItem(adiarKey(c.campaign_id));
      return !ate || new Date(ate).getTime() <= agora;
    }) ?? null;
  },

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
