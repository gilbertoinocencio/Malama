import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';

export const LoginView: React.FC = () => {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
    const { t, language, setLanguage } = useLanguage();
    const a = t.auth;
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-nura-bg dark:bg-background-dark">
                <div className="w-16 h-16 border-4 border-nura-petrol dark:border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-nura-bg dark:bg-background-dark font-display relative">
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
                            ? 'bg-nura-petrol dark:bg-primary text-white'
                            : 'text-nura-muted dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10'
                            }`}
                    >
                        {lang.label}
                    </button>
                ))}
            </div>

            <div className="w-full max-w-sm flex flex-col items-center gap-8 animate-fade-in-up">
                {/* Logo */}
                <div className="flex flex-col items-center gap-2">
                    <div className="size-20 bg-nura-petrol dark:bg-primary rounded-full flex items-center justify-center shadow-lg shadow-nura-petrol/20 dark:shadow-primary/20">
                        <span className="material-symbols-outlined text-white text-4xl">water_drop</span>
                    </div>
                    <h1 className="text-4xl font-bold text-nura-petrol dark:text-white tracking-tighter">NURA</h1>
                    <p className="text-nura-muted dark:text-slate-400 font-medium">{a.subtitle}</p>
                </div>

                {/* Action */}
                <div className="w-full flex flex-col gap-4">
                    <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-3">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-12 px-4 rounded-xl border border-nura-border dark:border-white/10 bg-white dark:bg-black/20 text-nura-main dark:text-white placeholder-nura-muted focus:outline-none focus:ring-2 focus:ring-nura-petrol/20 transition-all"
                        />
                        <input
                            type="password"
                            placeholder={a.password}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-12 px-4 rounded-xl border border-nura-border dark:border-white/10 bg-white dark:bg-black/20 text-nura-main dark:text-white placeholder-nura-muted focus:outline-none focus:ring-2 focus:ring-nura-petrol/20 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full h-12 bg-nura-petrol dark:bg-primary text-white rounded-xl font-semibold shadow-lg shadow-nura-petrol/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {authLoading ? a.processing : (isSignUp ? a.signUp : a.signIn)}
                        </button>
                    </form>

                    <div className="w-full flex items-center justify-between text-sm">
                        <span className="text-nura-muted">
                            {isSignUp ? a.hasAccount : a.noAccount}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-nura-petrol dark:text-primary font-semibold hover:underline"
                        >
                            {isSignUp ? a.doLogin : a.createAccount}
                        </button>
                    </div>

                    <div className="relative w-full py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-nura-bg dark:bg-background-dark text-nura-muted">{a.orContinueWith}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full h-14 bg-white dark:bg-surface-dark border border-nura-border dark:border-white/10 rounded-xl flex items-center justify-center gap-3 shadow-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-nura-main dark:text-white font-semibold relative overflow-hidden group"
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

                <p className="text-xs text-center text-nura-muted dark:text-slate-500 max-w-xs leading-relaxed">
                    {a.terms}
                    <br /><br />
                    {a.aiNote}
                </p>
            </div>
        </div>
    );
};
