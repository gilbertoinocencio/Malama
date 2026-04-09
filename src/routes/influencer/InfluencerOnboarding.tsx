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
        console.log('🔵 [InfluencerOnboarding] Iniciando verificação...');

        // 1. Verificar se já existe sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔵 [InfluencerOnboarding] Sessão:', session ? 'ATIVA' : 'NÃO EXISTE');

        if (!session) {
          // Não há sessão - redirecionar para login
          console.log('🔴 [InfluencerOnboarding] Sem sessão, redirecionando para /influencer/login');
          navigate('/influencer/login');
          return;
        }

        console.log('🔵 [InfluencerOnboarding] Usuário logado:', session.user.id);
        console.log('🔵 [InfluencerOnboarding] influencerRecord atual:', influencerRecord);
        console.log('🔵 [InfluencerOnboarding] Flag localStorage:', localStorage.getItem('nura_is_influencer_signup'));

        // 2. Aguardar um pouco para garantir que o influencerRecord foi carregado
        // Race condition: o signup pode ter acabado de criar o user_id no banco
        let attempts = 0;
        const maxAttempts = 5;

        const checkInfluencerStatus = async (): Promise<boolean> => {
          console.log(`🔵 [InfluencerOnboarding] Tentativa ${attempts + 1}/${maxAttempts} - Verificando status de influencer...`);

          // Força refresh do registro de influencer
          await refreshInfluencerRecord();

          // Verifica se o usuário é influencer
          if (influencerRecord) {
            console.log('✅ [InfluencerOnboarding] É influencer (via influencerRecord do contexto)');
            // Garante que a flag esteja setada para o OnboardingFlow
            localStorage.setItem('nura_is_influencer_signup', 'true');
            return true;
          }

          // Se não encontrou, tenta uma query direta (fallback)
          const { influencerService } = await import('../../services/doctorPortalService');
          const directCheck = await influencerService.getByUserId(session.user.id);
          console.log('🔵 [InfluencerOnboarding] Query direta no banco:', directCheck ? 'ENCONTRADO' : 'NÃO ENCONTRADO');

          if (directCheck) {
            console.log('✅ [InfluencerOnboarding] É influencer (via query direta)');
            // Atualiza o contexto com o resultado
            await refreshInfluencerRecord();
            // Garante que a flag esteja setada para o OnboardingFlow
            localStorage.setItem('nura_is_influencer_signup', 'true');
            return true;
          }

          console.log('❌ [InfluencerOnboarding] NÃO é influencer');
          return false;
        };

        while (attempts < maxAttempts) {
          const isInfluencer = await checkInfluencerStatus();

          if (isInfluencer) {
            console.log('✅ [InfluencerOnboarding] Confirmado como influencer!');
            break; // Encontrou!
          }

          // Se não encontrou, espera um pouco e tenta de novo
          attempts++;
          setRetryCount(attempts);
          if (attempts < maxAttempts) {
            console.log(`⏳ [InfluencerOnboarding] Aguardando 500ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // 3. Verificar status final
        const finalFlag = localStorage.getItem('nura_is_influencer_signup');
        console.log('🔵 [InfluencerOnboarding] Flag final no localStorage:', finalFlag);
        console.log('🔵 [InfluencerOnboarding] Redirecionando para / (app principal)');

        // 4. Se chegou aqui, o App.tsx vai detectar onboarding_completed = false
        // e mostrar o OnboardingFlow automaticamente
        // Redirecionar para a rota principal (não-portal)
        window.location.replace('/');
      } catch (err: any) {
        console.error('🔴 [InfluencerOnboarding] Erro ao preparar onboarding:', err);
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
