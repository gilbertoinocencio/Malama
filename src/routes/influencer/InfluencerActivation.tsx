// =====================================================
// NURA — Ativação de Conta do Influenciador
// =====================================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { influencerService } from '../../services/doctorPortalService';
import { supabase } from '../../services/supabase';
import { NuraLogo } from '../../components/NuraLogo';
import { useAuth } from '../../contexts/AuthContext';

export const InfluencerActivation: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { refreshInfluencerRecord } = useAuth();

  const [influencer, setInfluencer] = useState<{ id: string; name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    influencerService.getBySetupToken(token).then(data => {
      if (!data) setNotFound(true);
      else setInfluencer(data);
    }).finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    if (!influencer || !token) return;

    setSaving(true);
    try {
      let userId: string | undefined;

      // 1. Tentar criar conta nova
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: influencer.email,
        password,
      });

      if (signUpErr) {
        // Se o e-mail já existe, tentar login com a senha informada
        const alreadyExists =
          signUpErr.message.toLowerCase().includes('already registered') ||
          signUpErr.message.toLowerCase().includes('already been registered') ||
          signUpErr.status === 422;

        if (alreadyExists) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: influencer.email,
            password,
          });
          if (signInErr) {
            setError('Este e-mail já possui uma conta. Verifique a senha e tente novamente.');
            setSaving(false);
            return;
          }
          userId = signInData.user?.id;
        } else {
          throw signUpErr;
        }
      } else {
        userId = signUpData.user?.id;
      }

      if (!userId) throw new Error('Não foi possível obter o usuário.');

      // 2. Vincular user_id ao influenciador e invalidar setup_token
      await influencerService.activateAccount(token, userId);

      // 3. Atualizar influencerRecord no contexto (evita race condition com onAuthStateChange)
      await refreshInfluencerRecord();

      // 4. Setar flag para garantir que o OnboardingFlow detecte como influencer
      // (essencial para pular telas de planos premium)
      localStorage.setItem('nura_is_influencer_signup', 'true');

      // 5. Ir para o onboarding via rota dedicada
      window.location.replace('/influencer/onboarding');
    } catch (err: any) {
      setError(err.message ?? 'Erro ao ativar conta. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="w-8 h-8 rounded-full border-4 border-[#2ECC71] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0F0F0F] p-6 text-center">
        <NuraLogo size="md" />
        <h1 className="text-xl font-semibold text-white mt-4">Link inválido ou já utilizado</h1>
        <p className="text-gray-400 text-sm max-w-sm">
          Este link de ativação não é válido ou já foi usado. Entre em contato com o time Nura.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <NuraLogo size="lg" />
        </div>

        <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#2ECC71]/20 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7 text-[#2ECC71]" />
            </div>
            <h1 className="text-white text-xl font-bold">Bem-vindo(a), {influencer?.name.split(' ')[0]}!</h1>
            <p className="text-gray-400 text-sm mt-1">
              Crie ou confirme sua senha para acessar o painel.
            </p>
          </div>

          {/* E-mail (somente leitura) */}
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-1">E-mail</label>
            <div className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm">
              {influencer?.email}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nova senha */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Senha *</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full pr-10 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar senha */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Confirmar senha *</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita sua senha"
                  className="w-full pr-10 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || !password || !confirm}
              className="w-full py-3 bg-[#2ECC71] hover:bg-[#27ae60] text-white font-bold rounded-xl transition disabled:opacity-50 mt-2"
            >
              {saving ? 'Ativando conta...' : 'Ativar minha conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
