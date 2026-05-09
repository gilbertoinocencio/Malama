import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface DailyLogEntry {
  date: string
  protein_pct: number
  carb_pct: number
  fat_pct: number
}

export function useDailyLogs({ days }: { days: number }): { logs: DailyLogEntry[] } {
  const { user, profile } = useAuth()
  const [logs, setLogs] = useState<DailyLogEntry[]>([])

  useEffect(() => {
    if (!user || !profile) return

    const targetProtein = profile.target_protein || 1
    const targetCarbs = profile.target_carbs || 1
    const targetFats = profile.target_fats || 1

    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    supabase
      .from('meals')
      .select('protein, carbs, fats, created_at')
      .eq('user_id', user.id)
      .gte('created_at', since.toISOString())
      .then(({ data }) => {
        if (!data) return

        const byDate = new Map<string, { protein: number; carbs: number; fats: number }>()
        for (const meal of data) {
          const date = meal.created_at.slice(0, 10)
          const prev = byDate.get(date) ?? { protein: 0, carbs: 0, fats: 0 }
          byDate.set(date, {
            protein: prev.protein + (meal.protein || 0),
            carbs: prev.carbs + (meal.carbs || 0),
            fats: prev.fats + (meal.fats || 0),
          })
        }

        const entries: DailyLogEntry[] = Array.from(byDate.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([date, totals]) => ({
            date,
            protein_pct: Math.round((totals.protein / targetProtein) * 100),
            carb_pct: Math.round((totals.carbs / targetCarbs) * 100),
            fat_pct: Math.round((totals.fats / targetFats) * 100),
          }))

        setLogs(entries)
      })
  }, [user?.id, profile?.target_protein, profile?.target_carbs, profile?.target_fats, days])

  return { logs }
}
