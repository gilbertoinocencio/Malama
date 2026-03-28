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

    // Guards
    const mountedRef = useRef(true);
    const profileFetchId = useRef(0); // incremented per fetch to discard stale results

    const fetchProfile = useCallback(async (userId: string) => {
        const fetchId = ++profileFetchId.current;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            // Discard if component unmounted or a newer fetch started
            if (!mountedRef.current || fetchId !== profileFetchId.current) return;

            if (error) {
                console.error('Error fetching profile:', error);
                setProfile((prev: any) => prev || { id: userId });
                return;
            }

            if (data) {
                if (data.goal && !data.onboarding_completed) {
                    // V1 → V2 migration
                    try {
                        const { ProfileService } = await import('../services/profileService');
                        const migrated = await ProfileService.migrateV1ToV2Profile(userId, data);
                        if (mountedRef.current && fetchId === profileFetchId.current) {
                            setProfile(migrated);
                        }
                    } catch {
                        if (mountedRef.current && fetchId === profileFetchId.current) {
                            setProfile(data);
                        }
                    }
                } else {
                    setProfile(data);
                }
            } else {
                setProfile({ id: userId });
            }
        } catch (err) {
            console.error('fetchProfile crash:', err);
            if (mountedRef.current && fetchId === profileFetchId.current) {
                setProfile((prev: any) => prev || { id: userId });
            }
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        let initialDone = false;

        // Use onAuthStateChange as the SINGLE source of truth.
        // Supabase fires INITIAL_SESSION synchronously on subscribe,
        // so we don't need a separate getSession() call.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, newSession) => {
                if (!mountedRef.current) return;

                setSession(newSession);
                setUser(newSession?.user ?? null);

                if (newSession?.user) {
                    await fetchProfile(newSession.user.id);
                } else {
                    setProfile(null);
                }

                // First event = initial load complete
                if (!initialDone) {
                    initialDone = true;
                    if (mountedRef.current) setLoading(false);
                }
            }
        );

        // Safety net: if onAuthStateChange never fires (e.g. network down),
        // stop the spinner after 5s so the user sees the login page.
        const safety = setTimeout(() => {
            if (!initialDone && mountedRef.current) {
                console.warn('⚠️ Auth timeout — stopping spinner');
                initialDone = true;
                setLoading(false);
            }
        }, 5000);

        return () => {
            mountedRef.current = false;
            clearTimeout(safety);
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    const refreshProfile = useCallback(async () => {
        if (user) await fetchProfile(user.id);
    }, [user, fetchProfile]);

    const updateProfile = useCallback(async (updates: any) => {
        if (!user) return;
        try {
            const { ProfileService } = await import('../services/profileService');
            const updatedProfile = await ProfileService.updateProfile(user.id, updates);
            if (mountedRef.current) setProfile(updatedProfile);
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
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
