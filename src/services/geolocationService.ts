/**
 * GeolocationService - Serviço de geolocalização para o Malama
 * Detecta a localização do usuário para personalizar sugestões regionais
 */

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  state?: string; // UF do Brasil
  city?: string;
  country?: string;
  region?: string; // Região brasileira
  timestamp?: number;
}

interface GeolocationState {
  permission: 'prompt' | 'granted' | 'denied';
  location: LocationData | null;
  lastUpdated: Date | null;
  error: string | null;
}

// Mapeamento de coordenadas aproximadas para estados brasileiros
// (centróides aproximados de cada estado)
const BRAZIL_STATE_BOUNDS: Record<string, { north: number; south: number; east: number; west: number }> = {
  'AC': { north: -7, south: -11, east: -67, west: -74 },
  'AL': { north: -8, south: -10.5, east: -35, west: -38 },
  'AP': { north: 4, south: -1, east: -50, west: -54 },
  'AM': { north: 5, south: -11, east: -57, west: -74 },
  'BA': { north: -10, south: -18, east: -36, west: -45 },
  'CE': { north: -2, south: -8, east: -37, west: -42 },
  'DF': { north: -15.5, south: -16, east: -47.3, west: -48.3 },
  'ES': { north: -17, south: -21.5, east: -39, west: -42 },
  'GO': { north: -12, south: -19, east: -45, west: -53 },
  'MA': { north: -1, south: -10, east: -42, west: -49 },
  'MT': { north: -7, south: -18, east: -51, west: -62 },
  'MS': { north: -17, south: -24, east: -51, west: -58 },
  'MG': { north: -14, south: -23, east: -39, west: -51 },
  'PA': { north: 5, south: -10, east: -44, west: -56 },
  'PB': { north: -6, south: -8.5, east: -34, west: -39 },
  'PR': { north: -22, south: -27, east: -48, west: -55 },
  'PE': { north: -7, south: -9.5, east: -34, west: -41 },
  'PI': { north: -2, south: -11, east: -40, west: -46 },
  'RJ': { north: -20, south: -23.5, east: -40, west: -45 },
  'RN': { north: -4, south: -7, east: -34, west: -39 },
  'RS': { north: -27, south: -34, east: -49, west: -58 },
  'RO': { north: -8, south: -14, east: -59, west: -67 },
  'RR': { north: 5, south: 0, east: -59, west: -63 },
  'SC': { north: -26, south: -29.5, east: -48, west: -54 },
  'SP': { north: -19, south: -25, east: -44, west: -53 },
  'SE': { north: -9, south: -11.5, east: -36, west: -38 },
  'TO': { north: -5, south: -13, east: -46, west: -50 },
};

// Mapeamento de UF para região
const UF_TO_REGION: Record<string, string> = {
  'AC': 'norte', 'AM': 'norte', 'AP': 'norte', 'PA': 'norte', 'RO': 'norte', 'RR': 'norte', 'TO': 'norte',
  'AL': 'nordeste', 'BA': 'nordeste', 'CE': 'nordeste', 'MA': 'nordeste', 'PB': 'nordeste',
  'PE': 'nordeste', 'PI': 'nordeste', 'RN': 'nordeste', 'SE': 'nordeste',
  'DF': 'centro-oeste', 'GO': 'centro-oeste', 'MS': 'centro-oeste', 'MT': 'centro-oeste',
  'ES': 'sudeste', 'MG': 'sudeste', 'RJ': 'sudeste', 'SP': 'sudeste',
  'PR': 'sul', 'RS': 'sul', 'SC': 'sul'
};

// Mapeamento de UF para nome completo
const UF_NAMES: Record<string, string> = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas', 'BA': 'Bahia',
  'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo', 'GO': 'Goiás',
  'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul', 'MG': 'Minas Gerais',
  'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná', 'PE': 'Pernambuco', 'PI': 'Piauí',
  'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte', 'RS': 'Rio Grande do Sul',
  'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina', 'SP': 'São Paulo',
  'SE': 'Sergipe', 'TO': 'Tocantins'
};

