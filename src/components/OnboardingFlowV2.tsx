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
  goalSpeed: number; // kg per week
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
    goalSpeed: 0.4,
  });

  const totalSteps = 37; // Updated to include 9 new steps

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
          goal_speed_kg_per_week: data.goalSpeed,
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
      // New: Primary goal selection
      case 0:
        return <PrimaryGoalStep {...stepProps} />;
      // New: Calorie tracking experience
      case 1:
        return <CalorieTrackingExperienceStep {...stepProps} />;
      case 2:
        return <AdditionalGoalsStep {...stepProps} />;
      case 3:
        return <IntermittentFastingKnowledgeStep {...stepProps} />;
      case 4:
        return <IntermittentFastingEducationStep {...stepProps} />;
      // New: Fasting benefits visual
      case 5:
        return <FastingBenefitsStep {...stepProps} />;
      case 6:
        return <ReminderScheduleStep {...stepProps} />;
      // New: Reminder motivation
      case 7:
        return <ReminderMotivationStep {...stepProps} />;
      case 8:
        return <MealsPerDayStep {...stepProps} />;
      case 9:
        return <EatingWindowStep {...stepProps} />;
      case 10:
        return <EatingLocationStep {...stepProps} />;
      case 11:
        return <DietTypeStep {...stepProps} />;
      case 12:
        return <DietaryRestrictionsStep {...stepProps} />;
      case 13:
        return <WaterIntakeStep {...stepProps} />;
      case 14:
        return <WaterEducationStep {...stepProps} />;
      // New: Water tracking visual
      case 15:
        return <WaterTrackingVisualStep {...stepProps} />;
      case 16:
        return <HabitChangesStep {...stepProps} />;
      case 17:
        return <GenderStep {...stepProps} />;
      case 18:
        return <AgeStep {...stepProps} />;
      case 19:
        return <ActivityLevelStep {...stepProps} />;
      case 20:
        return <HeightStep {...stepProps} />;
      case 21:
        return <CurrentWeightStep {...stepProps} />;
      case 22:
        return <PersonalSummaryStep {...stepProps} />;
      case 23:
        return <TargetWeightStep {...stepProps} />;
      case 24:
        return <GoalSpeedStep {...stepProps} />;
      // New: Progress tracking visual
      case 25:
        return <ProgressTrackingStep {...stepProps} />;
      case 26:
        return <GoalSuccessStep {...stepProps} />;
      case 27:
        return <PersonalizingPlanStep {...stepProps} />;
      case 28:
        return <GoalConfirmationStep {...stepProps} />;
      case 29:
        return <NutritionalRecommendationsStep {...stepProps} />;
      // New: Calorie tracking step
      case 30:
        return <CalorieTrackingStep {...stepProps} />;
      case 31:
        return <PersonalizedPlanStep {...stepProps} />;
      // New: Motivation step
      case 32:
        return <MotivationStep {...stepProps} />;
      case 33:
        return <SocialProofStep {...stepProps} />;
      // New: Unique approach
      case 34:
        return <UniqueApproachStep {...stepProps} />;
      case 35:
        return <PaywallFeaturesStep {...stepProps} />;
      case 36:
        return <PricingStep {...stepProps} onComplete={handleComplete} />;
      default:
        return <PrimaryGoalStep {...stepProps} />;
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
          className="h-full"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default OnboardingFlowV2;
