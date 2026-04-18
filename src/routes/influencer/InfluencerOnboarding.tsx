// =====================================================
// Malama — Rota de onboarding do influenciador
// =====================================================
// Garante que o influencer tenha sessão e redireciona
// para o app principal onde o OnboardingFlow detecta
// o flag Malama_is_influencer_signup e pula assinaturas.

import React, { useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { MalamaLogo } from '../../components/MalamaLogo';

export const InfluencerOnboarding: React.FC = () => {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.replace('/influencer/login');
        return;
      }
      localStorage.setItem('Malama_is_influencer_signup', 'true');
      window.location.replace('/');
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
      <div className="text-center">
        <div className="flex justify-center mb-10">
          <MalamaLogo size="lg" />
        </div>
        <div className="w-8 h-8 rounded-full border-4 border-[#2ECC71] border-t-transparent animate-spin mx-auto" />
        <p className="text-gray-400 text-sm mt-4">Preparando seu onboarding...</p>
      </div>
    </div>
  );
};
