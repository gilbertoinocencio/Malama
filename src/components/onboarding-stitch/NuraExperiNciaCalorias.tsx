import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraExperiNciaCalorias: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    
      <div className="flex flex-col h-full bg-surface text-on-surface">
        <header className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow pt-24 pb-32 px-6 max-w-2xl mx-auto w-full">
          
{/* Contextual Leaf (Decorative) */}
<div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary-container opacity-20 rounded-full blur-3xl pointer-events-none"></div>
<div className="absolute bottom-10 -left-10 w-48 h-48 bg-primary-fixed-dim opacity-10 rounded-full blur-2xl pointer-events-none"></div>
{/* Headline (The Hook) */}
<section className="text-center mb-16 space-y-4">
<h1 className="font-headline text-4xl md:text-5xl font-extrabold text-primary tracking-tight leading-tight">
                Qual é a sua experiência com contagem de calorias?
            </h1>
<p className="text-on-surface-variant font-body text-lg max-w-md mx-auto">
                Personalizamos o seu percurso com base no seu conhecimento atual.
            </p>
</section>
{/* Selective Option Cards (The Elegance Selector) */}
<div className="w-full space-y-6">
  {[
    { id: 'iniciante', label: 'Iniciante', subtext: '(nunca tentei)' },
    { id: 'intermedio', label: 'Intermédio', subtext: '(já tentei)' },
    { id: 'experiente', label: 'Experiente', subtext: '(faço regularmente)' }
  ].map((option) => {
    const isSelected = data.calorieTrackingExperience === option.id;
    return (
      <button 
        key={option.id}
        onClick={() => {
          updateData({ calorieTrackingExperience: option.id });
          setTimeout(() => onNext(), 300);
        }}
        className={`w-full group text-left p-8 rounded-[1.5rem] transition-all duration-300 ease-in-out flex items-center justify-between ${
          isSelected 
            ? 'bg-primary-fixed-dim ring-2 ring-secondary duration-500' 
            : 'bg-surface-container-low hover:bg-surface-container-highest'
        }`}
      >
        <div className="space-y-1">
          <span className="block font-headline text-xl font-semibold text-primary">{option.label}</span>
          <span className={`block font-body ${isSelected ? 'text-primary/80' : 'text-on-surface-variant'}`}>{option.subtext}</span>
        </div>
        {isSelected ? (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center transition-transform duration-300 scale-110">
            <span className="material-symbols-outlined text-on-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full border-2 border-outline-variant group-hover:border-primary transition-colors flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-secondary opacity-0 transition-opacity"></div>
          </div>
        )}
      </button>
    );
  })}
</div>

        </main>
        
        <footer className="fixed bottom-0 left-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             <button onClick={onNext} className="bg-primary text-on-primary font-headline font-semibold py-4 px-12 rounded-xl text-lg hover:bg-primary-container transition-all min-w-[200px]">Continuar</button>
          </div>
        </footer>
      </div>
  
  );
};

export default NuraExperiNciaCalorias;
