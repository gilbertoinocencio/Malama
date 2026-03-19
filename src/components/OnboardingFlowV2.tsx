import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';

// Import all step components
import AdditionalGoalsStep from './onboarding-v2/AdditionalGoalsStep';
import IntermittentFastingKnowledgeStep from './onboarding-v2/IntermittentFastingKnowledgeStep';
import IntermittentFastingEducationStep from './onboarding-v2/IntermittentFastingEducationStep';
import ReminderScheduleStep from './onboarding-v2/ReminderScheduleStep';
import MealsPerDayStep from './onboarding-v2/MealsPerDayStep';
import EatingWindowStep from './onboarding-v2/EatingWindowStep';
import EatingLocationStep from './onboarding-v2/EatingLocationStep';
import DietTypeStep from './onboarding-v2/DietTypeStep';
import DietaryRestrictionsStep from './onboarding-v2/DietaryRestrictionsStep';
import WaterIntakeStep from './onboarding-v2/WaterIntakeStep';
import WaterEducationStep from './onboarding-v2/WaterEducationStep';
import HabitChangesStep from './onboarding-v2/HabitChangesStep';
import GenderStep from './onboarding-v2/GenderStep';
import AgeStep from './onboarding-v2/AgeStep';
import ActivityLevelStep from './onboarding-v2/ActivityLevelStep';
import HeightStep from './onboarding-v2/HeightStep';
import CurrentWeightStep from './onboarding-v2/CurrentWeightStep';
import PersonalSummaryStep from './onboarding-v2/PersonalSummaryStep';
import TargetWeightStep from './onboarding-v2/TargetWeightStep';
import GoalSpeedStep from './onboarding-v2/GoalSpeedStep';
import GoalSuccessStep from './onboarding-v2/GoalSuccessStep';
import PersonalizingPlanStep from './onboarding-v2/PersonalizingPlanStep';
import GoalConfirmationStep from './onboarding-v2/GoalConfirmationStep';
import NutritionalRecommendationsStep from './onboarding-v2/NutritionalRecommendationsStep';
import PersonalizedPlanStep from './onboarding-v2/PersonalizedPlanStep';
import SocialProofStep from './onboarding-v2/SocialProofStep';
import PaywallFeaturesStep from './onboarding-v2/PaywallFeaturesStep';
import PricingStep from './onboarding-v2/PricingStep';

// Import new visual/educational steps
import PrimaryGoalStep from './onboarding-v2/PrimaryGoalStep';
import CalorieTrackingExperienceStep from './onboarding-v2/CalorieTrackingExperienceStep';
import WaterTrackingVisualStep from './onboarding-v2/WaterTrackingVisualStep';
import FastingBenefitsStep from './onboarding-v2/FastingBenefitsStep';
import ProgressTrackingStep from './onboarding-v2/ProgressTrackingStep';
import MotivationStep from './onboarding-v2/MotivationStep';
import ReminderMotivationStep from './onboarding-v2/ReminderMotivationStep';
import CalorieTrackingStep from './onboarding-v2/CalorieTrackingStep';
import UniqueApproachStep from './onboarding-v2/UniqueApproachStep';

