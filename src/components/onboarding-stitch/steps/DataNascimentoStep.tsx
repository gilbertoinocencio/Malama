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
      <div className="text-center mb-10">
        <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
          Passo {currentStep} de {totalSteps}
        </span>
        <h1 
          className="text-4xl text-stone-800 leading-tight mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Qual é a sua data de nascimento?
        </h1>
        <p className="text-stone-400 text-base font-light max-w-md mx-auto leading-relaxed">
          A idade influencia diretamente nas suas recomendações metabólicas.
        </p>
      </div>

      {/* Main Input Card */}
      <div className={`w-full bg-white rounded-2xl p-10 flex flex-col items-center justify-center relative shadow-sm border ${error ? 'border-red-200' : 'border-stone-100'} transition-colors`}>
        <span className={`tracking-widest text-xs uppercase mb-8 font-light ${error ? 'text-red-400' : 'text-stone-400'}`}>
          {error ? error : 'Sua Data de Nascimento'}
        </span>
        
        <div className="flex items-end justify-center gap-2 sm:gap-4 mb-4">
          
          {/* Dia */}
          <div className="relative group">
            <input
              ref={dayRef}
              className="w-16 sm:w-20 bg-transparent border-none text-center text-5xl sm:text-6xl text-stone-800 p-0 focus:ring-0 transition-all duration-300 placeholder:text-stone-200"
              style={{ fontFamily: "'Playfair Display', serif" }}
              type="text"
              inputMode="numeric"
              maxLength={2}
              placeholder="DD"
              value={day}
              onChange={handleDayChange}
              onKeyDown={(e) => handleKeyDown(e, 'day')}
            />
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-10 sm:w-12 h-px ${error ? 'bg-red-300' : 'bg-stone-200'} group-focus-within:w-full group-focus-within:bg-Malama-petrol transition-all duration-500`}></div>
          </div>

          <span 
            className="text-5xl sm:text-6xl text-stone-200 font-light pb-2 sm:pb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            /
          </span>

          {/* Mês */}
          <div className="relative group">
            <input
              ref={monthRef}
              className="w-16 sm:w-20 bg-transparent border-none text-center text-5xl sm:text-6xl text-stone-800 p-0 focus:ring-0 transition-all duration-300 placeholder:text-stone-200"
              style={{ fontFamily: "'Playfair Display', serif" }}
              type="text"
              inputMode="numeric"
              maxLength={2}
              placeholder="MM"
              value={month}
              onChange={handleMonthChange}
              onKeyDown={(e) => handleKeyDown(e, 'month')}
            />
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-10 sm:w-12 h-px ${error ? 'bg-red-300' : 'bg-stone-200'} group-focus-within:w-full group-focus-within:bg-Malama-petrol transition-all duration-500`}></div>
          </div>

          <span 
            className="text-5xl sm:text-6xl text-stone-200 font-light pb-2 sm:pb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            /
          </span>

          {/* Ano */}
          <div className="relative group">
            <input
              ref={yearRef}
              className="w-24 sm:w-32 bg-transparent border-none text-center text-5xl sm:text-6xl text-stone-800 p-0 focus:ring-0 transition-all duration-300 placeholder:text-stone-200"
              style={{ fontFamily: "'Playfair Display', serif" }}
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="AAAA"
              value={year}
              onChange={handleYearChange}
              onKeyDown={(e) => handleKeyDown(e, 'year')}
            />
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-16 sm:w-20 h-px ${error ? 'bg-red-300' : 'bg-stone-200'} group-focus-within:w-full group-focus-within:bg-Malama-petrol transition-all duration-500`}></div>
          </div>

        </div>
      </div>

      {/* Info Card */}
      <div className="mt-6 w-full animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        <div className="bg-white border border-stone-100 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-stone-50">
            <span className="material-symbols-outlined text-stone-400 text-lg">calendar_month</span>
          </div>
          <p className="text-sm font-light text-stone-500 leading-relaxed">
            Sua idade nos ajuda a ajustar os cálculos metabólicos com maior precisão e segurança.
          </p>
        </div>
      </div>
    </StepContainer>
  );
};

export default DataNascimentoStep;
