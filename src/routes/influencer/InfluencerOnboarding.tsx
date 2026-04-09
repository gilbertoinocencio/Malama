// =====================================================
// NURA — Onboarding dedicado para Influenciadores
// =====================================================
// Esta rota garante que o influencer faça o onboarding
// imediatamente após criar sua conta, sem passar pela tela de login.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { NuraLogo } from '../../components/NuraLogo';
import { useAuth } from '../../contexts/AuthContext';

export const InfluencerOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshProfile, refreshInfluencerRecord, influencerRecord } = useAuth();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const checkAndPrepare = async () => {
      try {
        // 1. Verificar se já existe sessão ativa
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          // Não há sessão - o influencer ainda não fez login
          // O token já está no localStorage (salvo pelo InfluencerReferral)
          // Redirecionar para login com signup
          navigate('/entrar?signup=true');
          return;
        }

        // 2. Aguardar um pouco para garantir que o influencerRecord foi carregado
        // Race condition: o signup pode ter acabado de criar o user_id no banco
        let attempts = 0;
        const maxAttempts = 5;

        const checkInfluencerStatus = async (): Promise<boolean> => {
          // Força refresh do registro de influencer
          await refreshInfluencerRecord();

          // Verifica se o usuário é influencer
          if (influencerRecord) {
            return true;
          }

          // Se não encontrou, tenta uma query direta (fallback)
          const { influencerService } = await import('../../services/doctorPortalService');
          const directCheck = await influencerService.getByUserId(session.user.id);

          if (directCheck) {
            // Atualiza o contexto com o resultado
            await refreshInfluencerRecord();
            return true;
          }

          return false;
        };

        while (attempts < maxAttempts) {
          const isInfluencer = await checkInfluencerStatus();

          if (isInfluencer) {
            break; // Encontrou!
          }

          // Se não encontrou, espera um pouco e tenta de novo
          attempts++;
          setRetryCount(attempts);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // 3. Se chegou aqui, o App.tsx vai detectar onboarding_completed = false
        // e mostrar o OnboardingFlow automaticamente
        // Redirecionar para a rota principal (não-portal)
        window.location.replace('/');
      } catch (err: any) {
        console.error('Erro ao preparar onboarding:', err);
        setError(err.message ?? 'Erro ao preparar onboarding. Tente novamente.');
      } finally {
        setChecking(false);
      }
    };

    checkAndPrepare();
  }, [navigate, refreshProfile, refreshInfluencerRecord, influencerRecord]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-10">
            <NuraLogo size="lg" />
          </div>
          <div className="w-8 h-8 rounded-full border-4 border-[#2ECC71] border-t-transparent animate-spin mx-auto" />
          <p className="text-gray-400 text-sm mt-4">Preparando seu onboarding...</p>
          {retryCount > 0 && (
            <p className="text-gray-500 text-xs mt-2">Verificando dados ({retryCount}/5)</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0F0F0F] p-6 text-center">
        <NuraLogo size="md" />
        <h1 className="text-xl font-semibold text-white mt-4">Erro ao preparar onboarding</h1>
        <p className="text-gray-400 text-sm max-w-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-[#2ECC71] hover:bg-[#27ae60] text-white font-bold rounded-xl transition mt-4"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return null;
};
