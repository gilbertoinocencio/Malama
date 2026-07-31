import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { MalamaLogo } from '../../components/MalamaLogo';

export const InfluencerSetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) setError('Link inválido ou expirado. Solicite um novo convite.');
      setReady(true);
    });
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 10) { setError('Use pelo menos 10 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    setSaving(true); setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    navigate('/influencer/dashboard', { replace: true });
  };

  if (!ready) return <div className="min-h-screen bg-[#0F0F0F]" />;
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-[#1A1A1A] border border-white/10 rounded-2xl p-8">
        <div className="flex justify-center mb-7"><MalamaLogo size="lg" /></div>
        <h1 className="text-white text-xl font-bold text-center">Defina sua senha</h1>
        <p className="text-gray-400 text-sm text-center mt-2 mb-6">Esta senha será usada no app Malama.</p>
        <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Nova senha" className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white mb-3" />
        <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="Confirme a senha" className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        <button type="submit" disabled={saving || !!error && !password}
          className="w-full py-3 mt-5 bg-[#2ECC71] text-white font-bold rounded-xl disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar senha'}
        </button>
      </form>
    </div>
  );
};
