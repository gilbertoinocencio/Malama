import { supabase } from './supabase';
import type { FitnessService, ConnectedIntegration, Activity } from '../types';

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID as string;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_FIT_CLIENT_ID as string;

export const IntegrationService = {

  // Retorna todas as integrações ativas do usuário no banco
  // Combina user_integrations (Google Fit, etc.) + strava_connections (Strava)
  async getConnectedIntegrations(userId: string): Promise<ConnectedIntegration[]> {
    const [{ data: intRows }, { data: stravaRow }] = await Promise.all([
      supabase
        .from('user_integrations')
        .select('service, is_connected, last_sync, external_user_id')
        .eq('user_id', userId),
      supabase
        .from('strava_connections')
        .select('strava_athlete_id, connected_at')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    const result: ConnectedIntegration[] = (intRows ?? []) as ConnectedIntegration[];

    // Adicionar Strava vindo de strava_connections (evitar duplicata se já existir em user_integrations)
    const hasStravaInUserIntegrations = result.some(r => r.service === 'strava');
    if (stravaRow && !hasStravaInUserIntegrations) {
      result.push({
        service: 'strava',
        is_connected: true,
        last_sync: stravaRow.connected_at ?? null,
        external_user_id: String(stravaRow.strava_athlete_id),
      });
    }

    return result;
  },

  // Inicia o fluxo OAuth redirecionando o usuário para a plataforma
  initiateOAuth(service: 'strava' | 'google_fit'): void {
    if (service === 'strava') {
      const redirectUri = `${APP_URL}/strava/callback`;
      const params = new URLSearchParams({
        client_id: STRAVA_CLIENT_ID,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'activity:read_all',
        approval_prompt: 'auto',
      });
      window.location.href = `https://www.strava.com/oauth/authorize?${params}`;
    }

    if (service === 'google_fit') {
      const redirectUri = `${APP_URL}/google/callback`;
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'https://www.googleapis.com/auth/fitness.activity.read',
        access_type: 'offline',
        prompt: 'consent',
      });
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
  },

  // Envia o code para a edge function que faz o token exchange server-side (Strava)
  async handleStravaCallback(code: string, userId: string): Promise<boolean> {
    const { error } = await supabase.functions.invoke('strava-oauth', {
      body: { code, user_id: userId },
    });
    return !error;
  },

  // Envia o code para a edge function que faz o token exchange server-side (Google Fit)
  async handleGoogleFitCallback(code: string, userId: string): Promise<boolean> {
    const { error } = await supabase.functions.invoke('google-fit-oauth', {
      body: { code, user_id: userId },
    });
    return !error;
  },

  // Marca o serviço como desconectado e limpa os tokens
  async disconnectService(service: FitnessService, userId: string): Promise<void> {
    if (service === 'strava') {
      // Strava usa a tabela strava_connections
      await supabase
        .from('strava_connections')
        .delete()
        .eq('user_id', userId);
    } else {
      await supabase
        .from('user_integrations')
        .update({ is_connected: false, access_token: '', refresh_token: null })
        .eq('user_id', userId)
        .eq('service', service);
    }
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
