// =====================================================
// NURA — Login do Influenciador
// =====================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { NuraLogo } from '../../components/NuraLogo';

export const InfluencerLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (err) {
      setError('E-mail ou senha incorretos.');
      return;
    }

    // Verificar se onboarding foi completado
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.onboarding_completed) {
        // Onboarding não completado — redirecionar para app principal (App.tsx detecta e mostra onboarding)
        localStorage.setItem('nura_is_influencer_signup', 'true');
        window.location.replace('/');
      } else {
        // Onboarding completado — ir para dashboard do influencer
        window.location.replace('/influencer/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-10">
          <NuraLogo size="lg" />
        </div>

        <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-8">
          <h1 className="text-white text-xl font-bold text-center mb-6">Painel do Influenciador</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">E-mail</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full pr-10 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
                  placeholder="Sua senha"
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-[#2ECC71] hover:bg-[#27ae60] text-white font-bold rounded-xl transition disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
