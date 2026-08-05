/**
 * Decide QUANDO oferecer um compartilhamento.
 *
 * A diferença entre um app que se espalha e um que não: no Strava o card aparece
 * na cara do usuário no instante em que ele fecha a corrida. Aqui o
 * compartilhamento sempre exigiu que ele quisesse e achasse o botão.
 *
 * As conquistas já eram calculadas e desbloqueadas no banco pelo
 * GamificationService — o `newUnlocks` voltava para a interface e era descartado
 * sem nunca virar nada na tela.
 *
 * O throttle vive em localStorage de propósito: é preferência de interface por
 * dispositivo, não dado clínico, e assim não custa migração nem round-trip.
 */
import type { Achievement, GamificationStats, UserLevel } from './gamificationService';
import { getLocalDateString } from '../utils/dateUtils';

export type ShareMomentType = 'achievement' | 'level_up' | 'streak' | 'flow_day';

export interface ShareMoment {
  /** Identidade do momento. Usada para não oferecer o mesmo duas vezes. */
  key: string;
  type: ShareMomentType;
  /** Número em destaque: dias de sequência ou pontuação de flow. */
  value?: number;
  /** Nome da conquista ou do nível alcançado. */
  label?: string;
}

interface MomentState {
  /** O usuário pediu para não receber mais ofertas. */
  disabled: boolean;
  /** Data local da última oferta — no máximo uma por dia. */
  lastOfferedDate: string | null;
  /** Momentos já oferecidos, para nunca repetir o mesmo. */
  seen: string[];
  /** Último nível conhecido, para detectar a subida. */
  lastLevel: UserLevel | null;
}

/** Marcos de sequência que valem uma oferta. */
const STREAK_MILESTONES = [7, 30, 60, 100, 365];

/** A partir daqui o dia conta como "em flow". */
const FLOW_DAY_THRESHOLD = 85;

/** Mais recente primeiro: só um momento é oferecido por vez. */
const PRIORITY: ShareMomentType[] = ['achievement', 'level_up', 'streak', 'flow_day'];

const storageKey = (userId: string) => `malama_share_moments_${userId}`;

const EMPTY: MomentState = { disabled: false, lastOfferedDate: null, seen: [], lastLevel: null };

function readState(userId: string): MomentState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY };
  }
}

function writeState(userId: string, state: MomentState) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    /* modo privado / cota cheia: no pior caso a oferta reaparece */
  }
}

export interface DetectMomentInput {
  userId: string;
  stats: GamificationStats | null;
  newUnlocks?: Achievement[];
  flowScore?: number;
}

/**
 * Devolve o momento a oferecer agora, ou null.
 *
 * Registrar o nível visto é efeito colateral necessário: sem isso a primeira
 * detecção depois de instalar trataria o nível atual como recém-conquistado.
 */
export function detectMoment(input: DetectMomentInput): ShareMoment | null {
  const { userId, stats, newUnlocks = [], flowScore } = input;
  const state = readState(userId);

  // A primeira execução só fotografa o nível atual — nada aqui é novidade.
  const isFirstRun = state.lastLevel === null;
  if (stats && state.lastLevel !== stats.level) {
    writeState(userId, { ...state, lastLevel: stats.level });
  }

  if (state.disabled) return null;
  if (state.lastOfferedDate === getLocalDateString()) return null;

  const candidates: ShareMoment[] = [];

  for (const unlock of newUnlocks) {
    candidates.push({
      key: `achievement:${unlock.id}`,
      type: 'achievement',
      label: unlock.title,
    });
  }

  if (stats && !isFirstRun && state.lastLevel && state.lastLevel !== stats.level) {
    candidates.push({
      key: `level:${stats.level}`,
      type: 'level_up',
      label: stats.level,
    });
  }

  if (stats) {
    const reached = STREAK_MILESTONES.filter(m => stats.currentStreak >= m).pop();
    if (reached) {
      candidates.push({ key: `streak:${reached}`, type: 'streak', value: reached });
    }
  }

  if ((flowScore ?? 0) >= FLOW_DAY_THRESHOLD) {
    const today = getLocalDateString();
    candidates.push({ key: `flow:${today}`, type: 'flow_day', value: Math.round(flowScore!) });
  }

  const unseen = candidates.filter(c => !state.seen.includes(c.key));
  if (unseen.length === 0) return null;

  unseen.sort((a, b) => PRIORITY.indexOf(a.type) - PRIORITY.indexOf(b.type));
  return unseen[0];
}

/**
 * Marca o momento como oferecido. Chamar quando a folha APARECE, não quando o
 * usuário compartilha — recusar também consome a oferta do dia, senão a mesma
 * coisa volta na próxima vez que a tela carregar.
 */
export function markMomentOffered(userId: string, moment: ShareMoment) {
  const state = readState(userId);
  if (state.seen.includes(moment.key)) return;
  writeState(userId, {
    ...state,
    lastOfferedDate: getLocalDateString(),
    seen: [...state.seen, moment.key].slice(-200),
  });
}

/** "Não quero mais ver isso." Não some com nada já conquistado. */
export function disableMoments(userId: string) {
  writeState(userId, { ...readState(userId), disabled: true });
}

export function areMomentsEnabled(userId: string): boolean {
  return !readState(userId).disabled;
}
