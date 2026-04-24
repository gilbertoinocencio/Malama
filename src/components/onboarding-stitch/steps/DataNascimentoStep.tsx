import React, { useState, useRef } from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

const DataNascimentoStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const initialDate = data.dataNascimento || '';
  const [day, setDay] = useState(initialDate ? initialDate.split('-')[2] : '');
  const [month, setMonth] = useState(initialDate ? initialDate.split('-')[1] : '');
  const [year, setYear] = useState(initialDate ? initialDate.split('-')[0] : '');
  const [error, setError] = useState('');

  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 2) {
      setDay(val);
      setError('');
      if (val.length === 2 && parseInt(val) > 0 && parseInt(val) <= 31) {
        monthRef.current?.focus();
      }
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 2) {
      setMonth(val);
      setError('');
      if (val.length === 2 && parseInt(val) > 0 && parseInt(val) <= 12) {
        yearRef.current?.focus();
      }
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 4) {
      setYear(val);
      setError('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'day' | 'month' | 'year') => {
    if (e.key === 'Backspace' && e.currentTarget.value === '') {
      if (field === 'month') {
        dayRef.current?.focus();
      } else if (field === 'year') {
        monthRef.current?.focus();
      }
    }
  };

  const isValidDate = () => {
    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);
    const currentYear = new Date().getFullYear();
    
    if (!d || !m || !y) return false;
    if (d < 1 || d > 31) return false;
    if (m < 1 || m > 12) return false;
    if (y < 1900 || y > currentYear) return false;
    
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  };

  const handleContinue = () => {
    if (isValidDate()) {
      setError('');
      const formattedDay = day.padStart(2, '0');
      const formattedMonth = month.padStart(2, '0');
      updateData({ dataNascimento: `${year}-${formattedMonth}-${formattedDay}` });
      onNext();
    } else {
      setError('Por favor, insira uma data válida.');
    }
  };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={handleContinue}
    >
      <main className="flex-grow flex flex-col items-center justify-center pt-10 pb-10 max-w-2xl mx-auto w-full relative">
        <div className="text-center mb-12 space-y-2 w-full px-4">
          <span className="text-stone-400 text-xs tracking-widest uppercase font-light">
            Passo {currentStep} de {totalSteps}
          </span>
          <h1 
            className="text-4xl text-stone-800 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Qual é a sua data de nascimento?
          </h1>
          <p className="text-stone-400 text-base font-light">
            A idade influencia nas recomendações metabólicas.
          </p>
        </div>

        {/* Quiet Luxury Custom Date Picker */}
        <div className="w-full max-w-[22rem] flex flex-col items-center bg-white rounded-[2rem] p-8 shadow-sm border border-stone-100">
          <div className="flex items-center justify-center gap-2 sm:gap-4 w-full">
            
            <div className="flex flex-col items-center gap-3">
              <input
                ref={dayRef}
                type="text"
                inputMode="numeric"
                maxLength={2}
                placeholder="DD"
                value={day}
                onChange={handleDayChange}
                onKeyDown={(e) => handleKeyDown(e, 'day')}
                className={`w-16 h-20 sm:w-20 sm:h-24 text-center text-3xl sm:text-4xl text-stone-800 bg-stone-50 rounded-2xl border ${error ? 'border-red-300 bg-red-50' : 'border-stone-100'} focus:border-Malama-petrol focus:ring-1 focus:ring-Malama-petrol outline-none transition-all placeholder:text-stone-200`}
                style={{ fontFamily: "'Playfair Display', serif" }}
              />
              <span className="text-[10px] text-stone-400 font-medium tracking-[0.2em] uppercase">Dia</span>
            </div>

            <span className="text-4xl text-stone-200 font-light mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>/</span>

            <div className="flex flex-col items-center gap-3">
              <input
                ref={monthRef}
                type="text"
                inputMode="numeric"
                maxLength={2}
                placeholder="MM"
                value={month}
                onChange={handleMonthChange}
                onKeyDown={(e) => handleKeyDown(e, 'month')}
                className={`w-16 h-20 sm:w-20 sm:h-24 text-center text-3xl sm:text-4xl text-stone-800 bg-stone-50 rounded-2xl border ${error ? 'border-red-300 bg-red-50' : 'border-stone-100'} focus:border-Malama-petrol focus:ring-1 focus:ring-Malama-petrol outline-none transition-all placeholder:text-stone-200`}
                style={{ fontFamily: "'Playfair Display', serif" }}
              />
              <span className="text-[10px] text-stone-400 font-medium tracking-[0.2em] uppercase">Mês</span>
            </div>

            <span className="text-4xl text-stone-200 font-light mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>/</span>

            <div className="flex flex-col items-center gap-3">
              <input
                ref={yearRef}
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="AAAA"
                value={year}
                onChange={handleYearChange}
                onKeyDown={(e) => handleKeyDown(e, 'year')}
                className={`w-20 h-20 sm:w-24 sm:h-24 text-center text-3xl sm:text-4xl text-stone-800 bg-stone-50 rounded-2xl border ${error ? 'border-red-300 bg-red-50' : 'border-stone-100'} focus:border-Malama-petrol focus:ring-1 focus:ring-Malama-petrol outline-none transition-all placeholder:text-stone-200`}
                style={{ fontFamily: "'Playfair Display', serif" }}
              />
              <span className="text-[10px] text-stone-400 font-medium tracking-[0.2em] uppercase">Ano</span>
            </div>

          </div>

          <div className="mt-6 h-6 flex items-center justify-center">
            {error && (
              <span className="text-red-500 text-sm font-medium animate-fade-in-up">
                {error}
              </span>
            )}
          </div>
        </div>
      </main>
    </StepContainer>
  );
};

export default DataNascimentoStep;
