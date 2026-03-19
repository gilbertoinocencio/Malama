import React, { useMemo } from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraVelocidadeDaMeta: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const speedValue = data.goalSpeedKgPerWeek || 0.5;

  const mapSpeedToSlider = (speed: number) => {
    if (speed <= 0.25) return 1;
    if (speed <= 0.375) return 2;
    if (speed <= 0.5) return 3;
    if (speed <= 0.625) return 4;
    return 5;
  };

  const mapSliderToSpeed = (slider: number) => {
    return 0.25 + (slider - 1) * 0.125;
  };

  const sliderValue = mapSpeedToSlider(speedValue);

  const weeksNeeded = useMemo(() => {
    if (!data.currentWeight || !data.targetWeight || !speedValue) return null;
    const weightDiff = Math.abs(data.currentWeight - data.targetWeight);
    return Math.ceil(weightDiff / speedValue);
  }, [data.currentWeight, data.targetWeight, speedValue]);

  return (
    
      <div className="flex flex-col h-full bg-surface text-on-surface overflow-hidden">
        <header className="shrink-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow overflow-y-auto pt-8 pb-32 px-6 max-w-2xl mx-auto w-full relative">
          
{/* Editorial Headline */}
<div className="w-full mb-12 space-y-4">
<h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-primary leading-tight">
                Qual a velocidade do seu objetivo?
            </h1>
<p className="text-on-surface-variant text-lg max-w-md leading-relaxed">
                Escolha o ritmo que melhor se adapta à sua rotina atual. Sustentabilidade é a chave para o sucesso.
            </p>
</div>
{/* Asymmetric Visual Impact Display */}
<div className="w-full grid grid-cols-2 gap-6 mb-16">
<div className="bg-surface-container-lowest p-8 rounded-lg flex flex-col items-center justify-center space-y-4 shadow-[0_16px_32px_rgba(0,0,0,0.04)] transition-all duration-500 border-2 border-transparent">
<span className="material-symbols-outlined text-5xl text-secondary/40" data-icon="turtle" style={{ fontVariationSettings: "'FILL' 0" }}>egg</span>
<span className="font-headline text-sm font-medium text-on-surface-variant">Lento e sustentável</span>
</div>
<div className="bg-surface-container-lowest p-8 rounded-lg flex flex-col items-center justify-center space-y-4 shadow-[0_16px_32px_rgba(0,0,0,0.04)] transition-all duration-500 border-2 border-secondary/20 scale-105">
<span className="material-symbols-outlined text-5xl text-secondary" data-icon="bolt" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
<span className="font-headline text-sm font-medium text-primary">Rápido e intenso</span>
</div>
</div>
{/* Sophisticated Slider Section */}
<div className="w-full px-4 mb-20">
<div className="relative w-full py-8">
<input 
  className="w-full h-2 rounded-full appearance-none accent-primary bg-surface-container-highest cursor-pointer" 
  max="5" min="1" step="1" type="range" 
  value={sliderValue}
  onChange={(e) => updateData({ goalSpeedKgPerWeek: mapSliderToSpeed(parseInt(e.target.value)) })}
/>
{/* Custom Scale Labels */}
<div className="flex justify-between w-full mt-6 px-2">
<div className="flex flex-col items-start">
<span className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest font-headline">Ritmo</span>
<span className="text-sm font-semibold text-secondary">Gradual</span>
</div>
<div className="flex flex-col items-end">
<span className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest font-headline">Foco</span>
<span className="text-sm font-semibold text-primary">Acelerado</span>
</div>
</div>
</div>
{/* Impact Summary Card */}
<div className="mt-8 p-8 bg-secondary-container/20 rounded-xl flex items-center space-x-6">
<div className="bg-secondary p-3 rounded-full">
<span className="material-symbols-outlined text-white" data-icon="auto_awesome" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
</div>
<div>
<h3 className="font-headline font-semibold text-on-secondary-container">Impacto previsto</h3>
<p className="text-on-surface-variant text-sm border-t border-transparent pt-1">
  {weeksNeeded ? (
    <>Este ritmo permite alcançar seu objetivo em aproximadamente <span className="font-bold text-secondary">{weeksNeeded} semanas</span> de forma consistente.</>
  ) : (
    <>Precisamos saber o seu peso atual e alvo para prever o tempo.</>
  )}
</p>
</div>
</div>
</div>
{/* Primary Action */}
<div className="w-full mt-auto">
<button onClick={onNext} className="w-full h-16 bg-primary rounded-xl text-on-primary font-headline font-semibold text-lg flex items-center justify-center group hover:bg-primary-container transition-all duration-500 shadow-xl shadow-primary/10">
<span>Continuar</span>
<span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform" data-icon="arrow_forward">arrow_forward</span>
</button>
<button className="w-full mt-4 py-4 text-on-surface-variant font-medium text-sm hover:text-primary transition-colors">
                Gostaria de ajuda para decidir?
            </button>
</div>

        </main>
        
        <footer className="shrink-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40 p-6 relative z-40 bg-surface/80 backdrop-blur-md pb-8">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             
        Passo 6 de 8 • Goal Dynamics
    
          </div>
        </footer>
      </div>
  
  );
};

export default NuraVelocidadeDaMeta;
