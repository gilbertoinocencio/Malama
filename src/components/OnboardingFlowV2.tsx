import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ProfileService } from '../services/profileService';

// Steps
import { WelcomeScreen } from './onboarding-v2/WelcomeScreen';
import { NameStep } from './onboarding-v2/NameStep';
import { GoalStep } from './onboarding-v2/GoalStep';
import { MeasurementsStep } from './onboarding-v2/MeasurementsStep';
import { BiotypeStep } from './onboarding-v2/BiotypeStep';
import {
  ActivityLevelStep,
  RestrictionsStep,
  CalculatingStep
} from './onboarding-v2/RemainingSteps';

interface OnboardingFlowV2Props {
  onComplete: () => void;
}

interface OnboardingData {
  fullName?: string;
  mainGoal?: string;
  weight?: number;
  height?: number;
  age?: number;
  biologicalSex?: 'M' | 'F';
  biotype?: 'ecto' | 'meso' | 'endo';
  weeklyFrequency?: number;
  intensity?: string;
  restrictions?: string[];
}

export const OnboardingFlowV2: React.FC<OnboardingFlowV2Props> = ({ onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({});
  const [isCalculating, setIsCalculating] = useState(false);

  const goNext = () => setCurrentStep((prev) => prev + 1);
  const goBack = () => setCurrentStep((prev) => Math.max(0, prev - 1));

  const updateData = (newData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const handleFinish = async () => {
    if (!user) return;

    setIsCalculating(true);
    setCurrentStep(7); // Show calculating screen

    try {
      // Map goal
      let profileGoal: 'aesthetic' | 'health' | 'performance' = 'health';
      if (data.mainGoal === 'emagrecimento') profileGoal = 'aesthetic';
      else if (data.mainGoal === 'ganho_massa' || data.mainGoal === 'performance')
        profileGoal = 'performance';

      // Map activity level
      let activityLevel: 'sedentary' | 'moderate' | 'intense' = 'sedentary';
      if (data.weeklyFrequency && data.weeklyFrequency > 0) {
        if (data.weeklyFrequency >= 5 || data.intensity === 'alta') {
          activityLevel = 'intense';
        } else if (data.weeklyFrequency >= 3) {
          activityLevel = 'moderate';
        }
      }

      const gender = data.biologicalSex === 'M' ? 'male' : 'female';

      // Calculate targets
      let targets = {};
      if (data.weight && data.height && data.age && data.biotype) {
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

      // Update profile
      await ProfileService.updateProfile(user.id, {
        display_name: data.fullName,
        goal: profileGoal,
        biotype: data.biotype,
        activity_level: activityLevel,
        weight: data.weight,
        height: data.height,
        age: data.age,
        gender,
        ...(targets && {
          target_calories: (targets as any).calories,
          target_protein: (targets as any).protein,
          target_carbs: (targets as any).carbs,
          target_fats: (targets as any).fats
        })
      });

      // Wait a bit to show the calculating animation
      setTimeout(() => {
        console.log('✅ Onboarding V2 completed!');
        onComplete();
      }, 3000);
    } catch (error) {
      console.error('❌ Onboarding save failed:', error);
      setIsCalculating(false);
      alert('Erro ao salvar dados. Tente novamente.');
    }
  };

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeScreen onStart={goNext} />;

      case 1:
        return (
          <NameStep
            onNext={(name) => {
              updateData({ fullName: name });
              goNext();
            }}
            onBack={goBack}
            initialValue={data.fullName}
          />
        );

      case 2:
        return (
          <GoalStep
            onNext={(goal) => {
              updateData({ mainGoal: goal });
              goNext();
            }}
            onBack={goBack}
            initialValue={data.mainGoal}
          />
        );

      case 3:
        return (
          <MeasurementsStep
            onNext={(measurements) => {
              updateData({
                weight: measurements.weight,
                height: measurements.height,
                age: measurements.age,
                biologicalSex: measurements.gender
              });
              goNext();
            }}
            onBack={goBack}
            initialValue={{
              weight: data.weight,
              height: data.height,
              age: data.age,
              gender: data.biologicalSex
            }}
          />
        );

      case 4:
        return (
          <BiotypeStep
            onNext={(biotype) => {
              updateData({ biotype: biotype as 'ecto' | 'meso' | 'endo' });
              goNext();
            }}
            onBack={goBack}
            initialValue={data.biotype}
          />
        );

      case 5:
        return (
          <ActivityLevelStep
            onNext={(activityData) => {
              updateData({
                weeklyFrequency: activityData.frequency,
                intensity: activityData.intensity
              });
              goNext();
            }}
            onBack={goBack}
            initialValue={{
              frequency: data.weeklyFrequency,
              intensity: data.intensity
            }}
          />
        );

      case 6:
        return (
          <RestrictionsStep
            onNext={(restrictions) => {
              updateData({ restrictions });
              handleFinish(); // This will set currentStep to 7 and show calculating
            }}
            onBack={goBack}
            initialValue={data.restrictions}
          />
        );

      case 7:
        return <CalculatingStep userName={data.fullName || 'Usuário'} />;

      default:
        return <WelcomeScreen onStart={goNext} />;
    }
  };

  return <div className="font-display">{renderStep()}</div>;
};
