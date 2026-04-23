import React, { useState, useEffect } from 'react';
import { StitchOnboardingData, OnboardingStep } from './types';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { influencerService } from '../../services/doctorPortalService';
import { LocationAutoPermission } from '../../services/locationAutoPermission';
import { NotificationService } from '../../services/notificationService';
import { WeightLogService } from '../../services/weightLogService';

// Step Components
import ObjetivosPrincipaisStep from './steps/ObjetivosPrincipaisStep';
import MetodologiaStep from './steps/MetodologiaStep';
import ObjetivosAdicionaisStep from './steps/ObjetivosAdicionaisStep';
import DataNascimentoStep from './steps/DataNascimentoStep';
import GeneroStep from './steps/GeneroStep';
import AlturaEPesoStep from './steps/AlturaEPesoStep';
import NivelAtividadeStep from './steps/NivelAtividadeStep';

import JanelaAlimentarStep from './steps/JanelaAlimentarStep';
import RefeicoesDiariasStep from './steps/RefeicoesDiariasStep';
import LocalRefeicoesStep from './steps/LocalRefeicoesStep';
import TipoDietaStep from './steps/TipoDietaStep';
import RestricoesAlimentaresStep from './steps/RestricoesAlimentaresStep';
import ConsumoAguaStep from './steps/ConsumoAguaStep';
import ImpactoAguaStep from './steps/ImpactoAguaStep';
import EducaHidratacaoStep from './steps/EducaHidratacaoStep';
import MudancaHabitosStep from './steps/MudancaHabitosStep';
import ResumoIMCStep from './steps/ResumoIMCStep';
import PesoObjetivoStep from './steps/PesoObjetivoStep';
import VelocidadeMetaStep from './steps/VelocidadeMetaStep';
import ConfirmacaoMetasStep from './steps/ConfirmacaoMetasStep';
import ProjecaoSucessoStep from './steps/ProjecaoSucessoStep';
import ProvaSucessoStep from './steps/ProvaSucessoStep';
import LembretesRotinaStep from './steps/LembretesRotinaStep';
import CriandoPlanoStep from './steps/CriandoPlanoStep';
import PlanoPersonalizadoStep from './steps/PlanoPersonalizadoStep';
import RecomendacaoMacrosStep from './steps/RecomendacaoMacrosStep';
import VantagensPremiumStep from './steps/VantagensPremiumStep';
import AssinaturasStep from './steps/AssinaturasStep';
import ExperienciaCaloriasStep from './steps/ExperienciaCaloriasStep';
import MalamaFlowStep from './steps/MalamaFlowStep';
import HomeFeedStep from './steps/HomeFeedStep';

