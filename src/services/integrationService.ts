import { supabase } from './supabase';
import { HealthConnectService } from './healthConnectService';
import { AppleHealthService } from './appleHealthService';
import type { FitnessService, ConnectedIntegration, Activity } from '../types';

export const IntegrationService = {

  // Retorna todas as integrações ativas do usuário no banco.
  // Strava saiu (decisão de produto, 01/09/2026): a cobertura de atividade
  // física é só HealthKit/Health Connect agora, e essas duas são on-device
  // (estado vem do aparelho em runtime — ver Integrations.tsx), não desta
  // tabela. O que resta aqui é o que sobrar em user_integrations por outro
  // canal (histórico de google_fit).
  async getConnectedIntegrations(userId: string): Promise<ConnectedIntegration[]> {
    const { data } = await supabase
      .from('user_integrations')
      .select('service, is_connected, last_sync, external_user_id')
      .eq('user_id', userId);
    return (data ?? []) as ConnectedIntegration[];
  },

  // Marca o serviço como desconectado e limpa os tokens
  async disconnectService(service: FitnessService, userId: string): Promise<void> {
    if (service === 'health_connect') {
      // Health Connect é on-device: revoga as permissões no aparelho + marca inativo
      await HealthConnectService.disconnect(userId);
    } else if (service === 'apple_health') {
      // HealthKit é on-device: sem API de revogação — limpa estado local + marca inativo
      await AppleHealthService.disconnect(userId);
    } else {
      await supabase
        .from('user_integrations')
        .update({ is_connected: false, access_token: '', refresh_token: null })
        .eq('user_id', userId)
        .eq('service', service);
    }
  },

  // Sincroniza atividades de todas as integrações ativas em paralelo.
  // Health Connect (Android) lê on-device e grava direto; auto-gateia em web/iOS.
  async syncActivities(): Promise<void> {
    await Promise.allSettled([
      HealthConnectService.sync(),   // no-op fora do Android
      AppleHealthService.sync(),     // no-op fora do iOS
    ]);
  },

  // Retorna a atividade mais recente do usuário (sem limite de data)
  async getLatestActivity(userId: string): Promise<Activity | null> {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('activity_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as Activity) ?? null;
  },

  // Retorna as atividades de um mês específico
  async getActivitiesByMonth(userId: string, year: number, month: number): Promise<Activity[]> {
    // start of month local time to UTC for db if needed, but the db stores UTC and activity_date is likely just a datetime or timestamp
    // since we want to cover the month, let's use simple string prefix if it's YYYY-MM
    // or we can use bounds
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();
    
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .gte('activity_date', start)
      .lte('activity_date', end)
      .order('activity_date', { ascending: false });
    return (data as Activity[]) ?? [];
  },

  // Soma as calorias queimadas em atividades de um dia específico (YYYY-MM-DD)
  async getActivityCaloriesToday(userId: string, date: string): Promise<number> {
    const start = `${date}T00:00:00`;
    const end = `${date}T23:59:59`;
    const { data } = await supabase
      .from('activities')
      .select('calories_burned')
      .eq('user_id', userId)
      .gte('activity_date', start)
      .lte('activity_date', end);
    return (data ?? []).reduce((sum: number, a: { calories_burned: number }) => sum + (a.calories_burned ?? 0), 0);
  },
};
