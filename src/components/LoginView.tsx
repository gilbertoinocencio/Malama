import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';
import { MalamaLogo } from './MalamaLogo';

export const LoginView: React.FC = () => {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail, loading, user } = useAuth();
    const { t, language, setLanguage } = useLanguage();
    const a = t.auth;
    const [error, setError] = useState<string | null>(null);
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

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError(a.fillFields);
            return;
        }
        setAuthLoading(true);
        setError(null);
        try {
            if (isSignUp) {
                await signUpWithEmail(email, password);
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
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-Malama-bg dark:bg-background-dark font-display relative">
            <div className="absolute top-6 right-6 flex gap-2">
                {[
                    { code: 'en', label: 'EN' },
                    { code: 'pt', label: 'PT' },
                    { code: 'es', label: 'ES' }
                ].map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code as any)}
                        className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${language === lang.code
                            ? 'bg-Malama-petrol dark:bg-primary text-white'
                            : 'text-Malama-muted dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10'
                            }`}
                    >
                        {lang.label}
                    </button>
                ))}
            </div>

            <div className="w-full max-w-sm flex flex-col items-center gap-8 animate-fade-in-up">
                {/* Logo */}
                <div className="flex flex-col items-center gap-4">
                    <MalamaLogo size="xl" />
                    <p className="text-Malama-muted dark:text-slate-400 text-lg font-medium">{a.subtitle}</p>
                </div>

                {/* Action */}
                <div className="w-full flex flex-col gap-4">
                    <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-3">
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
                            className="w-full h-12 bg-Malama-petrol dark:bg-primary text-white rounded-xl font-semibold shadow-lg shadow-Malama-petrol/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    {a.terms}
                    <br /><br />
                    {a.aiNote}
                </p>
            </div>
        </div>
    );
};
