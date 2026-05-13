import React from 'react'
import { useEngagementSystem, CircadianState } from '../../hooks/useEngagementSystem'

type StateConfig = {
  badge: string
  badgeText: string
  fill: string
  icon: string
}

const stateConfig: Record<CircadianState, StateConfig> = {
  pending: {
    badge:     'bg-gray-100 dark:bg-white/5 text-Malama-muted dark:text-slate-500',
    badgeText: 'Aguardando',
    fill:      'w-[2%] bg-gray-300 dark:bg-gray-600',
    icon:      'schedule',
  },
  active: {
    badge:     'bg-Malama-petrol-light dark:bg-primary/15 text-Malama-petrol dark:text-primary',
    badgeText: 'Em janela',
    fill:      'bg-lime-400',
    icon:      'restaurant',
  },
  closing: {
    badge:     'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    badgeText: 'Encerrando',
    fill:      'bg-amber-500',
    icon:      'hourglass_bottom',
  },
  out: {
    badge:     'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    badgeText: 'Fora da janela',
    fill:      'w-full bg-red-400',
    icon:      'block',
  },
}

export function EngagementCard() {
  const {
    circadianState,
    circadianProgress,
    circadianMessage,
    windowStart,
    windowEnd,
  } = useEngagementSystem()

  const cfg = stateConfig[circadianState]

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-Malama-border dark:border-white/10 shadow-sm p-4 mb-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span
            className="material-symbols-outlined text-Malama-petrol dark:text-primary"
            style={{ fontSize: '16px', fontVariationSettings: "'FILL' 0" }}
          >
            {cfg.icon}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-Malama-muted dark:text-slate-400">
            Janela alimentar
          </span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
          {cfg.badgeText}
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="h-1.5 bg-gray-100 dark:bg-[#363330] rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${cfg.fill}`}
          style={
            circadianState !== 'out' && circadianState !== 'pending'
              ? { width: `${circadianProgress}%` }
              : {}
          }
        />
      </div>

      {/* Horários da janela */}
      <div className="flex justify-between mb-1.5">
        <span className="text-[10px] text-Malama-muted dark:text-slate-500">{windowStart}</span>
        <span className="text-[10px] text-Malama-muted dark:text-slate-500">{windowEnd}</span>
      </div>

      {/* Mensagem de estado */}
      <p className="text-[11px] text-Malama-muted dark:text-slate-400 leading-relaxed">
        {circadianMessage}
      </p>

    </div>
  )
}
