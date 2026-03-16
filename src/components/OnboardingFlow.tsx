import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { OnboardingData } from '../services/nutritionistAgentService';
import { ProfileService } from '../services/profileService';

// Steps
import WelcomeStep from './onboarding/WelcomeStep';
import BasicInfoStep from './onboarding/BasicInfoStep';
import AnthropometryStep from './onboarding/AnthropometryStep';
import GoalSelectionStep from './onboarding/GoalSelectionStep';
import BiotypeStep from './onboarding/BiotypeStep';
import ActivityStep from './onboarding/ActivityStep';
import NutritionStep from './onboarding/NutritionStep';
import WellnessStep from './onboarding/WellnessStep';
import SummaryStep from './onboarding/SummaryStep';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({});
  const [loading, setLoading] = useState(false);

  const updateData = (newData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const nextStep = () => {
    setCurrentStep((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinish = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Map onboarding goal to profile goal
      let profileGoal: 'aesthetic' | 'health' | 'performance' = 'health';
      if (data.mainGoal === 'emagrecimento') profileGoal = 'aesthetic';
      else if (data.mainGoal === 'ganho_massa' || data.mainGoal === 'performance') profileGoal = 'performance';
      else if (data.mainGoal === 'saude') profileGoal = 'health';

      // Map intensity/frequency to activity_level
      let activityLevel: 'sedentary' | 'moderate' | 'intense' = 'sedentary';
      if (data.weeklyFrequency && data.weeklyFrequency > 0) {
        if (data.weeklyFrequency >= 5 || data.intensity === 'alta') {
          activityLevel = 'intense';
        } else if (data.weeklyFrequency >= 3 || data.intensity === 'moderada') {
          activityLevel = 'moderate';
        }
      }

      // Map biological sex to gender
      const gender = data.biologicalSex === 'M' ? 'male' : data.biologicalSex === 'F' ? 'female' : undefined;

      // Calculate targets if we have all required data
      let targets = {};
      if (data.weight && data.height && data.age && gender && data.biotype) {
        targets = ProfileService.calculateTargets(
          data.weight,
          data.height,
          data.age,
          gender,
          activityLevel,
          profileGoal,
          data.biotype
        );
      }

      // Update profile with onboarding data
      await ProfileService.updateProfile(user.id, {
        display_name: data.fullName,
        goal: profileGoal,
        biotype: data.biotype,
        activity_level: activityLevel,
        weight: data.weight,
        height: data.height,
        age: data.age,
        gender,
        ...(data.bodyFatPercentage && { body_fat: data.bodyFatPercentage }),
        ...(targets && {
          target_calories: (targets as any).calories,
          target_protein: (targets as any).protein,
          target_carbs: (targets as any).carbs,
          target_fats: (targets as any).fats,
        }),
      });

      // Complete onboarding
      onComplete();
    } catch (error) {
      console.error('Error finishing onboarding:', error);
      alert('Erro ao finalizar onboarding. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-nura-bg dark:bg-background-dark">
        <div className="w-16 h-16 border-4 border-nura-petrol dark:border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold text-nura-main dark:text-white">
          Criando seu plano personalizado...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {currentStep === 0 && <WelcomeStep onNext={nextStep} />}

      {currentStep === 1 && (
        <BasicInfoStep
          fullName={data.fullName}
          birthDate={data.birthDate}
          biologicalSex={data.biologicalSex}
          onNext={(newData) => {
            updateData(newData);
            nextStep();
          }}
          onBack={prevStep}
        />
      )}

      {currentStep === 2 && (
        <AnthropometryStep
          height={data.height}
          weight={data.weight}
          bodyFatPercentage={data.bodyFatPercentage}
          onNext={(newData) => {
            updateData(newData);
            nextStep();
          }}
          onBack={prevStep}
        />
      )}

      {currentStep === 3 && (
        <GoalSelectionStep
          mainGoal={data.mainGoal}
          onNext={(newData) => {
            updateData(newData);
            nextStep();
          }}
          onBack={prevStep}
        />
      )}

      {currentStep === 4 && (
        <BiotypeStep
          biotype={data.biotype}
          onNext={(newData) => {
            updateData(newData);
            nextStep();
          }}
          onBack={prevStep}
        />
      )}

      {currentStep === 5 && (
        <ActivityStep
          activityTypes={data.activityTypes}
          weeklyFrequency={data.weeklyFrequency}
          intensity={data.intensity}
          onNext={(newData) => {
            updateData(newData);
            nextStep();
          }}
          onBack={prevStep}
        />
      )}

      {currentStep === 6 && (
        <NutritionStep
          restrictions={data.restrictions}
          preferences={data.preferences}
          currentRoutine={data.currentRoutine}
          onNext={(newData) => {
            updateData(newData);
            nextStep();
          }}
          onBack={prevStep}
        />
      )}

      {currentStep === 7 && (
        <WellnessStep
          intermittentFasting={data.intermittentFasting}
          gutHealth={data.gutHealth}
          energyLevel={data.energyLevel}
          sleepQuality={data.sleepQuality}
          stressLevel={data.stressLevel}
          onNext={(newData) => {
            updateData(newData);
            nextStep();
          }}
          onBack={prevStep}
        />
      )}

      {currentStep === 8 && (
        <SummaryStep
          data={data}
          onNext={handleFinish}
          onBack={prevStep}
          onEdit={goToStep}
        />
      )}
    </div>
  );
};

export default OnboardingFlow;
