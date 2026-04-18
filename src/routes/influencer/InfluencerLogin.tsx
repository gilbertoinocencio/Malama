// =====================================================
// Malama — Login do Influenciador
// =====================================================
// Redireciona para o login unificado do app principal.
// A detecção de influencer é feita automaticamente pelo
// OnboardingFlow via query direta ao banco.

import React, { useEffect } from 'react';

export const InfluencerLogin: React.FC = () => {
  useEffect(() => {
    window.location.replace('/');
  }, []);
  return null;
};