export const OnboardingFlow: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { user, refreshProfile } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isInfluencer, setIsInfluencer] = useState(() => {
    // Verifica localStorage como fallback imediato (antes da query ao banco)
    const flag = localStorage.getItem('Malama_is_influencer_signup') === 'true';
    console.log('🟢 [OnboardingFlow] Verificação inicial - Flag localStorage:', flag);
    return flag;
  });

  // Consulta direta ao banco — mais confiável que o influencerRecord do contexto
  // (que pode estar desatualizado por race condition na ativação da conta)
  useEffect(() => {
    if (!user) return;

    console.log('🟢 [OnboardingFlow] Verificando se é influencer para user:', user.id);
    console.log('🟢 [OnboardingFlow] Flag atual no localStorage:', localStorage.getItem('Malama_is_influencer_signup'));

    influencerService.getByUserId(user.id).then(data => {
      const isInf = !!data;
      console.log('🟢 [OnboardingFlow] Query ao banco - É influencer?', isInf);
      if (isInf) {
        setIsInfluencer(true);
        console.log('🟢 [OnboardingFlow] Limpando flag localStorage (já confirmado pelo banco)');
        localStorage.removeItem('Malama_is_influencer_signup');
      } else {
        // Banco retornou null — verificar localStorage antes de sobrescrever
        // (race condition: activateAccount pode não ter propagado ainda)
        const flagSet = localStorage.getItem('Malama_is_influencer_signup') === 'true';
        if (!flagSet) {
          console.log('🔴 [OnboardingFlow] Definindo isInfluencer=false (sem registro no banco e sem flag)');
          setIsInfluencer(false);
        } else {
          console.log('🟡 [OnboardingFlow] Banco retornou null mas flag está presente — mantendo isInfluencer=true');
        }
      }
    }).catch((err) => {
      console.error('🔴 [OnboardingFlow] Erro na query ao banco:', err);
      // Se não encontrou no banco mas a flag está setada, mantém como influencer
      // (pode ser race condition - o registro ainda não foi criado)
      if (localStorage.getItem('Malama_is_influencer_signup') === 'true') {
        console.log('🟡 [OnboardingFlow] Mantendo isInfluencer=true (flag no localStorage, race condition)');
        setIsInfluencer(true);
      } else {
        console.log('🔴 [OnboardingFlow] Definindo isInfluencer=false');
        setIsInfluencer(false);
      }
    });
  }, [user?.id]);

  const [data, setData] = useState<StitchOnboardingData>({
    // Initialize with safe defaults to prevent null errors
    primary_goal: 'perder_peso',
    dataNascimento: '1998-01-01',
    genero: 'masculino',
    altura: 170,
    peso: 70,
    pesoObjetivo: 65,
    nivelAtividade: 'moderado',
    additionalGoals: [],
    dietaryRestrictions: [],
    habitsToChange: []
  });

  const steps = Object.values(OnboardingStep);
  const currentStep = steps[currentStepIndex];

  const updateData = (newData: Partial<StitchOnboardingData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  const handleNext = async () => {
    const nextStep = steps[currentStepIndex + 1];

    console.log('🟢 [OnboardingFlow] handleNext - currentStep:', currentStep, 'nextStep:', nextStep, 'isInfluencer:', isInfluencer);

    // Influencers não pagam — pular telas de premium/planos e encerrar o onboarding
    if (isInfluencer && nextStep === OnboardingStep.VANTAGENS_PREMIUM) {
      console.log('✅ [OnboardingFlow] Influencer detectado! Pulando telas de premium e finalizando onboarding...');
      await finishOnboarding();
      return;
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      await finishOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const finishOnboarding = async () => {
    if (!user) return;
    setIsFinishing(true);
    try {
      const activityMap: Record<string, string> = {
        sedentario: 'sedentary',
        leve: 'sedentary',
        moderado: 'moderate',
        muito_ativo: 'intense',
      };

      // Parse eating window from reminderSchedule (format: "08:30 - 20:00")
      let eatingWindowStart = '08:00';
      let eatingWindowEnd = '20:00';
      if (data.reminderSchedule) {
        const [start, end] = data.reminderSchedule.split(' - ');
        eatingWindowStart = start || '08:00';
        eatingWindowEnd = end || '20:00';
      } else if (data.eatingWindowStart && data.eatingWindowEnd) {
        eatingWindowStart = data.eatingWindowStart;
        eatingWindowEnd = data.eatingWindowEnd;
      }

      await supabase.from('profiles').upsert({
        id: user.id,
        date_of_birth: data.dataNascimento,
        gender: data.genero,
        height: data.altura,
        weight: data.peso,
        activity_level: activityMap[data.nivelAtividade ?? ''] ?? 'moderate',
        meals_per_day: data.mealsPerDay || 3,
        eating_window_start: eatingWindowStart,
        eating_window_end: eatingWindowEnd,
        dietary_restrictions: data.dietaryRestrictions || [],
        dietary_restrictions_detail: data.restrictionsDetail || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });

      // Seed initial weight_logs entry so MetricsChart has a starting point
      if (data.peso) {
        await WeightLogService.logWeight(
          user.id, data.peso, 'manual', 'Peso inicial'
        ).catch(() => {}); // non-fatal
      }

      // Re-fetch profile so AuthContext reflects onboarding_completed = true
      // Adiciona delay para garantir que o Supabase propagou a mudança
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshProfile();

      // Verifica se o profile foi atualizado corretamente
      // Se não, tenta mais uma vez
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: profileCheck } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (!profileCheck?.onboarding_completed) {
          // Última tentativa
          await new Promise(resolve => setTimeout(resolve, 1000));
          await refreshProfile();
        }
      }

      // Solicitar permissões de forma NÃO bloqueante
      // O app continua funcionando mesmo se o usuário negar

      // Delay pequeno para não sobrecarregar o navegador com múltiplos popups
      setTimeout(async () => {
        try {
          console.log('📍 Solicitando localização (opcional)...');
          await LocationAutoPermission.requestAutoPermission(user.id, supabase);
        } catch (err) {
          console.log('📍 Localização não solicitada ou negada - app continua normalmente');
        }
      }, 1000);

      setTimeout(async () => {
        try {
          console.log('🔔 Solicitando notificações (opcional)...');
          await NotificationService.requestPermission();
        } catch (err) {
          console.log('🔔 Notificações não solicitadas ou negadas - app continua normalmente');
        }
      }, 2000);
    } catch (err) {
      console.error('Error finishing onboarding:', err);
    } finally {
      // Limpa flag de influencer do localStorage
      localStorage.removeItem('Malama_is_influencer_signup');

      // Sempre completa o onboarding, independente das permissões
      onComplete();
    }
  };

  // Helper to render the current step
  const renderStep = () => {
    const props = {
      data,
      updateData,
      onNext: handleNext,
      onBack: handleBack,
      currentStep: currentStepIndex + 1,
      totalSteps: steps.length
    };

    switch (currentStep) {
      case OnboardingStep.OBJETIVOS_PRINCIPAIS:
        return <ObjetivosPrincipaisStep {...props} />;
      case OnboardingStep.METODOLOGIA:
        return <MetodologiaStep {...props} />;
      case OnboardingStep.OBJETIVOS:
        return <ObjetivosAdicionaisStep {...props} />;
      case OnboardingStep.IDADE:
        return <DataNascimentoStep {...props} />;
      case OnboardingStep.GENERO:
        return <GeneroStep {...props} />;
      case OnboardingStep.ALTURA_PESO:
        return <AlturaEPesoStep {...props} />;
      case OnboardingStep.NIVEL_ATIVIDADE:
        return <NivelAtividadeStep {...props} />;

      case OnboardingStep.JANELA_ALIMENTAR:
        return <JanelaAlimentarStep {...props} />;
      case OnboardingStep.REFEICOES_DIARIAS:
        return <RefeicoesDiariasStep {...props} />;
      case OnboardingStep.LOCAL_REFEICOES:
        return <LocalRefeicoesStep {...props} />;
      case OnboardingStep.TIPO_DIETA:
        return <TipoDietaStep {...props} />;
      case OnboardingStep.RESTRIÇÕES:
        return <RestricoesAlimentaresStep {...props} />;
      case OnboardingStep.CONSUMO_AGUA:
        return <ConsumoAguaStep {...props} />;
      case OnboardingStep.IMPACTO_AGUA:
        return <ImpactoAguaStep {...props} />;
      case OnboardingStep.EDUCA_HIDRATACAO:
        return <EducaHidratacaoStep {...props} />;
      case OnboardingStep.MUDANCA_HABITOS:
        return <MudancaHabitosStep {...props} />;
      case OnboardingStep.RESUMO_IMC:
        return <ResumoIMCStep {...props} />;
      case OnboardingStep.PESO_OBJETIVO:
        return <PesoObjetivoStep {...props} />;
      case OnboardingStep.VELOCIDADE_META:
        return <VelocidadeMetaStep {...props} />;
      case OnboardingStep.CONFIRMACAO_METAS:
        return <ConfirmacaoMetasStep {...props} />;
      case OnboardingStep.PROJECAO_SUCESSO:
        return <ProjecaoSucessoStep {...props} />;
      case OnboardingStep.PROVA_SUCESSO:
        return <ProvaSucessoStep {...props} />;
      case OnboardingStep.LEMBRETES_ROTINA:
        return <LembretesRotinaStep {...props} />;
      case OnboardingStep.CRIANDO_PLANO:
        return <CriandoPlanoStep {...props} />;
      case OnboardingStep.PLANO_PERSONALIZADO:
        return <PlanoPersonalizadoStep {...props} />;
      case OnboardingStep.RECOMENDACAO_MACROS:
        return <RecomendacaoMacrosStep {...props} />;
      case OnboardingStep.VANTAGENS_PREMIUM:
        return <VantagensPremiumStep {...props} />;
      case OnboardingStep.ASSINATURAS:
        return <AssinaturasStep {...props} />;
      case OnboardingStep.EXPERIENCIA_CALORIAS:
        return <ExperienciaCaloriasStep {...props} />;
      case OnboardingStep.FLOW:
        return <MalamaFlowStep {...props} />;
      case OnboardingStep.HOME_FEED:
        return <HomeFeedStep {...props} />;
      default:
        return (
          <div className="text-center p-12">
            <h2 className="text-2xl font-bold mb-4">Em breve: {currentStep}</h2>
            <button onClick={handleNext} className="bg-tertiary text-white p-4 rounded-xl">Continuar</button>
          </div>
        );
    }
  };

  if (isFinishing) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-surface">
        <div className="w-10 h-10 rounded-full border-4 border-secondary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-y-auto no-scrollbar">
      {renderStep()}
    </div>
  );
};
