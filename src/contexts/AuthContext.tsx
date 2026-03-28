import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: any | null;
    loading: boolean;
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

    const mountedRef = useRef(true);
    const profileFetchId = useRef(0);
    const initCompleteRef = useRef(false);

    const fetchProfile = useCallback(async (userId: string) => {
        const fetchId = ++profileFetchId.current;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

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
        } catch (err) {
            console.error('fetchProfile error:', err);
            if (mountedRef.current && fetchId === profileFetchId.current) {
                setProfile((prev: any) => prev || { id: userId });
            }
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        // ── STEP 1: Initial load using getSession (awaited, no race) ──
        const init = async () => {
            try {
                const { data: { session: s } } = await supabase.auth.getSession();
                if (!mountedRef.current) return;

                setSession(s);
                setUser(s?.user ?? null);

                if (s?.user) {
                    await fetchProfile(s.user.id);
                }
            } catch (err) {
                console.error('Auth init error:', err);
            } finally {
                if (mountedRef.current) {
                    initCompleteRef.current = true;
                    setLoading(false);
                }
            }
        };

        init();

        // ── STEP 2: Listen for SUBSEQUENT changes only (sign-in, sign-out, token refresh) ──
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                if (!mountedRef.current) return;

                // Skip INITIAL_SESSION — we already handled it in init()
                if (event === 'INITIAL_SESSION') return;

                console.log('Auth event:', event);
                setSession(newSession);
                setUser(newSession?.user ?? null);

                if (newSession?.user) {
                    await fetchProfile(newSession.user.id);
                } else {
                    setProfile(null);
                }

                // If init somehow hasn't finished yet, mark it done
                if (!initCompleteRef.current) {
                    initCompleteRef.current = true;
                    setLoading(false);
                }
            }
        );

        return () => {
            mountedRef.current = false;
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

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
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
    }, []);

    const signOut = useCallback(async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error signing out:', error);
    }, []);

    return (
        <AuthContext.Provider value={{
            user, session, profile, loading,
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
