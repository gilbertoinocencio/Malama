// =====================================================
// NURA — Onboarding dedicado para Influenciadores
// =====================================================
// Renderiza o OnboardingFlow diretamente no contexto do portal,
// pulando as telas de planos de assinatura (isInfluencer=true).

import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { NuraLogo } from '../../components/NuraLogo';
import { OnboardingFlow } from '../../components/onboarding-stitch/OnboardingFlow';

export const InfluencerOnboarding: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'ready' | 'no-session'>('checking');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setStatus('no-session');
        return;
      }
      // Sinaliza ao OnboardingFlow que este é um influencer (pula etapas de assinatura)
      localStorage.setItem('nura_is_influencer_signup', 'true');
      setStatus('ready');
    });
  }, []);

  if (status === 'no-session') {
    window.location.replace('/influencer/login');
    return null;
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="text-center">
          <div className="flex justify-center mb-10">
            <NuraLogo size="lg" />
          </div>
          <div className="w-8 h-8 rounded-full border-4 border-[#2ECC71] border-t-transparent animate-spin mx-auto" />
          <p className="text-gray-400 text-sm mt-4">Preparando seu onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <OnboardingFlow
      onComplete={() => window.location.replace('/influencer/dashboard')}
    />
  );
};
