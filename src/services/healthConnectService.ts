import { Capacitor } from '@capacitor/core';
import { HealthConnect } from '@kiwi-health/capacitor-health-connect';
// O plugin exporta um tipo `Record` (colide com o utilitário global Record<K,V>) e
// não exporta `StoredRecord` — então importamos com alias e reconstruímos o tipo lido.
import type { RecordType, Record as HCRecord, RecordMetadata } from '@kiwi-health/capacitor-health-connect';
import { supabase } from './supabase';

/** Registro retornado por readRecords: a união de tipos do plugin + metadata. */
type HCStoredRecord = HCRecord & { metadata: RecordMetadata };

/**
 * Google Health Connect — integração on-device (Android).
 *
 * Health Connect NÃO é OAuth/nuvem: os dados vivem no aparelho. Este serviço lê
 * os registros via plugin nativo e grava no Supabase, reaproveitando a mesma
 * infraestrutura das outras integrações fitness:
 *   - Sessões de exercício            → tabela `activities` (service='health_connect')
 *   - Agregados diários (passos, etc.)→ tabela `health_daily_metrics`
 *   - Peso                            → tabela `weight_logs` (source='wearable')
 *
 * Sincronização: leitura por janela desde o último sync (idempotente via upsert),
 * disparada ao abrir o app + botão manual. O estado real de "conectado" é a
 * permissão concedida no aparelho, verificada em runtime (não um flag no banco).
 */

const SERVICE = 'health_connect';

// Tipos de registro que lemos do Health Connect. Cada um exige a permissão
// android.permission.health.READ_* correspondente, declarada no AndroidManifest.
const READ_TYPES: RecordType[] = [
  'Steps',
  'ExerciseSession',
  'ActiveCaloriesBurned',
  'TotalCaloriesBurned',
  'Distance',
  'HeartRateSeries',
  'SleepSession',
  'Weight',
  'BodyFat',
];

// RecordType → string de permissão concedida (formato devolvido pelo plugin).
// Usado para ler apenas os tipos cuja permissão o usuário realmente concedeu.
const PERMISSION_BY_TYPE: Record<string, string> = {
  Steps: 'android.permission.health.READ_STEPS',
  ExerciseSession: 'android.permission.health.READ_EXERCISE',
  ActiveCaloriesBurned: 'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
  TotalCaloriesBurned: 'android.permission.health.READ_TOTAL_CALORIES_BURNED',
  Distance: 'android.permission.health.READ_DISTANCE',
  HeartRateSeries: 'android.permission.health.READ_HEART_RATE',
  SleepSession: 'android.permission.health.READ_SLEEP',
  Weight: 'android.permission.health.READ_WEIGHT',
  BodyFat: 'android.permission.health.READ_BODY_FAT',
};

// Mapeia o ExerciseType (int do Health Connect) para os rótulos já usados no
// app (estilo Strava, lidos pelo PatientActivitiesPanel). Desconhecidos → 'Workout'.
const EXERCISE_TYPE_LABEL: Record<number, string> = {
  0: 'Workout',          // OTHER_WORKOUT
  8: 'Ride',             // BIKING
  9: 'Ride',             // BIKING_STATIONARY
  36: 'Crossfit',        // HIGH_INTENSITY_INTERVAL_TRAINING
  37: 'Hike',            // HIKING
  53: 'Rowing',          // ROWING
  54: 'Rowing',          // ROWING_MACHINE
  56: 'Run',             // RUNNING
  57: 'Run',             // RUNNING_TREADMILL
  70: 'WeightTraining',  // STRENGTH_TRAINING
  73: 'Swim',            // SWIMMING_OPEN_WATER
  74: 'Swim',            // SWIMMING_POOL
  79: 'Walk',            // WALKING
  81: 'WeightTraining',  // WEIGHTLIFTING
  83: 'Yoga',            // YOGA
};

const LAST_SYNC_KEY = (userId: string) => `hc_last_sync_${userId}`;
const FIRST_SYNC_DAYS = 30;     // janela na 1ª sincronização
const OVERLAP_MS = 24 * 60 * 60 * 1000; // re-lê 1 dia antes do último sync (edições tardias)

