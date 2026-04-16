import React, { useState, useRef, useEffect } from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

const IdadeStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [idade, setIdade] = useState<number>(data.idade || 26);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate age array from 18 to 80
  const ages = Array.from({ length: 63 }, (_, i) => i + 18);

  const handleContinue = () => {
    updateData({ idade });
    onNext();
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const itemHeight = 96; // 24 * 4 (h-24 = 6rem = 96px)
    const scrollTop = container.scrollTop;
    const centerIndex = Math.round(scrollTop / itemHeight);
    const newAge = ages[centerIndex];
    if (newAge && newAge !== idade) {
      setIdade(newAge);
    }
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      const index = ages.indexOf(idade);
      if (index !== -1) {
        scrollContainerRef.current.scrollTop = index * 96;
      }
    }
  }, []);

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={handleContinue}
    >
      <main className="flex-grow flex flex-col items-center justify-center pt-10 pb-10 max-w-2xl mx-auto w-full relative">
        <div className="text-center mb-12 space-y-2 w-full">
          <span className="text-stone-400 text-xs tracking-widest uppercase font-light">
            Passo {currentStep} de {totalSteps}
          </span>
          <h1 
            className="text-4xl text-stone-800 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Qual é a sua idade?
          </h1>
          <p className="text-stone-400 text-base font-light">
            A idade influencia nas recomendações metabólicas.
          </p>
        </div>

        {/* Scroller UI */}
        <div className="relative w-full max-w-xs flex flex-col items-center bg-white rounded-3xl py-4 shadow-sm border border-stone-100">
          
          {/* Highlight line */}
          <div className="absolute top-1/2 -translate-y-1/2 w-48 h-px bg-stone-200 -z-0"></div>

          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="h-[300px] overflow-y-auto no-scrollbar scroller-mask snap-y snap-mandatory py-[102px] z-10 w-full text-center"
          >
            {ages.map((age) => {
              const distance = Math.abs(age - idade);
              const isSelected = age === idade;

              return (
                <div 
                  key={age} 
                  className="h-24 snap-center flex items-center justify-center transition-all duration-200"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: isSelected ? '5rem' : distance === 1 ? '3.5rem' : '2.5rem',
                    color: isSelected ? '#292524' : distance === 1 ? '#a8a29e' : '#e7e5e4',
                  }}
                >
                  {age}
                </div>
              );
            })}
          </div>

          <div 
            className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-300 font-light tracking-widest text-xs"
          >
            ANOS
          </div>
        </div>
      </main>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .scroller-mask {
          mask-image: linear-gradient(to bottom, transparent, black 40%, black 60%, transparent);
          -webkit-mask-image: linear-gradient(to bottom, transparent, black 40%, black 60%, transparent);
        }
      `}</style>
    </StepContainer>
  );
};

export default IdadeStep;
