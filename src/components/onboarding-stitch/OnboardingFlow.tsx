import React, { useState } from 'react';
import { StitchOnboardingData, OnboardingStep } from './types';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LocationAutoPermission } from '../../services/locationAutoPermission';

// Step Components
import ObjetivosPrincipaisStep from './steps/ObjetivosPrincipaisStep';
import MetodologiaStep from './steps/MetodologiaStep';
import ObjetivosAdicionaisStep from './steps/ObjetivosAdicionaisStep';
import IdadeStep from './steps/IdadeStep';
import GeneroStep from './steps/GeneroStep';
import AlturaEPesoStep from './steps/AlturaEPesoStep';
import NivelAtividadeStep from './steps/NivelAtividadeStep';
import ConheceJejumStep from './steps/ConheceJejumStep';
import BeneficiosJejumStep from './steps/BeneficiosJejumStep';
import EducaJejumStep from './steps/EducaJejumStep';
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
import NuraFlowStep from './steps/NuraFlowStep';
import HomeFeedStep from './steps/HomeFeedStep';

export const OnboardingFlow: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { user, refreshProfile } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [data, setData] = useState<StitchOnboardingData>({
    // Initialize with safe defaults to prevent null errors
    primary_goal: 'perder_peso',
    idade: 25,
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
        age: data.idade,
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

      // Re-fetch profile so AuthContext reflects onboarding_completed = true
      await refreshProfile();

      // Solicitar localização automaticamente no primeiro uso
      console.log('📍 Tentando obter localização automaticamente...');
      await LocationAutoPermission.requestAutoPermission(user.id, supabase);
    } catch (err) {
      console.error('Error finishing onboarding:', err);
    } finally {
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
        return <IdadeStep {...props} />;
      case OnboardingStep.GENERO:
        return <GeneroStep {...props} />;
      case OnboardingStep.ALTURA_PESO:
        return <AlturaEPesoStep {...props} />;
      case OnboardingStep.NIVEL_ATIVIDADE:
        return <NivelAtividadeStep {...props} />;
      case OnboardingStep.CONHECE_JEJUM:
        return <ConheceJejumStep {...props} />;
      case OnboardingStep.BENEFICIOS_JEJUM:
        return <BeneficiosJejumStep {...props} />;
      case OnboardingStep.EDUCA_JEJUM:
        return <EducaJejumStep {...props} />;
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
        return <NuraFlowStep {...props} />;
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

  return (
    <div className="w-full h-screen overflow-y-auto no-scrollbar">
      {renderStep()}
    </div>
  );
};
