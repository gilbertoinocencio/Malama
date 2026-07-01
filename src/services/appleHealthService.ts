import { Capacitor } from '@capacitor/core';
import { Health } from 'capacitor-health';
import type { HealthPermission } from 'capacitor-health';
import { supabase } from './supabase';

/**
 * Apple HealthKit — integração on-device (iOS).
 *
 * Espelha a arquitetura do HealthConnectService (Android):
 *   - Treinos (workouts) → tabela `activities` (service='apple_health')
 *   - Agregados diários (passos, calorias, distância) → `health_daily_metrics` (source='apple_health')
 *   - Sem write de volta ao HealthKit (só leitura)
 *
 * Limitação do plugin v8 (capacitor-health): não expõe peso, sono,
 * gordura corporal ou FC de repouso via queryAggregated. Esses dados
 * podem ser adicionados futuramente com um plugin mais completo.
 *
 * Quirk iOS: HealthKit não revela ao app se permissões de leitura foram
 * concedidas (by design, para privacidade). Usamos localStorage como
 * proxy de "conectado" após a solicitação de permissão.
 */

const SERVICE = 'apple_health';
const LAST_SYNC_KEY = (userId: string) => `ah_last_sync_${userId}`;
const CONNECTED_KEY = (userId: string) => `ah_connected_${userId}`;
const FIRST_SYNC_DAYS = 30;
const OVERLAP_MS = 24 * 60 * 60 * 1000;

const READ_PERMISSIONS: HealthPermission[] = [
  'READ_STEPS',
  'READ_WORKOUTS',
  'READ_ACTIVE_CALORIES',
  'READ_DISTANCE',
  'READ_HEART_RATE',
];

// Mapa workoutType (string do plugin) → rótulo usado no app (estilo Strava)
const WORKOUT_TYPE_LABEL: Record<string, string> = {
  running: 'Run',
  cycling: 'Ride',
  swimming: 'Swim',
  walking: 'Walk',
  hiking: 'Hike',
  highIntensityIntervalTraining: 'Crossfit',
  yoga: 'Yoga',
  traditionalStrengthTraining: 'WeightTraining',
  functionalStrengthTraining: 'WeightTraining',
  rowing: 'Rowing',
  crossTraining: 'Workout',
  other: 'Workout',
};

type DailyRow = {
  user_id: string;
  metric_date: string;
  source: string;
  steps?: number;
  active_calories?: number;
  distance_meters?: number;
};

export interface AppleHealthStatus {
  available: boolean;
  connected: boolean;
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const AppleHealthService = {
  async isAvailable(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'ios') return false;
    try {
      const { available } = await Health.isHealthAvailable();
      return available;
    } catch {
      return false;
    }
  },

  async getStatus(): Promise<AppleHealthStatus> {
    if (!(await this.isAvailable())) return { available: false, connected: false };
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    const connected = userId ? localStorage.getItem(CONNECTED_KEY(userId)) === 'true' : false;
    return { available: true, connected };
  },

  async requestPermissions(): Promise<boolean> {
    if (!(await this.isAvailable())) return false;
    try {
      // HealthKit pede permissão via diálogo nativo e sempre retorna como concedida
      // (por design do iOS — privacidade). O usuário pode negar silenciosamente.
      await Health.requestHealthPermissions({ permissions: READ_PERMISSIONS });
      await this.markConnected();
      await this.sync();
      return true;
    } catch (e) {
      console.warn('[AppleHealth] requestPermissions falhou', e);
      return false;
    }
  },

  async openSettings(): Promise<void> {
    try {
      // Abre Ajustes do app (não há deep link direto para Saúde > Permissões do app)
      await Health.openAppleHealthSettings();
    } catch (e) {
      console.warn('[AppleHealth] openSettings falhou', e);
    }
  },

  async disconnect(userId: string): Promise<void> {
    // HealthKit não tem API de revogação — o usuário revoga em Ajustes > Saúde > [App]
    localStorage.removeItem(LAST_SYNC_KEY(userId));
    localStorage.removeItem(CONNECTED_KEY(userId));
    await supabase
      .from('user_integrations')
      .update({ is_connected: false })
      .eq('user_id', userId)
      .eq('service', SERVICE);
  },

