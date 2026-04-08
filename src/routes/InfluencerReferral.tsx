// =====================================================
// NURA — Página de Indicação de Influenciador
// =====================================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import { influencerService } from '../services/doctorPortalService';
import { NuraLogo } from '../components/NuraLogo';

type InfluencerPreview = {
  id: string;
  name: string;
  instagram_handle: string | null;
  commission_per_referral: number;
};

export const InfluencerReferral: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [influencer, setInfluencer] = useState<InfluencerPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    influencerService.getByToken(token).then(data => {
      if (!data) setNotFound(true);
      else setInfluencer(data as InfluencerPreview);
    }).finally(() => setLoading(false));
  }, [token]);

  const handleSignUp = () => {
    if (token) {
      localStorage.setItem('nura_influencer_token', token);
      localStorage.setItem('nura_acquisition_channel', 'influencer');
    }
    navigate('/cadastro');
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
          Este link de indicação não é válido. Peça ao influenciador um link atualizado.
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

        {/* Card do influenciador */}
        <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 mb-6 text-center">
          {/* Avatar placeholder */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2ECC71] to-[#27ae60] flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl font-bold">
              {influencer?.name.charAt(0).toUpperCase()}
            </span>
          </div>

          <p className="text-white font-bold text-xl">{influencer?.name}</p>

          {influencer?.instagram_handle && (
            <a
              href={`https://instagram.com/${influencer.instagram_handle.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#2ECC71] text-sm mt-1 hover:underline"
            >
              <Instagram className="w-4 h-4" />
              {influencer.instagram_handle.startsWith('@')
                ? influencer.instagram_handle
                : `@${influencer.instagram_handle}`}
            </a>
          )}

          <p className="text-gray-400 text-sm mt-4">
            te convidou para o <span className="text-white font-semibold">Nura</span>
          </p>
        </div>

        {/* Benefícios */}
        <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-5 mb-6 space-y-3">
          <h2 className="text-white font-semibold text-sm mb-2">O que você vai encontrar no Nura:</h2>
          {[
            'Acompanhamento nutricional com IA',
            'Registro de refeições por foto ou voz',
            'Metas personalizadas de calorias e macros',
            'Histórico de progresso e evolução',
            'Consultas com médicos especialistas',
          ].map(item => (
            <div key={item} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-[#2ECC71] mt-0.5 flex-shrink-0">✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleSignUp}
          className="w-full py-4 bg-[#2ECC71] hover:bg-[#27ae60] text-white font-bold rounded-xl text-base transition"
        >
          Criar minha conta gratuita
        </button>
        <p className="text-center text-gray-500 text-xs mt-3">
          Já tem conta?{' '}
          <a href="/login" className="text-[#2ECC71] hover:underline">Entrar</a>
        </p>
      </div>
    </div>
  );
};
