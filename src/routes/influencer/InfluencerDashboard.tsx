// =====================================================
// NURA — Dashboard do Influenciador
// =====================================================

import React, { useEffect, useState } from 'react';
import { Copy, Check, DollarSign, TrendingUp, Clock, Eye, EyeOff, LogOut, Instagram } from 'lucide-react';
import { influencerService } from '../../services/doctorPortalService';
import type { Influencer } from '../../services/doctorPortalService';
import { supabase } from '../../services/supabase';
import { NuraLogo } from '../../components/NuraLogo';

type InfluencerData = Influencer & {
  pending_amount: number;
  total_referrals: number;
  total_earned: number;
};

export const InfluencerDashboard: React.FC = () => {
  const [influencer, setInfluencer] = useState<InfluencerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [copied, setCopied] = useState(false);

  // Alterar senha
  const [showChangePass, setShowChangePass] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setNotAuthorized(true); setLoading(false); return; }

      const data = await influencerService.getByUserId(user.id);
      if (!data) { setNotAuthorized(true); setLoading(false); return; }
      setInfluencer(data);
      setLoading(false);
    };
    load();
  }, []);

  const referralLink = influencer ? `${window.location.origin}/i/${influencer.referral_token}` : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPass.length < 8) { setPassMsg({ type: 'error', text: 'Mínimo 8 caracteres.' }); return; }
    if (newPass !== confirmPass) { setPassMsg({ type: 'error', text: 'As senhas não coincidem.' }); return; }
    setSavingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setSavingPass(false);
    if (error) { setPassMsg({ type: 'error', text: error.message }); }
    else {
      setPassMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
      setNewPass(''); setConfirmPass(''); setShowChangePass(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/influencer/login';
  };

  const fmtCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#2ECC71] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notAuthorized) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <NuraLogo size="md" />
        <p className="text-white font-semibold mt-4">Acesso não autorizado.</p>
        <a href="/influencer/login" className="text-[#2ECC71] text-sm hover:underline">Ir para o login</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <NuraLogo size="sm" />
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm hidden sm:block">{influencer?.name}</span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Saudação */}
        <div>
          <h1 className="text-white text-2xl font-bold">Olá, {influencer?.name.split(' ')[0]}!</h1>
          {influencer?.instagram_handle && (
            <a
              href={`https://instagram.com/${influencer.instagram_handle.replace('@', '')}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#2ECC71] text-sm mt-1 hover:underline"
            >
              <Instagram className="w-4 h-4" />
              {influencer.instagram_handle.startsWith('@') ? influencer.instagram_handle : `@${influencer.instagram_handle}`}
            </a>
          )}
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <TrendingUp className="w-5 h-5 text-[#2ECC71]" />, label: 'Indicações', value: influencer?.total_referrals.toString() ?? '0' },
            { icon: <Clock className="w-5 h-5 text-[#2ECC71]" />,       label: 'Pendente',   value: fmtCurrency(influencer?.pending_amount ?? 0) },
            { icon: <DollarSign className="w-5 h-5 text-[#2ECC71]" />,  label: 'Total ganho', value: fmtCurrency(influencer?.total_earned ?? 0) },
          ].map(({ icon, label, value }) => (
            <div key={label} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 text-center">
              <div className="flex justify-center mb-2">{icon}</div>
              <p className="text-white font-bold text-lg">{value}</p>
              <p className="text-gray-400 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Link de indicação */}
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-5">
          <p className="text-white font-semibold mb-1">Seu link de indicação</p>
          <p className="text-gray-400 text-sm mb-3">
            Compartilhe este link. A cada novo usuário cadastrado, você ganha{' '}
            <span className="text-[#2ECC71] font-semibold">{fmtCurrency(influencer?.commission_per_referral ?? 0)}</span>.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-300 truncate">
              {referralLink}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition whitespace-nowrap"
            >
              {copied ? <Check className="w-4 h-4 text-[#2ECC71]" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Alterar senha */}
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-white font-semibold">Alterar senha</p>
            <button
              onClick={() => setShowChangePass(v => !v)}
              className="text-[#2ECC71] text-sm hover:underline"
            >
              {showChangePass ? 'Cancelar' : 'Alterar'}
            </button>
          </div>

          {showChangePass && (
            <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Nova senha (mínimo 8 caracteres)"
                  className="w-full pr-10 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Confirmar nova senha"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
              />
              {passMsg && (
                <p className={`text-sm px-3 py-2 rounded-lg border ${
                  passMsg.type === 'success'
                    ? 'text-[#2ECC71] bg-green-400/10 border-green-400/20'
                    : 'text-red-400 bg-red-400/10 border-red-400/20'
                }`}>{passMsg.text}</p>
              )}
              <button
                type="submit" disabled={savingPass}
                className="w-full py-2.5 bg-[#2ECC71] hover:bg-[#27ae60] text-white font-semibold rounded-xl transition disabled:opacity-50"
              >
                {savingPass ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
