// =====================================================
// Malama — Location Auto-Permission Service
// Gerencia a solicitação automática de localização no primeiro uso
// =====================================================

import { supabase } from '../services/supabase';

const LOCATION_PROMPTED_KEY = 'Malama_location_prompted';
const LOCATION_ENABLED_KEY = 'Malama_location_enabled';

export const LocationAutoPermission = {
  /**
   * Verifica se já solicitamos permissão de localização ao usuário
   */
  hasBeenPrompted(): boolean {
    return localStorage.getItem(LOCATION_PROMPTED_KEY) === 'true';
  },

  /**
   * Marca que já solicitamos permissão (independente da resposta)
   */
  markAsPrompted(): void {
    localStorage.setItem(LOCATION_PROMPTED_KEY, 'true');
  },

  /**
   * Verifica se o usuário já tem localização salva no perfil
   */
  async hasLocationInProfile(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('state')
        .eq('id', userId)
        .single();
      
      return !!data?.state;
    } catch (error) {
      console.error('❌ Erro ao verificar localização no perfil:', error);
      return false;
    }
  },

  /**
   * Verifica se é o primeiro uso do app (não tem localização e nunca foi solicitado)
   */
  async isFirstUse(userId: string): Promise<boolean> {
    const hasLocation = await this.hasLocationInProfile(userId);
    const wasPrompted = this.hasBeenPrompted();
    
    // É primeiro uso se: não tem localização E nunca foi solicitado
    return !hasLocation && !wasPrompted;
  },

  /**
   * Solicita permissão de localização automaticamente (após onboarding)
   */
  async requestAutoPermission(userId: string, supabaseClient: any): Promise<void> {
    // Verifica se o navegador suporta geolocalização
    if (!('geolocation' in navigator)) {
      console.log('⚠️ Geolocalização não suportada');
      this.markAsPrompted();
      return;
    }

    try {
      console.log('📍 Solicitando localização automaticamente...');
      
      const location = await new Promise<{
        latitude: number;
        longitude: number;
      }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            reject(error);
          },
          {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 600000, // 10 minutos
          }
        );
      });

      // Se chegou aqui, o usuário permitiu
      console.log('✅ Localização obtida:', location);
      
      // Buscar informações de estado/região via API reversa (usando coordenadas)
      // Por enquanto, salvamos apenas as coordenadas
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          latitude: location.latitude,
          longitude: location.longitude,
          country: 'BR', // Assumimos Brasil como padrão
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Erro ao salvar localização:', error);
      } else {
        console.log('✅ Localização salva no perfil');
        localStorage.setItem(LOCATION_ENABLED_KEY, 'true');
      }

      this.markAsPrompted();
    } catch (error: any) {
      // Usuário negou ou erro técnico
      if (error.code === 1) {
        console.log('🚫 Usuário negou permissão de localização');
      } else {
        console.error('❌ Erro ao obter localização:', error);
      }
      
      // Marcamos como solicitado mesmo assim para não perguntar novamente
      this.markAsPrompted();
    }
  },

  /**
   * Reseta o estado (para teste ou quando usuário desativa manualmente)
   */
  reset(): void {
    localStorage.removeItem(LOCATION_PROMPTED_KEY);
    localStorage.removeItem(LOCATION_ENABLED_KEY);
  },
};