export interface HealthConnectStatus {
  /** Plataforma Android + app Health Connect disponível. */
  available: boolean;
  /** Ao menos uma permissão de leitura concedida no aparelho. */
  connected: boolean;
  /** Permissões concedidas (strings android.permission.health.*). */
  granted: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const ts = (d: Date | string): number => new Date(d).getTime();

/** YYYY-MM-DD no fuso local (para bucketizar agregados por dia). */
function localDateStr(d: Date | string): string {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Soma os valores cujo ponto médio do intervalo cai dentro de [start, end]. */
function sumWithinWindow(
  records: Array<{ startTime: Date | string; endTime: Date | string }>,
  start: number,
  end: number,
  valueOf: (r: never) => number,
): number {
  let total = 0;
  for (const r of records) {
    const mid = (ts(r.startTime) + ts(r.endTime)) / 2;
    if (mid >= start && mid <= end) total += valueOf(r as never);
  }
  return total;
}

type DailyRow = {
  user_id: string;
  metric_date: string;
  source: string;
  steps?: number;
  active_calories?: number;
  total_calories?: number;
  distance_meters?: number;
  avg_heart_rate?: number;
  sleep_minutes?: number;
  body_fat_pct?: number;
  weight_kg?: number;
};

// ── Serviço ──────────────────────────────────────────────────────────────

export const HealthConnectService = {
  /** Só Android + provider Health Connect instalado/atualizado. */
  async isAvailable(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'android') return false;
    try {
      const { availability } = await HealthConnect.checkAvailability();
      return availability === 'Available';
    } catch {
      return false;
    }
  },

  /** Estado para a UI: disponível? conectado (tem permissão)? */
  async getStatus(): Promise<HealthConnectStatus> {
    if (!(await this.isAvailable())) {
      return { available: false, connected: false, granted: [] };
    }
    try {
      const { grantedPermissions } = await HealthConnect.checkHealthPermissions({
        read: READ_TYPES,
        write: [],
      });
      return {
        available: true,
        connected: (grantedPermissions ?? []).length > 0,
        granted: grantedPermissions ?? [],
      };
    } catch {
      return { available: true, connected: false, granted: [] };
    }
  },

  /**
   * Abre o diálogo nativo de permissões. Retorna true se ao menos uma leitura
   * foi concedida. Não há redirect OAuth — tudo acontece no aparelho.
   */
  async requestPermissions(): Promise<boolean> {
    if (!(await this.isAvailable())) return false;
    try {
      const { grantedPermissions } = await HealthConnect.requestHealthPermissions({
        read: READ_TYPES,
        write: [],
      });
      const granted = (grantedPermissions ?? []).length > 0;
      if (granted) {
        await this.markConnected();
        await this.sync(); // primeira carga
      }
      return granted;
    } catch (e) {
      console.warn('[HealthConnect] requestPermissions falhou', e);
      return false;
    }
  },

  /** Abre as configurações do app Health Connect (para o usuário gerenciar/revogar). */
  async openSettings(): Promise<void> {
    try {
      await HealthConnect.openHealthConnectSetting();
    } catch (e) {
      console.warn('[HealthConnect] openSettings falhou', e);
    }
  },

  /**
   * Desconecta: revoga as permissões no aparelho (interrompe o acesso aos dados)
   * e marca a integração como inativa no banco.
   */
  async disconnect(userId: string): Promise<void> {
    try {
      await HealthConnect.revokeHealthPermissions();
    } catch {
      /* pode não estar disponível — segue limpando o estado */
    }
    localStorage.removeItem(LAST_SYNC_KEY(userId));
    await supabase
      .from('user_integrations')
      .update({ is_connected: false })
      .eq('user_id', userId)
      .eq('service', SERVICE);
  },

  /**
   * Lê o Health Connect desde o último sync (janela de 30 dias na 1ª vez) e grava
   * no Supabase. Idempotente: re-sincronizar não duplica (upsert por chaves únicas).
   * No-op silencioso em web/iOS ou sem permissão.
   */
  async sync(): Promise<{ activities: number; days: number } | null> {
    if (!(await this.isAvailable())) return null;

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return null;

    // Apenas tipos com permissão concedida (ler sem permissão lança SecurityException).
    let granted: string[] = [];
    try {
      const res = await HealthConnect.checkHealthPermissions({ read: READ_TYPES, write: [] });
      granted = res.grantedPermissions ?? [];
    } catch {
      return null;
    }
    if (granted.length === 0) return null;
    const canRead = (t: RecordType) => granted.includes(PERMISSION_BY_TYPE[t]);

    // Janela de leitura.
    const now = new Date();
    const stored = localStorage.getItem(LAST_SYNC_KEY(userId));
    const since = stored
      ? new Date(Math.max(0, Number(stored) - OVERLAP_MS))
      : new Date(now.getTime() - FIRST_SYNC_DAYS * 24 * 60 * 60 * 1000);

    const read = async (type: RecordType): Promise<HCStoredRecord[]> => {
      if (!canRead(type)) return [];
      try {
        const { records } = await HealthConnect.readRecords({
          type,
          timeRangeFilter: { type: 'between', startTime: since, endTime: now },
        });
        return records ?? [];
      } catch (e) {
        console.warn(`[HealthConnect] readRecords(${type}) falhou`, e);
        return [];
      }
    };

    // Leituras em paralelo.
    const [
      stepsR, sessionsR, activeCalR, totalCalR, distanceR, hrSeriesR, sleepR, weightR, bodyFatR,
    ] = await Promise.all([
      read('Steps'), read('ExerciseSession'), read('ActiveCaloriesBurned'),
      read('TotalCaloriesBurned'), read('Distance'), read('HeartRateSeries'),
      read('SleepSession'), read('Weight'), read('BodyFat'),
    ]);

    // ── 1. Sessões de exercício → activities ────────────────────────────────
    const activityRows = sessionsR
      .filter((r): r is Extract<HCStoredRecord, { type: 'ExerciseSession' }> => r.type === 'ExerciseSession')
      .map((s) => {
        const start = ts(s.startTime);
        const end = ts(s.endTime);
        const calories = sumWithinWindow(
          activeCalR.filter((r) => r.type === 'ActiveCaloriesBurned'),
          start, end, (r: Extract<HCStoredRecord, { type: 'ActiveCaloriesBurned' }>) => r.energy.value,
        );
        const distance = sumWithinWindow(
          distanceR.filter((r) => r.type === 'Distance'),
          start, end, (r: Extract<HCStoredRecord, { type: 'Distance' }>) => r.distance.value, // já em metros
        );
        const label = EXERCISE_TYPE_LABEL[s.exerciseType] ?? 'Workout';
        return {
          user_id: userId,
          service: SERVICE,
          external_id: s.metadata.id,
          activity_type: label,
          name: s.title || label,
          calories_burned: Math.round(calories),
          duration_seconds: Math.max(0, Math.round((end - start) / 1000)),
          distance_meters: distance > 0 ? distance : null,
          activity_date: new Date(s.startTime).toISOString(),
          raw_data: { exerciseType: s.exerciseType, dataOrigin: s.metadata.dataOrigin, notes: s.notes ?? null },
        };
      });

    if (activityRows.length > 0) {
      const { error } = await supabase
        .from('activities')
        .upsert(activityRows, { onConflict: 'service,external_id' });
      if (error) console.warn('[HealthConnect] upsert activities', error.message);
    }

    // ── 2. Agregados diários → health_daily_metrics ─────────────────────────
    const daily = new Map<string, DailyRow>();
    const row = (date: string): DailyRow => {
      let r = daily.get(date);
      if (!r) { r = { user_id: userId, metric_date: date, source: SERVICE }; daily.set(date, r); }
      return r;
    };
    const addNum = (r: DailyRow, k: keyof DailyRow, v: number) => {
      (r[k] as number) = ((r[k] as number) ?? 0) + v;
    };

    for (const s of stepsR) if (s.type === 'Steps') addNum(row(localDateStr(s.startTime)), 'steps', s.count);
    for (const c of activeCalR) if (c.type === 'ActiveCaloriesBurned') addNum(row(localDateStr(c.startTime)), 'active_calories', c.energy.value);
    for (const c of totalCalR) if (c.type === 'TotalCaloriesBurned') addNum(row(localDateStr(c.startTime)), 'total_calories', c.energy.value);
    for (const d of distanceR) if (d.type === 'Distance') addNum(row(localDateStr(d.startTime)), 'distance_meters', d.distance.value);

    // Sono: soma a duração das sessões, atribuída ao dia do despertar (endTime).
    for (const s of sleepR) {
      if (s.type !== 'SleepSession') continue;
      const minutes = Math.round((ts(s.endTime) - ts(s.startTime)) / 60000);
      addNum(row(localDateStr(s.endTime)), 'sleep_minutes', minutes);
    }

    // Frequência cardíaca média do dia (todas as amostras das séries).
    const hrByDate = new Map<string, { sum: number; n: number }>();
    for (const series of hrSeriesR) {
      if (series.type !== 'HeartRateSeries') continue;
      for (const sample of series.samples) {
        const date = localDateStr(sample.time);
        const acc = hrByDate.get(date) ?? { sum: 0, n: 0 };
        acc.sum += sample.beatsPerMinute; acc.n += 1;
        hrByDate.set(date, acc);
      }
    }
    for (const [date, { sum, n }] of hrByDate) if (n > 0) row(date).avg_heart_rate = Math.round(sum / n);

    // % gordura: valor mais recente do dia.
    const bfLatest = new Map<string, { t: number; v: number }>();
    for (const b of bodyFatR) {
      if (b.type !== 'BodyFat') continue;
      const date = localDateStr(b.time);
      const cur = bfLatest.get(date);
      const t = ts(b.time);
      if (!cur || t > cur.t) bfLatest.set(date, { t, v: b.percentage.value });
    }
    for (const [date, { v }] of bfLatest) row(date).body_fat_pct = Math.round(v * 10) / 10;

    // Peso: valor mais recente do dia (kg). weight.value vem em GRAMAS.
    const wLatest = new Map<string, { t: number; kg: number }>();
    for (const w of weightR) {
      if (w.type !== 'Weight') continue;
      const date = localDateStr(w.time);
      const cur = wLatest.get(date);
      const t = ts(w.time);
      if (!cur || t > cur.t) wLatest.set(date, { t, kg: w.weight.value / 1000 });
    }
    for (const [date, { kg }] of wLatest) row(date).weight_kg = Math.round(kg * 100) / 100;

    // Arredonda os acumuladores numéricos.
    for (const r of daily.values()) {
      if (r.steps != null) r.steps = Math.round(r.steps);
      if (r.active_calories != null) r.active_calories = Math.round(r.active_calories);
      if (r.total_calories != null) r.total_calories = Math.round(r.total_calories);
      if (r.distance_meters != null) r.distance_meters = Math.round(r.distance_meters);
    }

    // Merge com o que já existe (preserva colunas de tipos sem permissão), depois upsert.
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
        // valores computados (não-nulos) vencem; demais colunas preservadas
        const clean: Record<string, unknown> = {};
        Object.entries(r).forEach(([k, v]) => { if (v !== undefined && v !== null) clean[k] = v; });
        return { ...prev, ...clean, synced_at: now.toISOString() };
      });

