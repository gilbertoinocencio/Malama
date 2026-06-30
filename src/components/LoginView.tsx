import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';
import { MalamaLogo } from './MalamaLogo';

// Sign in with Apple é exibido no iOS (exigência da App Store, Guideline 4.8).
const isIOS = Capacitor.getPlatform() === 'ios';

export const LoginView: React.FC = () => {
    const { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, loading, user } = useAuth();
    const { t, language, setLanguage } = useLanguage();
    const a = t.auth;
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(() =>
        new URLSearchParams(window.location.search).get('signup') === 'true'
    );
    const [authLoading, setAuthLoading] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            setError(null);
            await signInWithGoogle();
        } catch (err: any) {
            setError(err.message || a.authError);
        }
    };

    const handleAppleLogin = async () => {
        try {
            setError(null);
            await signInWithApple();
        } catch (err: any) {
            // Usuário cancelou o prompt da Apple — não mostrar erro.
            const msg = String(err?.message || '');
            if (/cancel/i.test(msg) || err?.code === '1001') return;
            setError(err.message || a.authError);
        }
    };

    const appleButtonText =
        language === 'pt' ? 'Continuar com a Apple'
        : language === 'es' ? 'Continuar con Apple'
        : 'Continue with Apple';

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError(a.fillFields);
            return;
        }
        if (isSignUp && !name.trim()) {
            setError(a.fillFields);
            return;
        }
        setAuthLoading(true);
        setError(null);
        try {
            if (isSignUp) {
                await signUpWithEmail(email, password, name.trim());
                // Se é signup de influencer, o onAuthStateChange vai detectar
                // e redirecionar para o onboarding automaticamente
                setError(a.accountCreated);
            } else {
                await signInWithEmail(email, password);
            }
        } catch (err: any) {
            setError(err.message || a.authError);
        } finally {
            setAuthLoading(false);
        }
    };

    // Se é signup de influencer e já está logado, redirecionar para onboarding
    useEffect(() => {
        const isSignup = new URLSearchParams(window.location.search).get('signup') === 'true';
        const isInfluencerSignup = localStorage.getItem('Malama_is_influencer_signup') === 'true';

        if (isSignup && isInfluencerSignup && user) {
            // Usuário influencer acabou de fazer signup e está logado
            // O App.tsx já deve mostrar o onboarding, mas vamos garantir
            // que não fique preso na tela de login
            const timer = setTimeout(() => {
                // Se ainda está na tela de login após 2s, força navegação
                if (user) {
                    window.location.replace('/');
                }
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-Malama-bg dark:bg-background-dark">
                <div className="w-16 h-16 border-4 border-Malama-petrol dark:border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-Malama-bg dark:bg-background-dark font-display">
            {/* Top bar — language switcher no fluxo, sem sobreposição */}
            <div className="flex justify-end px-5 pt-5 pb-0">
                <div className="flex gap-1">
                    {[
                        { code: 'en', label: 'EN' },
                        { code: 'pt', label: 'PT' },
                        { code: 'es', label: 'ES' }
                    ].map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => setLanguage(lang.code as any)}
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${language === lang.code
                                ? 'bg-Malama-petrol dark:bg-primary text-white'
                                : 'text-Malama-muted dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10'
                                }`}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Conteúdo principal centralizado no espaço restante */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
            <div className="w-full max-w-sm flex flex-col items-center gap-8 animate-fade-in-up">
                {/* Logo */}
                <div className="flex flex-col items-center gap-3">
                    <MalamaLogo size="lg" />
                    <p className="text-Malama-muted dark:text-slate-400 text-base font-medium">{a.subtitle}</p>
                </div>

                {/* Action */}
                <div className="w-full flex flex-col gap-4">
                    <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-3">
                        {isSignUp && (
                            <input
                                type="text"
                                autoComplete="name"
                                placeholder={language === 'pt' ? 'Nome' : language === 'es' ? 'Nombre' : 'Name'}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl border border-Malama-border dark:border-white/10 bg-white dark:bg-black/20 text-Malama-main dark:text-white placeholder-Malama-muted focus:outline-none focus:ring-2 focus:ring-Malama-petrol/20 transition-all"
                            />
                        )}
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-12 px-4 rounded-xl border border-Malama-border dark:border-white/10 bg-white dark:bg-black/20 text-Malama-main dark:text-white placeholder-Malama-muted focus:outline-none focus:ring-2 focus:ring-Malama-petrol/20 transition-all"
                        />
                        <input
                            type="password"
                            placeholder={a.password}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-12 px-4 rounded-xl border border-Malama-border dark:border-white/10 bg-white dark:bg-black/20 text-Malama-main dark:text-white placeholder-Malama-muted focus:outline-none focus:ring-2 focus:ring-Malama-petrol/20 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full h-12 bg-Malama-petrol dark:bg-primary text-white rounded-xl font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {authLoading ? a.processing : (isSignUp ? a.signUp : a.signIn)}
                        </button>
                    </form>

                    <div className="w-full flex items-center justify-between text-sm">
                        <span className="text-Malama-muted">
                            {isSignUp ? a.hasAccount : a.noAccount}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-Malama-petrol dark:text-primary font-semibold hover:underline"
                        >
                            {isSignUp ? a.doLogin : a.createAccount}
                        </button>
                    </div>

                    <div className="relative w-full py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-Malama-bg dark:bg-background-dark text-Malama-muted">{a.orContinueWith}</span>
                        </div>
                    </div>

                    {isIOS && (
                        <button
                            onClick={handleAppleLogin}
                            className="w-full h-14 bg-black text-white rounded-xl flex items-center justify-center gap-3 shadow-sm hover:bg-black/90 active:scale-[0.99] transition-all font-semibold"
                        >
                            <svg viewBox="0 0 384 512" className="w-5 h-5 fill-current" aria-hidden="true">
                                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                            </svg>
                            <span>{appleButtonText}</span>
                        </button>
                    )}

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full h-14 bg-white dark:bg-surface-dark border border-Malama-border dark:border-white/10 rounded-xl flex items-center justify-center gap-3 shadow-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-Malama-main dark:text-white font-semibold relative overflow-hidden group"
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                        <span>{a.continueGoogle}</span>
                    </button>

                    {error && (
                        <p className="text-red-500 text-sm text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                            {error}
                        </p>
                    )}
                </div>

                <p className="text-xs text-center text-Malama-muted dark:text-slate-500 max-w-xs leading-relaxed">
                    {(() => {
                        // URLs absolutas hospedadas — funcionam na web e no app nativo
                        // (Capacitor), onde as rotas internas /termos e /privacidade não existem.
                        const linkDefs = [
                            {
                                text: language === 'pt' ? 'Termos de Serviço'
                                    : language === 'es' ? 'Términos de Servicio'
                                    : 'Terms of Service',
                                url: 'https://www.soumalama.com.br/termos',
                            },
                            {
                                text: language === 'pt' ? 'Política de Privacidade'
                                    : language === 'es' ? 'Política de Privacidad'
                                    : 'Privacy Policy',
                                url: 'https://www.soumalama.com.br/privacidade',
                            },
                        ];
                        const matches = linkDefs
                            .map(d => ({ ...d, idx: a.terms.indexOf(d.text) }))
                            .filter(d => d.idx !== -1)
                            .sort((x, y) => x.idx - y.idx);
                        if (matches.length === 0) return a.terms;
                        const parts: React.ReactNode[] = [];
                        let cursor = 0;
                        matches.forEach((m, i) => {
                            parts.push(a.terms.slice(cursor, m.idx));
                            parts.push(
                                <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-Malama-main transition-colors">
                                    {m.text}
                                </a>
                            );
                            cursor = m.idx + m.text.length;
                        });
                        parts.push(a.terms.slice(cursor));
                        return <>{parts}</>;
                    })()}
                    <br /><br />
                    {a.aiNote}
                </p>

                <div className="mt-4 max-w-xs rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-2.5">
                    <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed text-center">
                        ⚕️ {a.medicalDisclaimer}
                    </p>
                </div>
            </div>
            </div>
        </div>
    );
};
