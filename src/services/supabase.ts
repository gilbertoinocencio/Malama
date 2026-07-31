import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Check .env file.');
}

const isNative = Capacitor.isNativePlatform();

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
            ...(isNative ? { storage: nativeStorage } : {}),
        },
    },
);
