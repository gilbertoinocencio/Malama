import React, { useState, useRef, useCallback } from 'react';
import { StepContainer } from '../StepContainer';
import { StepProps } from '../types';

const PETROL = '#9c5d4b';

const AlturaEPesoStep: React.FC<StepProps> = ({ data, updateData, onNext, onBack, currentStep, totalSteps }) => {
  const [altura, setAltura] = useState<number>(data.altura || 175);
  const [peso, setPeso] = useState<number>(data.peso || 74.5);
  
  const alturaBarRef = useRef<HTMLDivElement>(null);
  const pesoBarRef = useRef<HTMLDivElement>(null);
  const isDraggingAltura = useRef(false);
  const isDraggingPeso = useRef(false);

  const handleContinue = () => {
    updateData({ altura, peso });
    onNext();
  };

  const adjustAltura = (delta: number) => {
    setAltura(prev => Math.max(100, Math.min(250, prev + delta)));
  };

  const adjustPeso = (delta: number) => {
    setPeso(prev => Math.max(30, Math.min(300, Number((prev + delta).toFixed(1)))));
  };

  const calculateAlturaFromPosition = useCallback((clientX: number) => {
    if (!alturaBarRef.current) return;
    const rect = alturaBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newAltura = Math.round(100 + percentage * 150);
    setAltura(Math.max(100, Math.min(250, newAltura)));
  }, []);

  const calculatePesoFromPosition = useCallback((clientX: number) => {
    if (!pesoBarRef.current) return;
    const rect = pesoBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newPeso = 30 + percentage * 270;
    setPeso(Math.max(30, Math.min(300, Number(newPeso.toFixed(1)))));
  }, []);

  // Handlers for sliders
  const handleAlturaStart = (clientX: number) => { isDraggingAltura.current = true; calculateAlturaFromPosition(clientX); };
  const handleAlturaMove = (clientX: number) => { if (isDraggingAltura.current) calculateAlturaFromPosition(clientX); };
  const handleAlturaEnd = () => { isDraggingAltura.current = false; };

  const handlePesoStart = (clientX: number) => { isDraggingPeso.current = true; calculatePesoFromPosition(clientX); };
  const handlePesoMove = (clientX: number) => { if (isDraggingPeso.current) calculatePesoFromPosition(clientX); };
  const handlePesoEnd = () => { isDraggingPeso.current = false; };

  return (
    <StepContainer
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={handleContinue}
    >
      <main className="flex-grow pt-10 pb-10 px-6 max-w-xl mx-auto w-full flex flex-col items-center justify-center">

        <section className="w-full text-center mb-10">
          <span className="text-stone-400 text-xs tracking-widest uppercase font-light block mb-2">
            Passo {currentStep} de {totalSteps}
          </span>
          <h1 
            className="text-4xl text-stone-800 leading-tight mb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Sua Biometria
          </h1>
          <p className="text-stone-400 text-base font-light">
            Dados precisos para um acompanhamento excepcional.
          </p>
        </section>

        <div className="w-full space-y-6">
          {/* Altura Card */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-lg text-stone-600 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>Altura</h2>
              <div className="flex items-baseline">
                <span className="text-4xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>{altura}</span>
                <span className="ml-1 text-stone-400 font-light text-sm">cm</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => adjustAltura(-1)} className="w-10 h-10 rounded-full flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors">
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
              
              <div
                ref={alturaBarRef}
                className="flex-1 h-3 bg-stone-100 rounded-full relative cursor-pointer"
                onMouseDown={(e) => handleAlturaStart(e.clientX)}
                onMouseMove={(e) => handleAlturaMove(e.clientX)}
                onMouseUp={handleAlturaEnd}
                onMouseLeave={handleAlturaEnd}
                onTouchStart={(e) => handleAlturaStart(e.touches[0].clientX)}
                onTouchMove={(e) => handleAlturaMove(e.touches[0].clientX)}
                onTouchEnd={handleAlturaEnd}
              >
                <div
                  className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
                  style={{ width: `${((altura - 100) / 150) * 100}%`, background: PETROL }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-sm border pointer-events-none"
                  style={{ left: `calc(${((altura - 100) / 150) * 100}% - 8px)`, borderColor: PETROL }}
                />
              </div>

              <button onClick={() => adjustAltura(1)} className="w-10 h-10 rounded-full flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors">
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
          </div>

          {/* Peso Card */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-lg text-stone-600 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>Peso Atual</h2>
              <div className="flex items-baseline">
                <span className="text-4xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>{peso}</span>
                <span className="ml-1 text-stone-400 font-light text-sm">kg</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => adjustPeso(-0.5)} className="w-10 h-10 rounded-full flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors">
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
              
              <div
                ref={pesoBarRef}
                className="flex-1 h-3 bg-stone-100 rounded-full relative cursor-pointer"
                onMouseDown={(e) => handlePesoStart(e.clientX)}
                onMouseMove={(e) => handlePesoMove(e.clientX)}
                onMouseUp={handlePesoEnd}
                onMouseLeave={handlePesoEnd}
                onTouchStart={(e) => handlePesoStart(e.touches[0].clientX)}
                onTouchMove={(e) => handlePesoMove(e.touches[0].clientX)}
                onTouchEnd={handlePesoEnd}
              >
                <div
                  className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
                  style={{ width: `${((peso - 30) / 270) * 100}%`, background: PETROL }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-sm border pointer-events-none"
                  style={{ left: `calc(${((peso - 30) / 270) * 100}% - 8px)`, borderColor: PETROL }}
                />
              </div>

              <button onClick={() => adjustPeso(0.5)} className="w-10 h-10 rounded-full flex items-center justify-center bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors">
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </StepContainer>
  );
};

export default AlturaEPesoStep;
