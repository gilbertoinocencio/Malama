import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Check .env file.');
}

const isNative = Capacitor.isNativePlatform();

// O portal RH convive no mesmo domínio com o app de colaboradores, médicos e
// admin. O storage padrão do Supabase é compartilhado entre todas essas abas;
// ao entrar em outra área, a sessão do RH era substituída via localStorage e
// as consultas seguintes pareciam "apagar" os dados. No navegador, o RH usa
// uma sessão própria. A sessão RH antiga é migrada uma vez para não deslogar
// quem já estava corretamente autenticado.
const isRhWeb = !isNative
    && typeof window !== 'undefined'
    && window.location.pathname.startsWith('/rh');
const rhStorageKey = 'malama.rh.auth';

if (isRhWeb && supabaseUrl && typeof localStorage !== 'undefined' && !localStorage.getItem(rhStorageKey)) {
    try {
        const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
        const defaultKey = `sb-${projectRef}-auth-token`;
        const raw = localStorage.getItem(defaultKey);
        if (raw) {
            const parsed = JSON.parse(raw);
            const session = parsed?.currentSession ?? parsed;
            if (session?.user?.app_metadata?.role === 'rh') localStorage.setItem(rhStorageKey, raw);
        }
    } catch { /* sessão antiga inválida: o login normal recria o storage */ }
}

// No app nativo, a sessao e o verifier PKCE ficam no Keychain (iOS) ou
// cifrados com uma chave do Android Keystore. No navegador, o Supabase usa o
// storage web normal, pois o plugin nao oferece armazenamento seguro na web.
const secureStorageReady = isNative
    ? (async () => {
        await SecureStorage.setKeyPrefix('malama.auth.');
        await SecureStorage.setSynchronize(false);
        await SecureStorage.setDefaultKeychainAccess(KeychainAccess.whenUnlockedThisDeviceOnly);
    })()
    : Promise.resolve();

const nativeStorage = {
    getItem: async (key: string) => {
        await secureStorageReady;
        return SecureStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
        await secureStorageReady;
        return SecureStorage.setItem(key, value);
    },
    removeItem: async (key: string) => {
        await secureStorageReady;
        return SecureStorage.removeItem(key);
    },
};

// Fallback to avoid crash, but auth will fail if vars are missing
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            flowType: 'pkce',
            detectSessionInUrl: !isNative,
            persistSession: true,
            autoRefreshToken: true,
            ...(isRhWeb ? { storageKey: rhStorageKey } : {}),
            ...(isNative ? { storage: nativeStorage } : {}),
        },
    },
);
