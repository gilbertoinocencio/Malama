import { supabase } from './supabase';
import { getLocalDateString } from '../utils/dateUtils';

/**
 * Ponto ÚNICO de escrita da hidratação.
 *
 * Existia só um caminho para a água (o interceptor de texto do chat), então a foto
 * de um copo d'água caía no analisador de refeição e a ingestão nunca chegava em
 * `daily_logs.water_intake`. Toda origem nova (foto, widget, atalho) deve entrar
 * por aqui — assim dedupe, missão de hidratação e limite por registro ficam iguais
 * para todo mundo.
 */

/** De onde veio o registro. Faz parte da chave de dedupe. */
export type WaterLogSource = 'chat' | 'photo';

export interface WaterLogResult {
  /** false = nada foi gravado (duplicata dentro da janela). */
  logged: boolean;
  /** ml efetivamente enviados ao banco. */
  ml: number;
  /** Total do dia devolvido pelo banco (null quando nada foi gravado). */
  totalMl: number | null;
}

// Janela de dedupe: protege contra double-submit (dois toques no botão, retry de
// rede, sendMessage chamado duas vezes). A chave inclui origem e quantidade para
// que um registro legítimo por outro caminho não seja engolido em silêncio.
const DEDUP_WINDOW_MS = 10_000;
const recentLogTs = new Map<string, number>();

export const HydrationService = {
  /**
   * Soma `ml` na hidratação de hoje. Lança se o RPC recusar — o chamador decide
   * como avisar o usuário (a falha silenciosa é o que fazia a água sumir).
   */
  async logWater(userId: string, ml: number, source: WaterLogSource): Promise<WaterLogResult> {
    const rounded = Math.round(ml);
    if (!userId || !Number.isFinite(rounded) || rounded <= 0) {
      return { logged: false, ml: 0, totalMl: null };
    }

    const key = `${userId}:${source}:${rounded}`;
    const now = Date.now();
    if (now - (recentLogTs.get(key) ?? 0) < DEDUP_WINDOW_MS) {
      console.warn('[HydrationService] registro duplicado em <10s, ignorando');
      return { logged: false, ml: rounded, totalMl: null };
    }
    recentLogTs.set(key, now);

    try {
      const { data, error } = await supabase.rpc('log_water_intake', {
        p_user_id: userId,
        p_date: getLocalDateString(),
        p_ml: rounded,
      });
      if (error) throw error;

      const totalMl = typeof data === 'number' ? data : rounded;
      void this.syncHydrationMission(userId, totalMl);
      return { logged: true, ml: rounded, totalMl };
    } catch (e) {
      // Libera a chave para que o usuário possa tentar de novo imediatamente.
      recentLogTs.delete(key);
      throw e;
    }
  },

  /**
   * Meta de água de hoje (definida pelo RPC ao criar a linha do dia). Usada para
   * mostrar o progresso junto da confirmação — nunca para decidir registro.
   */
  async getTodayGoalMl(userId: string): Promise<number | null> {
    const { data } = await supabase
      .from('daily_logs')
      .select('water_goal')
      .eq('user_id', userId)
      .eq('date', getLocalDateString())
      .maybeSingle();
    return data?.water_goal ?? null;
  },

  /** Atualiza o progresso da missão de hidratação (gamificação). Nunca bloqueia. */
  async syncHydrationMission(userId: string, totalMl: number): Promise<void> {
    try {
      const { CoachService } = await import('./coachService');
      const todayMissions = await CoachService.getTodayMissions(userId);
      const hydrationMission = todayMissions.find(m => m.mission_type === 'hydration');
      if (hydrationMission?.id) {
        await CoachService.updateMissionProgress(userId, hydrationMission.id, totalMl);
      }
    } catch {
      /* gamificação é acessória — nunca derruba o registro de água */
    }
  },
};
