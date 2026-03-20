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
    // Scroll to initial age
    if (scrollContainerRef.current) {
      const index = ages.indexOf(idade);
      if (index !== -1) {
        scrollContainerRef.current.scrollTop = index * 96;
      }
    }
  }, []);

  return (
    <StepContainer
      progress={(currentStep / totalSteps) * 100}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
    >
      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-8 pt-20 pb-32 max-w-2xl mx-auto w-full relative">
        {/* Contextual Leaf (Decorative) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary-container/10 blur-[100px] -z-10 rounded-full"></div>

        {/* Headline & Subtitle */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary tracking-tight">
            Qual é a sua idade?
          </h1>
          <p className="text-on-surface-variant text-lg font-medium max-w-xs mx-auto">
            A idade influencia seu ritmo metabólico.
          </p>
        </div>

        {/* Sophisticated Scroller UI */}
        <div className="relative w-full max-w-xs flex flex-col items-center">
          {/* Selected Area Highlight */}
          <div className="absolute top-1/2 -translate-y-1/2 w-full h-24 bg-surface-container-lowest shadow-[0_16px_32px_0_rgba(26,28,26,0.04)] rounded-lg -z-0"></div>

          {/* Scrolling Numbers */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="h-[300px] overflow-y-auto no-scrollbar scroller-mask snap-y snap-mandatory py-[110px] z-10 w-full text-center"
          >
            {ages.map((age, index) => {
              const distance = Math.abs(age - idade);
              let className = "h-24 snap-center flex items-center justify-center font-headline";

              if (age === idade) {
                className += " text-primary text-8xl font-bold";
              } else if (distance === 1) {
                className += " text-on-surface/40 text-6xl";
              } else if (distance === 2) {
                className += " text-on-surface/20 text-5xl";
              } else {
                className += " text-on-surface/10 text-5xl";
              }

              return (
                <div key={age} className={className}>
                  {age}
                </div>
              );
            })}
          </div>

          {/* Unit Label */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 font-headline text-primary/40 font-medium">
            ANOS
          </div>
        </div>

        {/* Informative Badge (Asymmetric) */}
        <div className="mt-12 bg-surface-container-low px-6 py-4 rounded-lg flex items-center gap-4 self-end mr-[-10%] md:mr-0 transition-all hover:bg-surface-container">
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              analytics
            </span>
          </div>
          <p className="text-sm font-medium text-on-surface-variant max-w-[180px]">
            Personalizamos seu plano com base em dados biológicos.
          </p>
        </div>
      </main>

      {/* Bottom Action Button */}
      <div className="fixed bottom-0 left-0 w-full p-8 flex flex-col items-center gap-4 bg-gradient-to-t from-surface via-surface/90 to-transparent">
        <button
          onClick={handleContinue}
          className="w-full max-w-md h-16 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-semibold text-lg shadow-[0_16px_32px_0_rgba(0,70,79,0.15)] active:scale-95 transition-all duration-300 flex items-center justify-center group"
        >
          <span>Continuar</span>
          <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform">
            chevron_right
          </span>
        </button>
        <p className="text-xs text-on-surface-variant/60 font-medium">
          Etapa {currentStep} de {totalSteps}
        </p>
      </div>

      {/* Decorative Corner Element */}
      <div className="fixed bottom-[-5%] left-[-5%] w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none"></div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scroller-mask {
          mask-image: linear-gradient(to bottom, transparent, black 40%, black 60%, transparent);
          -webkit-mask-image: linear-gradient(to bottom, transparent, black 40%, black 60%, transparent);
        }
      `}</style>
    </StepContainer>
  );
};

export default IdadeStep;