// Import NEW Stitch components
import NuraTipoDeDieta from './onboarding-stitch/NuraTipoDeDieta';
import NuraRestriEsAlimentares from './onboarding-stitch/NuraRestriEsAlimentares';
import NuraJanelaAlimentar from './onboarding-stitch/NuraJanelaAlimentar';
import NuraMudanADeHBitos from './onboarding-stitch/NuraMudanADeHBitos';
import NuraPesoObjetivo from './onboarding-stitch/NuraPesoObjetivo';
import NuraObjetivosAdicionais from './onboarding-stitch/NuraObjetivosAdicionais';
import NuraConsumoDeGua from './onboarding-stitch/NuraConsumoDeGua';
import NuraLocalDasRefeiEs from './onboarding-stitch/NuraLocalDasRefeiEs';
import NuraVelocidadeDaMeta from './onboarding-stitch/NuraVelocidadeDaMeta';
import NuraExperiNciaCalorias from './onboarding-stitch/NuraExperiNciaCalorias';
import NuraConheceJejum from './onboarding-stitch/NuraConheceJejum';
import NuraRefeiEsDiRias from './onboarding-stitch/NuraRefeiEsDiRias';
import NuraLembretesERotina from './onboarding-stitch/NuraLembretesERotina';
import NuraEducaOJejum from './onboarding-stitch/NuraEducaOJejum';
import NuraBenefCiosJejum from './onboarding-stitch/NuraBenefCiosJejum';
import NuraEducaOHidrataO from './onboarding-stitch/NuraEducaOHidrataO';
import NuraProjeODeSucesso from './onboarding-stitch/NuraProjeODeSucesso';
import NuraProvaDeSucesso from './onboarding-stitch/NuraProvaDeSucesso';
import NuraCriandoPlano from './onboarding-stitch/NuraCriandoPlano';
import NuraPlanoPersonalizado from './onboarding-stitch/NuraPlanoPersonalizado';
import NuraMetodologiaFlow from './onboarding-stitch/NuraMetodologiaFlow';
import NuraResumoBiomTrico from './onboarding-stitch/NuraResumoBiomTrico';

export interface OnboardingData {
  // New fields
  primaryGoal?: string;
  calorieTrackingExperience?: string;

  // Step 1: Additional goals
  additionalGoals: string[];

  // Step 2: Intermittent fasting knowledge
  knowsIntermittentFasting: boolean | null;

  // Step 4: Reminder schedule
  reminderSchedule: string;

  // Step 5: Meals per day
  mealsPerDay: number;

  // Step 6: Eating window
  eatingWindowStart: string;
  eatingWindowEnd: string;

  // Step 7: Eating location
  eatingLocation: string;

  // Step 8: Diet type
  dietType: string;

  // Step 9: Dietary restrictions
  dietaryRestrictions: string[];

  // Step 10: Water intake
  drinksEnoughWater: string | null;

  // Step 12: Habit changes
  habitChanges: string[];

  // Step 13: Gender
  gender: string;

  // Step 14: Age
  age: number;

  // Step 15: Activity level
  activityLevel: string;

  // Step 16: Height
  height: number;
  heightUnit: 'cm' | 'ft';

  // Step 17: Current weight
  currentWeight: number;
  weightUnit: 'kg' | 'lbs';

  // Step 19: Target weight
  targetWeight: number;

  // Step 20: Goal speed
  goalSpeedKgPerWeek: number; // kg per week
}

interface OnboardingFlowV2Props {
  onComplete: () => void;
}

