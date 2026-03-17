const fs = require('fs');
const path = require('path');

const steps = [
  'ReminderScheduleStep',
  'MealsPerDayStep',
  'EatingWindowStep',
  'EatingLocationStep',
  'DietTypeStep',
  'DietaryRestrictionsStep',
  'WaterIntakeStep',
  'WaterEducationStep',
  'HabitChangesStep',
  'GenderStep',
  'AgeStep',
  'ActivityLevelStep',
  'HeightStep',
  'CurrentWeightStep',
  'PersonalSummaryStep',
  'TargetWeightStep',
  'GoalSpeedStep',
  'GoalSuccessStep',
  'PersonalizingPlanStep',
  'GoalConfirmationStep',
  'NutritionalRecommendationsStep',
  'PersonalizedPlanStep',
  'SocialProofStep',
  'PaywallFeaturesStep',
  'PricingStep',
];

const template = (componentName) => `import React from 'react';
import { StepProps } from './types';
import { StepContainer } from './StepContainer';

interface ${componentName}Props extends Omit<StepProps, 'data' | 'updateData'> {
  data?: any;
  updateData?: any;
  onComplete?: () => void;
}

const ${componentName}: React.FC<${componentName}Props> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      showBack={true}
    >
      <div className="flex flex-col h-full justify-center items-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            ${componentName.replace(/Step$/, '')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Este passo será implementado
          </p>
          <button
            onClick={onNext}
            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 px-8 rounded-full font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            Seguinte →
          </button>
        </div>
      </div>
    </StepContainer>
  );
};

export default ${componentName};
`;

const dir = path.join(__dirname, 'src', 'components', 'onboarding-v2');

steps.forEach((stepName) => {
  const filePath = path.join(dir, `${stepName}.tsx`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, template(stepName));
    console.log(`✓ Created ${stepName}.tsx`);
  } else {
    console.log(`- Skipped ${stepName}.tsx (already exists)`);
  }
});

console.log('\n✅ All steps created!');
