import React from 'react'
import { useEngagementSystem, CircadianState } from '../../hooks/useEngagementSystem'

const circadianConfig: Record<CircadianState, {
  pill: string
  fill: string
  badge: string
  badgeText: string
}> = {
  pending: {
    pill:      'bg-white/[0.02] border border-white/[0.04]',
    fill:      'w-[2%] bg-white/20',
    badge:     'text-white/30 bg-white/5',
    badgeText: 'Aguardando',
  },
  active: {
    pill:      'bg-white/[0.05] border border-white/[0.07]',
    fill:      'bg-gradient-to-r from-[#7d3d3d] to-[#f2c4bc]',
    badge:     'text-[#f2c4bc] bg-[#f2c4bc]/15',
    badgeText: 'Em janela',
  },
  closing: {
    pill:      'bg-[#e8b84b]/10 border border-[#e8b84b]/20',
    fill:      'bg-gradient-to-r from-[#c8902a] to-[#e8b84b]',
    badge:     'text-[#e8b84b] bg-[#e8b84b]/15',
    badgeText: 'Encerrando',
  },
  out: {
    pill:      'bg-red-500/[0.07] border border-red-500/15',
    fill:      'w-full bg-red-500/40',
    badge:     'text-red-400 bg-red-500/12',
    badgeText: 'Fora da janela',
  },
}

interface EngagementCardProps {
  onHowItWorks: () => void
}

export function EngagementCard({ onHowItWorks }: EngagementCardProps) {
  const {
    missionText,
    reserveCredits,
    maxCredits,
    multiplierActive,
    multiplierValue,
    circadianState,
    circadianProgress,
    circadianMessage,
  } = useEngagementSystem()

  const circ = circadianConfig[circadianState]
  const multColor = multiplierActive ? '#f2c4bc' : 'rgba(250,248,245,0.22)'

  return (
    <div className="bg-black rounded-2xl p-5 mb-4 relative overflow-hidden">

      {/* Header com botão discreto */}
      <div className="flex items-start justify-between mb-2">
        <p className="text-[9px] font-medium tracking-[2.5px] uppercase text-[#f2c4bc]">
          Missão de hoje
        </p>
        <button
          onClick={onHowItWorks}
          className="text-[9px] font-medium tracking-[1px] uppercase text-white/25 hover:text-white/45 transition-colors"
        >
          como funciona?
        </button>
      </div>
      <p className="font-serif text-[19px] italic text-[#faf8f5] leading-snug mb-5 pr-2">
        "{missionText}"
      </p>

      {/* Reserva + Multiplicador */}
      <div className="flex gap-2 mb-2">

        {/* Reserva Metabólica */}
        <div className="flex-1 bg-white/[0.06] rounded-xl p-3 border border-white/[0.07]">
          <p className="text-[8px] font-medium tracking-widest uppercase text-white/35 mb-2">
            Reserva metabólica
          </p>
          <div className="flex gap-[5px]">
            {Array.from({ length: maxCredits }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < reserveCredits ? 'bg-[#f2c4bc]' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] font-light text-white/35 mt-1.5">
            {reserveCredits} de {maxCredits} créditos
          </p>
        </div>

        {/* Multiplicador */}
        <div className="bg-[#f2c4bc]/12 rounded-xl p-3 border border-[#f2c4bc]/18 min-w-[100px] flex flex-col justify-between">
          <p className="text-[8px] font-medium tracking-widest uppercase text-white/35 mb-2">
            Multiplicador
          </p>
          <p className="font-serif text-[26px] font-light leading-none mb-1" style={{ color: multColor }}>
            {multiplierValue}
          </p>
          <div className="flex items-center gap-1">
            <div className="w-[5px] h-[5px] rounded-full" style={{ background: multColor }} />
            <span className="text-[9px] font-medium tracking-wide uppercase" style={{ color: multColor }}>
              {multiplierActive ? 'ativo' : 'inativo'}
            </span>
          </div>
        </div>

      </div>

      {/* Janela Alimentar */}
      <div className={`rounded-xl p-3 ${circ.pill}`}>
        <div className="flex justify-between items-center">
          <p className="text-[8px] font-medium tracking-widest uppercase text-white/35">
            Janela alimentar
          </p>
          <span className={`text-[9px] font-medium tracking-[1.5px] uppercase px-2 py-1 rounded ${circ.badge}`}>
            {circ.badgeText}
          </span>
        </div>
        <div className="h-[3px] bg-white/[0.08] rounded-full mt-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${circ.fill}`}
            style={
              circadianState !== 'out' && circadianState !== 'pending'
                ? { width: `${circadianProgress}%` }
                : {}
            }
          />
        </div>
        <p className="text-[10px] font-light text-white/35 mt-1.5">
          {circadianMessage}
        </p>
      </div>

    </div>
  )
}
