import React, { forwardRef } from 'react';
import { useLanguage } from '../i18n';
import type { ShareMoment } from '../services/shareMomentsService';

interface MomentShareCardProps {
  moment: ShareMoment;
}

/**
 * Um visual por tipo de momento. Fundos em CSS puro — nada de rede, para o card
 * sair igual offline (ver shareService).
 */
const VISUALS: Record<ShareMoment['type'], { bg: string; icon: string; accent: string }> = {
  achievement: {
    bg: 'radial-gradient(circle at 30% 20%, #f0c26b 0%, #b8823a 45%, #4a2f16 100%)',
    icon: 'trophy',
    accent: '#ffe9b8',
  },
  level_up: {
    bg: 'radial-gradient(circle at 30% 20%, #a8d5a2 0%, #4f8a5b 45%, #16301d 100%)',
    icon: 'psychiatry',
    accent: '#d8f0d4',
  },
  streak: {
    bg: 'radial-gradient(circle at 30% 20%, #f6a45c 0%, #c9542b 45%, #3a1409 100%)',
    icon: 'local_fire_department',
    accent: '#ffd9b8',
  },
  flow_day: {
    bg: 'radial-gradient(circle at 30% 20%, #6fc6dd 0%, #1f6f8a 45%, #08252f 100%)',
    icon: 'monitoring',
    accent: '#c9edf7',
  },
};

export const MomentShareCard = forwardRef<HTMLDivElement, MomentShareCardProps>(
  ({ moment }, ref) => {
    const { t } = useLanguage();
    const sm = t.shareMoments;
    const visual = VISUALS[moment.type];

    // Cada tipo tem um número e um rótulo diferentes no centro do card.
    const headline =
      moment.type === 'streak'
        ? String(moment.value ?? 0)
        : moment.type === 'flow_day'
          ? `${moment.value ?? 0}%`
          : null;

    const caption =
      moment.type === 'streak'
        ? sm.streakDays
        : moment.type === 'flow_day'
          ? sm.flowDay
          : moment.type === 'level_up'
            ? sm.levels[moment.label as keyof typeof sm.levels] ?? moment.label
            : moment.label;

    const kicker =
      moment.type === 'achievement'
        ? sm.kickerAchievement
        : moment.type === 'level_up'
          ? sm.kickerLevelUp
          : moment.type === 'streak'
            ? sm.kickerStreak
            : sm.kickerFlowDay;

    return (
      <div
        ref={ref}
        className="relative w-full aspect-[9/16] overflow-hidden font-display text-white"
        style={{ background: visual.bg }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />

        <div className="absolute inset-0 flex flex-col justify-between p-8">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-80">Malama</span>
          </div>

          <div className="flex flex-col items-center text-center gap-5">
            <span
              className="material-symbols-outlined text-[64px] drop-shadow-sm"
              style={{ color: visual.accent }}
            >
              {visual.icon}
            </span>

            <p className="text-[11px] font-bold tracking-[0.3em] uppercase" style={{ color: visual.accent }}>
              {kicker}
            </p>

            {headline && (
              <h1 className="text-8xl font-extrabold tracking-tighter leading-[0.85] drop-shadow-sm">
                {headline}
              </h1>
            )}

            <h2
              className={`font-bold leading-tight tracking-tight capitalize drop-shadow-sm ${headline ? 'text-2xl' : 'text-4xl px-2'}`}
            >
              {caption}
            </h2>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="h-px w-16 bg-white/30" />
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-70">Feed the Flow</p>
          </div>
        </div>
      </div>
    );
  }
);

MomentShareCard.displayName = 'MomentShareCard';
