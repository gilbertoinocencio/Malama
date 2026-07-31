import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../services/supabase';
import { doctorService, influencerService } from '../services/doctorPortalService';
import type { Influencer } from '../services/doctorPortalService';

// Deep link de retorno do OAuth no app nativo. Usa um scheme dedicado (reverse-DNS)
// para NÃO colidir com o scheme `malama` que o Capacitor usa para servir o app.
// Registrado em CFBundleURLTypes no Info.plist.
const NATIVE_OAUTH_SCHEME = 'com.malama.saude';
const NATIVE_OAUTH_HOST = 'auth';
const NATIVE_OAUTH_PATH = '/callback';
const NATIVE_OAUTH_REDIRECT = 'https://www.soumalama.com.br/auth/callback';

const isTrustedOAuthCallback = (url: URL): boolean =>
    (url.protocol === 'https:' && url.hostname === 'www.soumalama.com.br' && url.pathname === '/auth/callback')
    || (url.protocol === `${NATIVE_OAUTH_SCHEME}:` && url.hostname === NATIVE_OAUTH_HOST && url.pathname === NATIVE_OAUTH_PATH);

// SHA-256 em hex — usado para o nonce do Sign in with Apple.
// A Apple recebe o nonce já hasheado; o Supabase verifica contra o nonce cru.
const sha256Hex = async (input: string): Promise<string> => {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
};

const randomNonce = (length = 32): string => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values).map((v) => charset[v % charset.length]).join('');
};