      const { error } = await supabase
        .from('health_daily_metrics')
        .upsert(merged, { onConflict: 'user_id,metric_date,source' });
      if (error) console.warn('[HealthConnect] upsert health_daily_metrics', error.message);
    }

    // ── 3. Peso → weight_logs (source='wearable'), com dedup por timestamp ──
    if (weightR.length > 0) {
      const { data: existingW } = await supabase
        .from('weight_logs')
        .select('logged_at')
        .eq('user_id', userId)
        .eq('source', 'wearable')
        .gte('logged_at', since.toISOString());
      const seen = new Set((existingW ?? []).map((w: { logged_at: string }) => new Date(w.logged_at).getTime()));

      const weightRows = weightR
        .filter((w): w is Extract<HCStoredRecord, { type: 'Weight' }> => w.type === 'Weight')
        .filter((w) => !seen.has(ts(w.time)))
        .map((w) => ({
          user_id: userId,
          weight_kg: Math.round((w.weight.value / 1000) * 100) / 100,
          note: 'Health Connect',
          source: 'wearable',
          logged_at: new Date(w.time).toISOString(),
        }));

      if (weightRows.length > 0) {
        const { error } = await supabase.from('weight_logs').insert(weightRows);
        if (error) console.warn('[HealthConnect] insert weight_logs', error.message);
      }
    }

    // ── 4. Marca conexão + cursor ──────────────────────────────────────────
    await this.markConnected(userId, now);
    localStorage.setItem(LAST_SYNC_KEY(userId), String(now.getTime()));

    return { activities: activityRows.length, days: daily.size };
  },

  /** Cria/atualiza a linha em user_integrations para refletir na UI e no portal do médico. */
  async markConnected(userId?: string, when: Date = new Date()): Promise<void> {
    let id = userId;
    if (!id) {
      const { data } = await supabase.auth.getUser();
      id = data.user?.id;
    }
    if (!id) return;
    await supabase
      .from('user_integrations')
      .upsert(
        {
          user_id: id,
          service: SERVICE,
          access_token: 'native', // placeholder: Health Connect não usa token
          is_connected: true,
          last_sync: when.toISOString(),
        },
        { onConflict: 'user_id,service' },
      );
  },
};