  async sync(): Promise<{ activities: number; days: number } | null> {
    if (!(await this.isAvailable())) return null;

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return null;

    // Só sincroniza se o usuário tiver ativado a integração pelo toggle (concedendo a
    // permissão do HealthKit). O iOS não revela se a permissão de leitura foi concedida,
    // então este flag local é a fonte de verdade — evita "conectar" sozinho no boot,
    // já que o sync roda automaticamente via IntegrationService.syncActivities().
    if (localStorage.getItem(CONNECTED_KEY(userId)) !== 'true') return null;

    const now = new Date();
    const stored = localStorage.getItem(LAST_SYNC_KEY(userId));
    const since = stored
      ? new Date(Math.max(0, Number(stored) - OVERLAP_MS))
      : new Date(now.getTime() - FIRST_SYNC_DAYS * 24 * 60 * 60 * 1000);

    const startDate = since.toISOString();
    const endDate = now.toISOString();

    // Leituras em paralelo
    const [workoutsRes, stepsRes, calRes] = await Promise.allSettled([
      Health.queryWorkouts({
        startDate,
        endDate,
        includeHeartRate: false,
        includeRoute: false,
        includeSteps: false,
      }),
      Health.queryAggregated({ startDate, endDate, dataType: 'steps', bucket: 'day' }),
      Health.queryAggregated({ startDate, endDate, dataType: 'active-calories', bucket: 'day' }),
    ]);

    // ── 1. Treinos → activities ─────────────────────────────────────────────
    const workouts = workoutsRes.status === 'fulfilled' ? workoutsRes.value.workouts : [];

    const activityRows = workouts
      .filter((w) => w.id)
      .map((w) => {
        const label = WORKOUT_TYPE_LABEL[w.workoutType] ?? 'Workout';
        return {
          user_id: userId,
          service: SERVICE,
          external_id: w.id!,
          activity_type: label,
          name: label,
          calories_burned: Math.round(w.calories ?? 0),
          duration_seconds: Math.round(w.duration ?? 0),
          distance_meters: w.distance && w.distance > 0 ? Math.round(w.distance) : null,
          activity_date: new Date(w.startDate).toISOString(),
          raw_data: {
            workoutType: w.workoutType,
            sourceName: w.sourceName,
            sourceBundleId: w.sourceBundleId,
          },
        };
      });

    if (activityRows.length > 0) {
      const { error } = await supabase
        .from('activities')
        .upsert(activityRows, { onConflict: 'service,external_id' });
      if (error) console.warn('[AppleHealth] upsert activities', error.message);
    }

    // Distância diária a partir dos treinos (queryAggregated não suporta distance)
    const distanceByDate = new Map<string, number>();
    for (const w of workouts) {
      if (w.distance && w.distance > 0) {
        const date = localDateStr(new Date(w.startDate));
        distanceByDate.set(date, (distanceByDate.get(date) ?? 0) + w.distance);
      }
    }

    // ── 2. Agregados diários → health_daily_metrics ─────────────────────────
    const daily = new Map<string, DailyRow>();
    const row = (date: string): DailyRow => {
      let r = daily.get(date);
      if (!r) { r = { user_id: userId, metric_date: date, source: SERVICE }; daily.set(date, r); }
      return r;
    };

    // Passos — queryAggregated retorna startDate como número (ms), não ISO string
    const stepsData = stepsRes.status === 'fulfilled' ? stepsRes.value.aggregatedData : [];
    for (const s of stepsData) {
      const date = localDateStr(new Date(Number(s.startDate)));
      if (s.value > 0) row(date).steps = Math.round(s.value);
    }

    // Calorias ativas
    const calData = calRes.status === 'fulfilled' ? calRes.value.aggregatedData : [];
    for (const c of calData) {
      const date = localDateStr(new Date(Number(c.startDate)));
      if (c.value > 0) row(date).active_calories = Math.round(c.value);
    }

    // Distância por dia (dos treinos)
    for (const [date, dist] of distanceByDate) {
      row(date).distance_meters = Math.round(dist);
    }

    if (daily.size > 0) {
      const dates = [...daily.keys()];
      const { data: existing } = await supabase
        .from('health_daily_metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('source', SERVICE)
        .in('metric_date', dates);

      const byDate = new Map<string, Record<string, unknown>>();
      (existing ?? []).forEach((e: { metric_date: string }) => byDate.set(e.metric_date, e));

      const merged = [...daily.values()].map((r) => {
        const prev = byDate.get(r.metric_date) ?? {};
        const clean: Record<string, unknown> = {};
        Object.entries(r).forEach(([k, v]) => { if (v !== undefined && v !== null) clean[k] = v; });
        return { ...prev, ...clean, synced_at: now.toISOString() };
      });

      const { error } = await supabase
        .from('health_daily_metrics')
        .upsert(merged, { onConflict: 'user_id,metric_date,source' });
      if (error) console.warn('[AppleHealth] upsert health_daily_metrics', error.message);
    }

    // Já está ativo (checado no início) — só atualiza o carimbo de sync, sem
    // re-marcar a conexão (markConnected é responsabilidade só do requestPermissions).
    localStorage.setItem(LAST_SYNC_KEY(userId), String(now.getTime()));
    await supabase
      .from('user_integrations')
      .update({ last_sync: now.toISOString() })
      .eq('user_id', userId)
      .eq('service', SERVICE);

    return { activities: activityRows.length, days: daily.size };
  },

  async markConnected(userId?: string, when: Date = new Date()): Promise<void> {
    let id = userId;
    if (!id) {
      const { data } = await supabase.auth.getUser();
      id = data.user?.id;
    }
    if (!id) return;
    localStorage.setItem(CONNECTED_KEY(id), 'true');
    await supabase
      .from('user_integrations')
      .upsert(
        {
          user_id: id,
          service: SERVICE,
          access_token: 'native',
          is_connected: true,
          last_sync: when.toISOString(),
        },
        { onConflict: 'user_id,service' },
      );
  },
};
