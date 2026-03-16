import React, { useState } from 'react';
import { StepLayout } from './StepLayout';
import { SelectionCard } from './SelectionCard';

interface BasicInfoStepProps {
  fullName?: string;
  birthDate?: string;
  biologicalSex?: 'M' | 'F';
  onNext: (data: { fullName: string; birthDate: string; age: number; biologicalSex: 'M' | 'F' }) => void;
  onBack: () => void;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  fullName: initialName = '',
  birthDate: initialDate = '',
  biologicalSex: initialSex,
  onNext,
  onBack,
}) => {
  const [fullName, setFullName] = useState(initialName);
  const [birthDate, setBirthDate] = useState(initialDate);
  const [biologicalSex, setBiologicalSex] = useState<'M' | 'F' | undefined>(initialSex);

  const calculateAge = (dateString: string): number => {
    const birth = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const isValid = fullName.trim().length >= 3 && birthDate && biologicalSex;

  const handleNext = () => {
    if (!isValid || !biologicalSex) return;

    const age = calculateAge(birthDate);
    onNext({ fullName, birthDate, age, biologicalSex });
  };

  return (
    <StepLayout
      title="Vamos nos conhecer"
      subtitle="Precisamos de algumas informações básicas sobre você"
      icon="person"
      onNext={handleNext}
      onBack={onBack}
      nextDisabled={!isValid}
      progress={11}
    >
      <div className="space-y-6">
        {/* Full Name */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-nura-main dark:text-white">
            Nome Completo
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Como você se chama?"
            className="w-full px-4 py-3.5 rounded-2xl border-2 border-nura-border dark:border-gray-700
              bg-white dark:bg-surface-dark text-nura-main dark:text-white
              placeholder-nura-muted dark:placeholder-gray-500
              focus:outline-none focus:border-nura-petrol dark:focus:border-primary
              transition-colors"
          />
        </div>

        {/* Birth Date */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-nura-main dark:text-white">
            Data de Nascimento
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3.5 rounded-2xl border-2 border-nura-border dark:border-gray-700
              bg-white dark:bg-surface-dark text-nura-main dark:text-white
              focus:outline-none focus:border-nura-petrol dark:focus:border-primary
              transition-colors"
          />
          {birthDate && (
            <p className="text-xs text-nura-muted dark:text-gray-400">
              Você tem {calculateAge(birthDate)} anos
            </p>
          )}
        </div>

        {/* Biological Sex */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-nura-main dark:text-white">
            Sexo Biológico
          </label>
          <div className="grid grid-cols-2 gap-4">
            <SelectionCard
              icon="man"
              title="Masculino"
              selected={biologicalSex === 'M'}
              onClick={() => setBiologicalSex('M')}
            />
            <SelectionCard
              icon="woman"
              title="Feminino"
              selected={biologicalSex === 'F'}
              onClick={() => setBiologicalSex('F')}
            />
          </div>
          <p className="text-xs text-nura-muted dark:text-gray-500 text-center">
            Necessário para cálculo preciso das necessidades nutricionais
          </p>
        </div>
      </div>
    </StepLayout>
  );
};

export default BasicInfoStep;
