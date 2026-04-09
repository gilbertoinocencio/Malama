// =====================================================
// NURA — Página de Convite para Influenciador
// =====================================================
// Link gerado pelo admin: /influencer/convite/:access_token
// Influencer clica → faz login automático → vai para onboarding

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { NuraLogo } from '../../components/NuraLogo';
import { Instagram } from 'lucide-react';

type InfluencerInfo = {
  id: string;
  name: string;
  email: string;
  instagram_handle: string | null;
  user_id: string;
};

export const InfluencerInvite: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [influencer, setInfluencer] = useState<InfluencerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }

    const fetchInfluencer = async () => {
      try {
        const { data, error: err } = await supabase
          .from('influencers')
          .select('id, name, email, instagram_handle, user_id')
          .eq('access_token', token)
          .eq('status', 'active')
          .single();

        if (err || !data) {
          setNotFound(true);
          return;
        }

        setInfluencer(data as InfluencerInfo);
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchInfluencer();
  }, [token]);

  const handleStart = async () => {
    if (!influencer) return;
    setProcessing(true);
    setError('');

    try {
      // Fazer login automático do influencer
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email: influencer.email,
        password: token, // Usa o access_token como senha temporária
      });

      if (signInError) {
        // Se falhar, tentar criar sessão manualmente
        // O influencer já tem conta auth criada pelo admin
        setError('Erro ao fazer login. Tente novamente ou contate o suporte.');
        setProcessing(false);
        return;
      }

      if (user) {
        // Login bem-sucedido — redirecionar para onboarding
        localStorage.setItem('nura_is_influencer_signup', 'true');
        window.location.replace('/influencer/onboarding');
      }
    } catch (err: any) {
      setError(err.message ?? 'Erro ao processar convite.');
      setProcessing(false);
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
        <h1 className="text-xl font-semibold text-white mt-4">Link inválido ou expirado</h1>
        <p className="text-gray-400 text-sm max-w-sm">
          Este link de convite não é válido. Entre em contato com o administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <NuraLogo size="lg" />
        </div>

        {/* Card de boas-vindas */}
        <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 mb-6 text-center">
          {/* Avatar placeholder */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2ECC71] to-[#27ae60] flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl font-bold">
              {influencer?.name.charAt(0).toUpperCase()}
            </span>
          </div>

          <h1 className="text-white font-bold text-2xl mb-2">
            Bem-vindo(a), {influencer?.name.split(' ')[0]}!
          </h1>

          {influencer?.instagram_handle && (
            <div className="inline-flex items-center gap-1.5 text-[#2ECC71] text-sm">
              <Instagram className="w-4 h-4" />
              {influencer.instagram_handle.startsWith('@')
                ? influencer.instagram_handle
                : `@${influencer.instagram_handle}`}
            </div>
          )}

          <p className="text-gray-400 text-sm mt-4">
            Sua conta de influenciador foi criada com sucesso!
          </p>
        </div>

        {/* Instruções */}
        <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-5 mb-6 space-y-3">
          <h2 className="text-white font-semibold text-sm mb-2">O que acontece agora:</h2>
          {[
            'Você será redirecionado para configurar seu perfil',
            'Defina seus objetivos e preferências',
            'Comece a usar o Nura gratuitamente como influenciador',
            'Depois, gere seu link de indicação para seus seguidores',
          ].map((item, i) => (
            <div key={item} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-[#2ECC71] mt-0.5 flex-shrink-0 font-bold">{i + 1}.</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={processing}
          className="w-full py-4 bg-[#2ECC71] hover:bg-[#27ae60] text-white font-bold rounded-xl text-base transition disabled:opacity-50"
        >
          {processing ? 'Preparando...' : 'Começar agora →'}
        </button>

        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mt-4 text-center">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
