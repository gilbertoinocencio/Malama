import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { doctorService, influencerService } from '../services/doctorPortalService';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: any | null;
    loading: boolean;          // true only while checking if user is logged in (fast)
    profileLoading: boolean;   // true while fetching profile from DB
    updateProfile: (updates: any) => Promise<void>;
    refreshProfile: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);

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
    const applyReferralData = useCallback(async (userId: string) => {
        const doctorToken     = localStorage.getItem('nura_referral_token');
        const influencerToken = localStorage.getItem('nura_influencer_token');
        const channel         = localStorage.getItem('nura_acquisition_channel');

        const updates: Record<string, unknown> = {
            id: userId,
            acquisition_channel: channel ?? 'organic',
        };

        if (influencerToken) {
            const inf = await influencerService.getByToken(influencerToken);
            if (inf) {
                updates.referred_by_influencer_id = inf.id;
                updates.acquisition_channel = 'influencer';
                await influencerService.registerReferral(inf.id, userId, inf.commission_per_referral);
            }
        } else if (doctorToken) {
            const doctor = await doctorService.getDoctorByReferralToken(doctorToken);
            if (doctor) {
                updates.referred_by_doctor_id = doctor.id;
                updates.acquisition_channel = 'referral';
            }
        }

        await supabase.from('profiles').upsert(updates, { onConflict: 'id' });
        localStorage.removeItem('nura_referral_token');
        localStorage.removeItem('nura_influencer_token');
        localStorage.removeItem('nura_acquisition_channel');
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
                    // Se há token de indicação no localStorage e é um SIGNED_IN (ex: Google OAuth),
                    // aplica o rastreamento antes de buscar o profile
                    if (event === 'SIGNED_IN' && localStorage.getItem('nura_referral_token')) {
                        applyReferralData(newSession.user.id).then(() => fetchProfile(newSession.user.id));
                    } else {
                        fetchProfile(newSession.user.id);
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

    const refreshProfile = useCallback(async () => {
        if (user) await fetchProfile(user.id);
    }, [user, fetchProfile]);

    const updateProfile = useCallback(async (updates: any) => {
        if (!user) return;
        const { ProfileService } = await import('../services/profileService');
        const updatedProfile = await ProfileService.updateProfile(user.id, updates);
        if (mountedRef.current) setProfile(updatedProfile);
    }, [user]);

    const signInWithGoogle = useCallback(async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) throw error;
    }, []);

    const signInWithEmail = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    }, []);

    const signUpWithEmail = useCallback(async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Salvar canal de aquisição e indicação logo após o cadastro
        if (data.user) await applyReferralData(data.user.id);
    }, [applyReferralData]);

    const signOut = useCallback(async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error signing out:', error);
    }, []);

    return (
        <AuthContext.Provider value={{
            user, session, profile, loading, profileLoading,
            updateProfile, refreshProfile,
            signInWithGoogle, signInWithEmail, signUpWithEmail, signOut
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