export const OnboardingFlowV2: React.FC<OnboardingFlowV2Props> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    additionalGoals: [],
    knowsIntermittentFasting: null,
    reminderSchedule: '',
    mealsPerDay: 3,
    eatingWindowStart: '08:00',
    eatingWindowEnd: '20:00',
    eatingLocation: '',
    dietType: '',
    dietaryRestrictions: [],
    drinksEnoughWater: null,
    habitChanges: [],
    gender: '',
    age: 30,
    activityLevel: '',
    height: 170,
    heightUnit: 'cm',
    currentWeight: 70,
    weightUnit: 'kg',
    targetWeight: 70,
    goalSpeedKgPerWeek: 0.4,
  });

  const totalSteps = 27; // Updated onboarding flow with Nura components

  const updateData = (newData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Calculate BMI
      const heightInMeters = data.heightUnit === 'cm'
        ? data.height / 100
        : (data.height * 12 * 2.54) / 100;
      const weightInKg = data.weightUnit === 'kg'
        ? data.currentWeight
        : data.currentWeight * 0.453592;
      const bmi = weightInKg / (heightInMeters * heightInMeters);

      // Save onboarding data to user profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id, // Mandatory for upsert
          primary_goal: data.primaryGoal,
          calorie_tracking_experience: data.calorieTrackingExperience,
          age: data.age,
          gender: data.gender,
          height: data.heightUnit === 'cm' ? data.height : data.height * 12 * 2.54,
          weight: weightInKg,
          target_weight_kg: data.weightUnit === 'kg' ? data.targetWeight : data.targetWeight * 0.453592,
          activity_level: data.activityLevel,
          diet_type: data.dietType,
          dietary_restrictions: data.dietaryRestrictions,
          eating_location: data.eatingLocation,
          meals_per_day: data.mealsPerDay,
          eating_window_start: data.eatingWindowStart,
          eating_window_end: data.eatingWindowEnd,
          additional_goals: data.additionalGoals,
          habit_changes: data.habitChanges,
          knows_intermittent_fasting: data.knowsIntermittentFasting,
          drinks_enough_water: data.drinksEnoughWater,
          reminder_schedule: data.reminderSchedule,
          goal_speed_kg_per_week: data.goalSpeedKgPerWeek,
          bmi: bmi,
          onboarding_completed: true,
        });

      if (error) throw error;

      onComplete();
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      alert('Erro ao salvar dados. Tente novamente.');
    }
  };

  const renderStep = () => {
    const stepProps = {
      data,
      updateData,
      onNext: nextStep,
      onBack: prevStep,
      currentStep: currentStep + 1,
      totalSteps,
    };

    switch (currentStep) {
      // Calorie tracking experience
      case 0:
        return <NuraExperiNciaCalorias {...stepProps} />;
      // Additional goals
      case 1:
        return <NuraObjetivosAdicionais {...stepProps} />;
      // Intermittent fasting knowledge
      case 2:
        return <NuraConheceJejum {...stepProps} />;
      // Intermittent fasting education
      case 3:
        return <NuraEducaOJejum {...stepProps} />;
      // Fasting benefits
      case 4:
        return <NuraBenefCiosJejum {...stepProps} />;
      // Reminder schedule
      case 5:
        return <NuraLembretesERotina {...stepProps} />;
      // Meals per day
      case 6:
        return <NuraRefeiEsDiRias {...stepProps} />;
      // Eating window
      case 7:
        return <NuraJanelaAlimentar {...stepProps} />;
      // Eating location
      case 8:
        return <NuraLocalDasRefeiEs {...stepProps} />;
      // Diet type
      case 9:
        return <NuraTipoDeDieta {...stepProps} />;
      // Dietary restrictions
      case 10:
        return <NuraRestriEsAlimentares {...stepProps} />;
      // Water intake
      case 11:
        return <NuraConsumoDeGua {...stepProps} />;
      // Water education
      case 12:
        return <NuraEducaOHidrataO {...stepProps} />;
      // Habit changes
      case 13:
        return <NuraMudanADeHBitos {...stepProps} />;
      // Gender
      case 14:
        return <GenderStep {...stepProps} />;
      // Age
      case 15:
        return <AgeStep {...stepProps} />;
      // Activity level
      case 16:
        return <ActivityLevelStep {...stepProps} />;
      // Height
      case 17:
        return <HeightStep {...stepProps} />;
      // Current weight
      case 18:
        return <CurrentWeightStep {...stepProps} />;
      // Biometric summary
      case 19:
        return <NuraResumoBiomTrico {...stepProps} />;
      // Target weight
      case 20:
        return <NuraPesoObjetivo {...stepProps} />;
      // Goal speed
      case 21:
        return <NuraVelocidadeDaMeta {...stepProps} />;
      // Progress projection
      case 22:
        return <NuraProjeODeSucesso {...stepProps} />;
      // Social proof
      case 23:
        return <NuraProvaDeSucesso {...stepProps} />;
      // Creating plan
      case 24:
        return <NuraCriandoPlano {...stepProps} />;
      // Personalized plan
      case 25:
        return <NuraPlanoPersonalizado {...stepProps} />;
      // Methodology
      case 26:
        return <NuraMetodologiaFlow {...stepProps} />;
      default:
        return <NuraExperiNciaCalorias {...stepProps} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="h-full flex flex-col"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default OnboardingFlowV2;