export const GeolocationService = {
  /**
   * Verifica se o navegador suporta geolocalização
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  },

  /**
   * Solicita permissão e obtém a localização atual do usuário
   */
  async requestLocation(): Promise<LocationData> {
    if (!this.isSupported()) {
      throw new Error('Geolocalização não suportada neste navegador');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          // Detecta estado baseado nas coordenadas
          const state = this.detectStateFromCoordinates(latitude, longitude);
          const region = state ? UF_TO_REGION[state] : undefined;
          const country = this.detectCountryFromCoordinates(latitude, longitude);

          const locationData: LocationData = {
            latitude,
            longitude,
            accuracy,
            state,
            region,
            country,
            timestamp: Date.now()
          };

          console.log('📍 Localização detectada:', {
            coords: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            state: state ? `${state} (${UF_NAMES[state]})` : 'Desconhecido',
            region: region || 'Desconhecida',
            country: country || 'Desconhecido',
            accuracy: `${accuracy}m`
          });

          resolve(locationData);
        },
        (error) => {
          let errorMessage = 'Erro ao obter localização';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permissão de localização negada pelo usuário';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Localização indisponível';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tempo esgotado ao obter localização';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutos de cache
        }
      );
    });
  },

  /**
   * Detecta o estado brasileiro baseado nas coordenadas
   */
  detectStateFromCoordinates(lat: number, lng: number): string | undefined {
    // Verifica cada estado brasileiro
    for (const [state, bounds] of Object.entries(BRAZIL_STATE_BOUNDS)) {
      if (lat >= bounds.south && lat <= bounds.north &&
          lng >= bounds.west && lng <= bounds.east) {
        return state;
      }
    }

    // Se não encontrou nenhum estado brasileiro, retorna undefined
    return undefined;
  },

  /**
   * Detecta o país baseado nas coordenadas (simplificado para Brasil)
   */
  detectCountryFromCoordinates(lat: number, lng: number): string {
    // Verificação simplificada: se está dentro dos bounds aproximados do Brasil
    const brazilBounds = {
      north: 5.5,    // extremo norte (Oiapoque)
      south: -33.8,  // extremo sul (Chuí)
      east: -32,     // extremo leste (PB)
      west: -74      // extremo oeste (AC)
    };

    if (lat >= brazilBounds.south && lat <= brazilBounds.north &&
        lng >= brazilBounds.west && lng <= brazilBounds.east) {
      return 'BR';
    }

    // Para outros países, precisaríamos de uma API de geocoding reverso
    return 'UNKNOWN';
  },

  /**
   * Monitora mudanças de localização em tempo real (útil para viagens)
   */
  watchLocation(
    onLocationChange: (location: LocationData) => void,
    onError?: (error: Error) => void
  ): number {
    if (!this.isSupported()) {
      throw new Error('Geolocalização não suportada');
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const state = this.detectStateFromCoordinates(latitude, longitude);
        const region = state ? UF_TO_REGION[state] : undefined;
        const country = this.detectCountryFromCoordinates(latitude, longitude);

        const locationData: LocationData = {
          latitude,
          longitude,
          accuracy,
          state,
          region,
          country,
          timestamp: Date.now()
        };

        console.log('📍 Mudança de localização detectada:', locationData.state || 'Fora do Brasil');
        onLocationChange(locationData);
      },
      (error) => {
        onError?.(new Error('Erro ao monitorar localização'));
      },
      {
        enableHighAccuracy: false, // Menor precisão para economizar bateria
        timeout: 10000,
        maximumAge: 600000 // 10 minutos de cache
      }
    );
  },

  /**
   * Para o monitoramento de localização
   */
  clearWatch(watchId: number): void {
    navigator.geolocation.clearWatch(watchId);
  },

  /**
   * Salva a localização no perfil do usuário no Supabase
   */
  async saveLocationToProfile(
    userId: string,
    location: LocationData,
    supabase: any
  ): Promise<void> {
    if (!userId || !location) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        state: location.state || null,
        region: location.region || null,
        country: location.country || 'BR',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Erro ao salvar localização no perfil:', error);
      throw error;
    }

    console.log('✅ Localização salva no perfil:', {
      state: location.state,
      region: location.region,
      country: location.country
    });
  },

  /**
   * Obtém texto amigável para exibição
   */
  getLocationDisplay(location: LocationData | null): string {
    if (!location) return 'Localização desconhecida';

    const parts: string[] = [];
    
    if (location.city) {
      parts.push(location.city);
    }
    
    if (location.state) {
      parts.push(UF_NAMES[location.state] || location.state);
    }
    
    if (location.country && location.country !== 'BR') {
      parts.push(location.country);
    }

    return parts.join(', ') || 'Brasil';
  },

  /**
   * Verifica se a localização expirou (mais de 24 horas)
   */
  isLocationStale(location: LocationData | null): boolean {
    if (!location?.timestamp) return true;
    
    const hoursSinceUpdate = (Date.now() - location.timestamp) / (1000 * 60 * 60);
    return hoursSinceUpdate > 24;
  }
};

export type { LocationData, GeolocationState };