export type InfluencerRecord = Influencer & {
    total_referrals: number;
    pending_amount: number;
    total_earned: number;
};

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: any | null;
    loading: boolean;          // true only while checking if user is logged in (fast)
    profileLoading: boolean;   // true while fetching profile from DB
    influencerRecord: InfluencerRecord | null; // preenchido se o usuário logado for influencer
    influencerLoading: boolean; // true enquanto verifica se o usuário é influencer
    refreshInfluencerRecord: () => Promise<void>;
    updateProfile: (updates: any) => Promise<void>;
    refreshProfile: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signInWithApple: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);
    const [influencerRecord, setInfluencerRecord] = useState<InfluencerRecord | null>(null);
    const [influencerLoading, setInfluencerLoading] = useState(false);

    const mountedRef = useRef(true);
    const profileFetchId = useRef(0);

    const fetchProfile = useCallback(async (userId: string) => {
        const fetchId = ++profileFetchId.current;
        setProfileLoading(true);

        try {
            const query = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            // Hard timeout: if Supabase doesn't respond in 8s, use minimal profile
            const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
                setTimeout(() => resolve({ data: null, error: { message: 'Profile fetch timeout' } }), 8000)
            );

            const { data, error } = await Promise.race([query, timeoutPromise]);

            if (!mountedRef.current || fetchId !== profileFetchId.current) return;

            if (error) {
                console.error('Error fetching profile:', error);
                setProfile((prev: any) => prev || { id: userId });
                return;
            }

            if (data) {
                if (data.goal && !data.onboarding_completed) {
                    try {
                        const { ProfileService } = await import('../services/profileService');
                        const migrated = await ProfileService.migrateV1ToV2Profile(userId, data);
                        if (mountedRef.current && fetchId === profileFetchId.current) setProfile(migrated);
                    } catch {
                        if (mountedRef.current && fetchId === profileFetchId.current) setProfile(data);
                    }
                } else {
                    setProfile(data);
                }
            } else {
                setProfile({ id: userId });
            }
        } catch (err: any) {
            if (err?.name === 'AbortError') {
                console.warn('Profile fetch timed out');
            } else {
                console.error('fetchProfile error:', err);
            }
            if (mountedRef.current && fetchId === profileFetchId.current) {
                setProfile((prev: any) => prev || { id: userId });
            }
        } finally {
            if (mountedRef.current && fetchId === profileFetchId.current) {
                setProfileLoading(false);
            }
        }
    }, []);

    // Resolve token de indicação do localStorage e salva no profile (roda 1x por cadastro)
    // DEVE vir antes do useEffect que o utiliza!
    const applyReferralData = useCallback(async (userId: string, isNewUser = false) => {
        const doctorToken     = localStorage.getItem('Malama_referral_token');
        const influencerToken = localStorage.getItem('Malama_influencer_token');
        const channel         = localStorage.getItem('Malama_acquisition_channel');

        try {
            const updates: Record<string, unknown> = {
                id: userId,
                acquisition_channel: channel ?? 'organic',
            };

            if (isNewUser) {
                updates.onboarding_completed = false;
            }

            if (influencerToken) {
                const inf = await influencerService.getByToken(influencerToken);
                if (inf) {
                    updates.referred_by_influencer_id = inf.id;
                    updates.acquisition_channel = 'influencer';
                    await influencerService.registerReferral(inf.id);
                }
            } else if (doctorToken) {
                const doctor = await doctorService.getDoctorByReferralToken(doctorToken);
                if (doctor) {
                    updates.referred_by_doctor_id = doctor.id;
                    updates.acquisition_channel = 'referral';
                }
            }

            await supabase.from('profiles').upsert(updates, { onConflict: 'id' });
        } finally {
            localStorage.removeItem('Malama_referral_token');
            localStorage.removeItem('Malama_influencer_token');
            localStorage.removeItem('Malama_acquisition_channel');
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        // Step 1: Check session from LOCAL cache (instant — no network needed)
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (!mountedRef.current) return;

            setSession(s);
            setUser(s?.user ?? null);

            // STOP the main spinner immediately — we know if user is logged in or not
            setLoading(false);

            // Step 2: Fetch profile in background (non-blocking)
            if (s?.user) {
                fetchProfile(s.user.id);
            }
        }).catch((err) => {
            console.error('getSession error:', err);
            if (mountedRef.current) setLoading(false);
        });

        // Step 3: Listen for subsequent auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, newSession) => {
                if (!mountedRef.current) return;
                // Skip INITIAL_SESSION — already handled above
                if (event === 'INITIAL_SESSION') return;

                setSession(newSession);
                setUser(newSession?.user ?? null);

                if (newSession?.user) {
                    const u = newSession.user;
                    // Novo usuário = criado há menos de 30s (cobre Google OAuth e outros provedores)
                    const isNewOAuthUser = event === 'SIGNED_IN'
                        && u.created_at
                        && (Date.now() - new Date(u.created_at).getTime()) < 30_000;

                    if (event === 'SIGNED_IN' && localStorage.getItem('Malama_referral_token')) {
                        // Usuário com token de indicação: aplica referral e busca profile
                        applyReferralData(u.id, !!isNewOAuthUser)
                            .then(() => fetchProfile(u.id));
                    } else if (isNewOAuthUser) {
                        // Novo usuário OAuth sem token: garante onboarding_completed=false antes de buscar
                        applyReferralData(u.id, true).then(() => fetchProfile(u.id));
                    } else {
                        fetchProfile(u.id);
                    }
                } else {
                    setProfile(null);
                }
            }
        );

        return () => {
            mountedRef.current = false;
            subscription.unsubscribe();
        };
    }, [fetchProfile, applyReferralData]);

    // Captura o retorno do OAuth (Google) no app nativo via deep link malama://auth/callback,
    // troca o code por sessão e fecha o browser do sistema. No-op na web.
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        let cleanup: (() => void) | undefined;
        const processedUrls = new Set<string>();

        (async () => {
            const { App } = await import('@capacitor/app');
            const processCallback = async (url?: string) => {
                if (!url) return;
                if (processedUrls.has(url)) return;
                try {
                    const parsed = new URL(url);
                    if (!isTrustedOAuthCallback(parsed)) return;
                    processedUrls.add(url);

                    const { Browser } = await import('@capacitor/browser');
                    await Browser.close().catch(() => {});

                    // PKCE: o deep link carrega somente um codigo de uso unico.
                    // Tokens de sessao nunca sao aceitos pelo fragmento da URL.
                    const code = parsed.searchParams.get('code');
                    if (code) {
                        const { error } = await supabase.auth.exchangeCodeForSession(code);
                        if (error) throw error;
                    }
                } catch (err) {
                    console.error('Erro ao processar deep link de OAuth:', err);
                }
            };

            const handle = await App.addListener('appUrlOpen', ({ url }) => processCallback(url));
            cleanup = () => { handle.remove(); };

            // appUrlOpen pode nao disparar quando o processo nasceu pelo link.
            const launch = await App.getLaunchUrl();
            await processCallback(launch?.url);
        })();

        return () => { cleanup?.(); };
    }, []);

    // Sincronizar integrações de fitness em background ao logar
    useEffect(() => {
        if (!user) return;
        const sync = async () => {
            try {
                const { IntegrationService } = await import('../services/integrationService');
                await IntegrationService.syncActivities();
            } catch {
                // falha silenciosa — sync é best-effort
            }
        };
        sync();
    }, [user?.id]);

    // Ativa vínculos de empresa (B2B2C) ao acessar o app: 'convidado' → 'ativo'.
    // Cobre tanto quem já tinha conta (e-mail de ativação) quanto quem se
    // cadastrou pelo convite. Best-effort e silencioso.
    useEffect(() => {
        if (!user) return;
        supabase.rpc('ativar_colaboradores_do_usuario').then(({ error }) => {
            if (error) console.warn('Ativação de colaborador falhou (best-effort):', error.message);
        });
    }, [user?.id]);

    // Detectar se o usuário logado é um influencer
    useEffect(() => {
        if (!user) { setInfluencerRecord(null); setInfluencerLoading(false); return; }
        setInfluencerLoading(true);
        influencerService.getByUserId(user.id).then(data => {
            if (mountedRef.current) setInfluencerRecord(data as InfluencerRecord | null);
        }).catch(() => {
            if (mountedRef.current) setInfluencerRecord(null);
        }).finally(() => {
            if (mountedRef.current) setInfluencerLoading(false);
        });
    }, [user?.id]);

    const refreshProfile = useCallback(async () => {
        if (user) await fetchProfile(user.id);
    }, [user, fetchProfile]);

    const refreshInfluencerRecord = useCallback(async () => {
        if (!user) return;
        setInfluencerLoading(true);
        try {
            const data = await influencerService.getByUserId(user.id);
            if (mountedRef.current) setInfluencerRecord(data as InfluencerRecord | null);
        } catch {
            if (mountedRef.current) setInfluencerRecord(null);
        } finally {
            if (mountedRef.current) setInfluencerLoading(false);
        }
    }, [user]);

    const updateProfile = useCallback(async (updates: any) => {
        if (!user) return;
        const { ProfileService } = await import('../services/profileService');
        const updatedProfile = await ProfileService.updateProfile(user.id, updates);
        if (mountedRef.current) setProfile(updatedProfile);
    }, [user]);

    const signInWithGoogle = useCallback(async () => {
        // No app nativo, o redirect web (window.location.origin = capacitor://localhost)
        // não retorna pro app. Abrimos o fluxo OAuth num browser do sistema e capturamos
        // o retorno via deep link (listener appUrlOpen registrado no useEffect abaixo).
        if (Capacitor.isNativePlatform()) {
            const { Browser } = await import('@capacitor/browser');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: NATIVE_OAUTH_REDIRECT,
                    skipBrowserRedirect: true,
                },
            });
            if (error) throw error;
            if (data?.url) await Browser.open({ url: data.url });
            return;
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) throw error;
    }, []);

    const signInWithApple = useCallback(async () => {
        // No iOS nativo, usamos o Sign in with Apple nativo (exigência da App Store,
        // Guideline 4.8) e trocamos o identityToken por uma sessão Supabase.
        if (Capacitor.isNativePlatform()) {
            const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
            const rawNonce = randomNonce();
            const hashedNonce = await sha256Hex(rawNonce);

            const result = await SignInWithApple.authorize({
                clientId: 'com.malama.saude',
                redirectURI: NATIVE_OAUTH_REDIRECT,
                scopes: 'name email',
                nonce: hashedNonce,
            });

            const idToken = result.response?.identityToken;
            if (!idToken) throw new Error('Apple não retornou o token de identidade.');

            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'apple',
                token: idToken,
                nonce: rawNonce,
            });
            if (error) throw error;

            // A Apple só envia o nome no PRIMEIRO login (consentimento). Se veio,
            // salva como display_name no metadata e no perfil — senão o usuário
            // ficaria sem nome (e o app mostraria o e-mail de relay).
            const appleName = [result.response?.givenName, result.response?.familyName]
                .filter(Boolean)
                .join(' ')
                .trim();
            if (appleName && data?.user) {
                try {
                    await supabase.auth.updateUser({ data: { display_name: appleName } });
                    const { ProfileService } = await import('../services/profileService');
                    await ProfileService.updateProfile(data.user.id, { display_name: appleName });
                } catch (e) {
                    console.error('Erro ao salvar nome da Apple:', e);
                }
            }
            return;
        }

        // Na web, fluxo OAuth padrão do Supabase.
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: { redirectTo: window.location.origin },
        });
        if (error) throw error;
    }, []);

    const signInWithEmail = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    }, []);

    const signUpWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
        const name = displayName?.trim();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            // Guarda o nome no metadata do usuário (usado como fallback no app).
            ...(name ? { options: { data: { display_name: name } } } : {}),
        });
        if (error) throw error;
        if (data.user) {
            // applyReferralData grava onboarding_completed=false no perfil.
            // fetchProfile logo após garante que o estado React reflita o valor
            // correto, sobrescrevendo qualquer fetch prematuro disparado pelo
            // evento SIGNED_IN (que pode correr antes do upsert terminar).
            await applyReferralData(data.user.id, true);
            if (name) {
                try {
                    const { ProfileService } = await import('../services/profileService');
                    await ProfileService.updateProfile(data.user.id, { display_name: name });
                } catch (e) {
                    console.error('Erro ao salvar nome no perfil:', e);
                }
            }
            await fetchProfile(data.user.id);
        }
    }, [applyReferralData, fetchProfile]);

    const signOut = useCallback(async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error signing out:', error);
    }, []);

    return (
        <AuthContext.Provider value={{
            user, session, profile, loading, profileLoading,
            influencerRecord, influencerLoading, refreshInfluencerRecord,
            updateProfile, refreshProfile,
            signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, signOut
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
