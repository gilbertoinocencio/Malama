import React, { useState } from 'react';
import { StitchOnboardingData, OnboardingStep } from './types';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Step Components (to be implemented)
import MetodologiaStep from './steps/MetodologiaStep';
import ObjetivosAdicionaisStep from './steps/ObjetivosAdicionaisStep';
import ConheceJejumStep from './steps/ConheceJejumStep';
import BeneficiosJejumStep from './steps/BeneficiosJejumStep';
import EducaJejumStep from './steps/EducaJejumStep';
import JanelaAlimentarStep from './steps/JanelaAlimentarStep';
import RefeicoesDiariasStep from './steps/RefeicoesDiariasStep';
import LocalRefeicoesStep from './steps/LocalRefeicoesStep';
import TipoDietaStep from './steps/TipoDietaStep';
import RestricoesAlimentaresStep from './steps/RestricoesAlimentaresStep';
import ConsumoAguaStep from './steps/ConsumoAguaStep';
import EducaHidratacaoStep from './steps/EducaHidratacaoStep';
import MudancaHabitosStep from './steps/MudancaHabitosStep';
import ResumoBiometricoStep from './steps/ResumoBiometricoStep';
import PesoObjetivoStep from './steps/PesoObjetivoStep';
import VelocidadeMetaStep from './steps/VelocidadeMetaStep';
import ProjecaoSucessoStep from './steps/ProjecaoSucessoStep';
import ProvaSucessoStep from './steps/ProvaSucessoStep';
import LembretesRotinaStep from './steps/LembretesRotinaStep';
import CriandoPlanoStep from './steps/CriandoPlanoStep';
import PlanoPersonalizadoStep from './steps/PlanoPersonalizadoStep';
import ExperienciaCaloriasStep from './steps/ExperienciaCaloriasStep';
import NuraFlowStep from './steps/NuraFlowStep';
import HomeFeedStep from './steps/HomeFeedStep';

export const OnboardingFlow: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { user } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [data, setData] = useState<StitchOnboardingData>({});

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
      const { error } = await supabase
        .from('profiles')
        .update({
          ...data,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      onComplete();
    } catch (err) {
      console.error('Error finishing onboarding:', err);
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
      case OnboardingStep.METODOLOGIA:
        return <MetodologiaStep {...props} />;
      case OnboardingStep.OBJETIVOS:
        return <ObjetivosAdicionaisStep {...props} />;
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
      case OnboardingStep.EDUCA_HIDRATACAO:
        return <EducaHidratacaoStep {...props} />;
      case OnboardingStep.MUDANCA_HABITOS:
        return <MudancaHabitosStep {...props} />;
      case OnboardingStep.RESUMO_BIOMÉTRICO:
        return <ResumoBiometricoStep {...props} />;
      case OnboardingStep.PESO_OBJETIVO:
        return <PesoObjetivoStep {...props} />;
      case OnboardingStep.VELOCIDADE_META:
        return <VelocidadeMetaStep {...props} />;
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
      case OnboardingStep.EXPERIENCIA_CALORIAS:
        return <ExperienciaCaloriasStep {...props} />;
      case OnboardingStep.FLOW:
        return <NuraFlowStep {...props} />;
      case OnboardingStep.HOME_FEED:
        return <HomeFeedStep {...props} />;
      // ... other cases will be added
      default:
        return (
          <div className="text-center p-12">
            <h2 className="text-2xl font-bold mb-4">Em breve: {currentStep}</h2>
            <button onClick={handleNext} className="bg-primary text-white p-4 rounded-xl">Continuar</button>
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
