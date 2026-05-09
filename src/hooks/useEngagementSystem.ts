import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDailyLogs } from './useDailyLogs'

export type CircadianState = 'pending' | 'active' | 'closing' | 'out'

export interface EngagementData {
  rhythmText: string
  reserveCredits: number
  maxCredits: number
  multiplierActive: boolean
  multiplierValue: string
  circadianState: CircadianState
  circadianProgress: number
  windowStart: string
  windowEnd: string
  circadianMessage: string
}

export function useEngagementSystem(): EngagementData {
  const { profile } = useAuth()
  const { logs } = useDailyLogs({ days: 14 })

  return useMemo(() => {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    // --- Janela alimentar ---
    const rawStart = profile?.eating_window_start ?? '08:00:00'
    const rawEnd   = profile?.eating_window_end   ?? '20:00:00'
    const [startH, startM] = rawStart.split(':').map(Number)
    const [endH,   endM]   = rawEnd.split(':').map(Number)
    const windowStartMin = startH * 60 + startM
    const windowEndMin   = endH   * 60 + endM
    const windowDuration = windowEndMin - windowStartMin

    const windowStart = `${String(startH).padStart(2, '0')}h${String(startM).padStart(2, '0')}`
    const windowEnd   = `${String(endH).padStart(2, '0')}h${String(endM).padStart(2, '0')}`

    let circadianState: CircadianState = 'pending'
    let circadianProgress = 0
    let circadianMessage = ''
    let multiplierActive = false

    if (currentMinutes < windowStartMin) {
      circadianState = 'pending'
      circadianProgress = 0
      circadianMessage = `Sua janela começa às ${windowStart} · ${Math.round(windowDuration / 60)}h de duração`
      multiplierActive = false

    } else if (currentMinutes >= windowEndMin) {
      circadianState = 'out'
      circadianProgress = 100
      circadianMessage = `Refeição após ${windowEnd} · o multiplicador de hoje não se aplica`
      multiplierActive = false

    } else {
      const elapsed = currentMinutes - windowStartMin
      const minutesLeft = windowEndMin - currentMinutes
      circadianProgress = Math.min(97, Math.round((elapsed / windowDuration) * 100))

      if (minutesLeft <= 60) {
        circadianState = 'closing'
        circadianMessage = `Sua janela fecha às ${windowEnd} · você tem ${minutesLeft} minutos`
        multiplierActive = true
      } else {
        circadianState = 'active'
        const hoursLeft = Math.floor(minutesLeft / 60)
        circadianMessage = `Janela ativa até ${windowEnd} · você tem ${hoursLeft}h de margem`
        multiplierActive = true
      }
    }

    // --- Reserva Metabólica ---
    let reserveCredits = 0
    const recent = (logs ?? []).slice(0, 14)
    for (const log of recent) {
      const allGood = log.protein_pct >= 80 && log.carb_pct >= 80 && log.fat_pct >= 80
      const allBad  = log.protein_pct < 40 && log.carb_pct < 40 && log.fat_pct < 40

      if (allGood) reserveCredits = Math.min(5, reserveCredits + 1)
      if (allBad)  reserveCredits = Math.max(0, reserveCredits - 2)
    }

    // --- Missão Dinâmica ---
    let rhythmText = 'Registre sua primeira refeição do dia.'

    if (recent.length >= 3) {
      const lastDay = recent[0]
      const last4   = recent.slice(0, 4)
      const proteinStreak = last4.filter(l => l.protein_pct >= 80).length

      if (lastDay && lastDay.protein_pct < 40 && lastDay.carb_pct < 40) {
        rhythmText = 'Ontem foi ruim. Hoje você tem a chance de não deixar virar padrão.'
      } else if (proteinStreak === 4) {
        rhythmText = 'Proteína batida 4 dias seguidos. Fecha a semana.'
      } else if (proteinStreak === 3) {
        rhythmText = 'Três dias com proteína em dia. Mantém amanhã.'
      } else if (reserveCredits <= 1) {
        rhythmText = 'Sua reserva está baixa. Dois dias assim e a sequência quebra.'
      } else {
        rhythmText = 'Dia novo. O histórico da semana ainda pode ser salvo.'
      }
    }

    return {
      rhythmText,
      reserveCredits,
      maxCredits: 5,
      multiplierActive,
      multiplierValue: multiplierActive ? '×1.2' : '×1.0',
      circadianState,
      circadianProgress,
      windowStart,
      windowEnd,
      circadianMessage,
    }
  }, [profile, logs])
}
