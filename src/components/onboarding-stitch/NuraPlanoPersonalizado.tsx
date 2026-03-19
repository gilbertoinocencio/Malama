import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraPlanoPersonalizado: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    
      <div className="flex flex-col h-full bg-surface text-on-surface overflow-hidden">
        <header className="shrink-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow overflow-y-auto pt-8 pb-32 px-6 max-w-2xl mx-auto w-full relative">
          
{/* Header Editorial */}
<header className="mb-12 space-y-4">
<h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-primary leading-tight">
                Seu caminho para <br/>o equilíbrio está pronto.
            </h1>
<p className="text-on-surface-variant text-lg max-w-xl font-light leading-relaxed">
                Desenhamos um plano de 90 dias baseado no seu perfil. Uma jornada gradual para transformar sua rotina em um ritual de bem-estar.
            </p>
</header>
{/* Bento Grid Layout for Phases */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 relative">
{/* Contextual Leaf Decoration (Absolute Position) */}
<div className="absolute -right-20 top-40 opacity-20 pointer-events-none hidden lg:block">
<span className="material-symbols-outlined text-[200px] text-secondary-container" data-icon="eco">eco</span>
</div>
{/* Phase 1 Card */}
<div className="bg-surface-container-lowest p-8 rounded-lg shadow-[0_16px_32px_rgba(0,0,0,0.04)] flex flex-col h-full border-b-4 border-tertiary-fixed transition-transform duration-300 hover:-translate-y-1">
<div className="flex justify-between items-start mb-8">
<span className="text-tertiary font-headline font-bold text-sm tracking-widest uppercase">Fase 1</span>
<span className="material-symbols-outlined text-tertiary text-4xl" data-icon="energy_savings_leaf">energy_savings_leaf</span>
</div>
<h3 className="text-2xl font-headline font-bold text-primary mb-4">Adaptação</h3>
<p className="text-on-surface-variant text-sm leading-relaxed mb-8">
                    Os primeiros 30 dias focam em identificar gatilhos e estabelecer micrometras sem pressão.
                </p>
<div className="mt-auto space-y-3">
<div className="flex items-center gap-3 text-xs text-on-surface font-medium">
<span className="material-symbols-outlined text-secondary text-lg" data-icon="check_circle" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        Mapeamento de rotina
                    </div>
<div className="flex items-center gap-3 text-xs text-on-surface font-medium">
<span className="material-symbols-outlined text-secondary text-lg" data-icon="check_circle" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        Introdução ao Flow
                    </div>
</div>
</div>
{/* Phase 2 Card (Featured) */}
<div className="bg-primary text-on-primary p-8 rounded-lg shadow-[0_24px_48px_rgba(0,70,79,0.15)] flex flex-col h-full scale-105 z-10 relative overflow-hidden">
{/* Soft Glow Gradient */}
<div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-container rounded-full blur-3xl opacity-50"></div>
<div className="flex justify-between items-start mb-8 relative z-20">
<span className="text-primary-fixed font-headline font-bold text-sm tracking-widest uppercase">Fase 2</span>
<span className="material-symbols-outlined text-primary-fixed text-4xl" data-icon="auto_awesome">auto_awesome</span>
</div>
<h3 className="text-2xl font-headline font-bold text-surface-container-lowest mb-4 relative z-20">Flow</h3>
<p className="text-primary-fixed-dim text-sm leading-relaxed mb-8 relative z-20">
                    Do dia 31 ao 60, intensificamos as práticas. Você começará a sentir a clareza mental e a consistência.
                </p>
<div className="mt-auto space-y-3 relative z-20">
<div className="flex items-center gap-3 text-xs text-on-primary font-medium">
<span className="material-symbols-outlined text-secondary-fixed text-lg" data-icon="check_circle" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        Práticas avançadas
                    </div>
<div className="flex items-center gap-3 text-xs text-on-primary font-medium">
<span className="material-symbols-outlined text-secondary-fixed text-lg" data-icon="check_circle" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        Otimização de sono
                    </div>
</div>
</div>
{/* Phase 3 Card */}
<div className="bg-surface-container-lowest p-8 rounded-lg shadow-[0_16px_32px_rgba(0,0,0,0.04)] flex flex-col h-full border-b-4 border-primary-fixed transition-transform duration-300 hover:-translate-y-1">
<div className="flex justify-between items-start mb-8">
<span className="text-primary font-headline font-bold text-sm tracking-widest uppercase">Fase 3</span>
<span className="material-symbols-outlined text-primary text-4xl" data-icon="verified">verified</span>
</div>
<h3 className="text-2xl font-headline font-bold text-primary mb-4">Consolidação</h3>
<p className="text-on-surface-variant text-sm leading-relaxed mb-8">
                    Reta final. Transformação de hábitos em identidade. O bem-estar torna-se seu estado natural.
                </p>
<div className="mt-auto space-y-3">
<div className="flex items-center gap-3 text-xs text-on-surface font-medium">
<span className="material-symbols-outlined text-secondary text-lg" data-icon="check_circle" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        Sustentabilidade a longo prazo
                    </div>
<div className="flex items-center gap-3 text-xs text-on-surface font-medium">
<span className="material-symbols-outlined text-secondary text-lg" data-icon="check_circle" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        Certificação NURA
                    </div>
</div>
</div>
</div>
{/* Summary Quote Section (Asymmetric) */}
<div className="flex flex-col md:flex-row items-center gap-12 bg-surface-container-low p-10 rounded-xl mb-12">
<div className="w-24 h-24 rounded-full bg-surface-container-highest flex-shrink-0 flex items-center justify-center overflow-hidden">
<img className="w-full h-full object-cover" data-alt="Portrait of a calm wellness expert" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlggZWaEqir0ImDHkfTiumB-KNT5cp--gG7qpuyD0ep2c3ftP8nMd9ZzF1WmR_FE3WnM1VV_aBpu5gCSvTmS63A5x9idCJSwuEhQINItETR-vhsZwvdlUPXoKd2uz2B9RC3Y1BMiVMbn6YFc98WOuK9zV8DB-rR6sZ6avjHdRa2V9RfOaS4I3becLc04NogNlTbahiVoXbVymAr-i-mnHJ5FKuJpQljtspVTcblGVn2Nvsmmlc1UbYUl-aRvx3dz5h6U61vIjjKSA"/>
</div>
<div className="space-y-2">
<p className="text-xl font-body italic text-primary leading-snug">
                    "O sucesso não vem da intensidade, mas da consistência. Este plano foi feito para você nunca mais precisar recomeçar."
                </p>
<p className="text-sm font-headline font-bold text-tertiary">Dra. Helena Souza, Head de Neurociência NURA</p>
</div>
</div>
{/* Action Section */}
<div className="flex flex-col items-center gap-6">
<button className="bg-primary text-on-primary font-headline font-bold text-lg px-12 py-5 rounded-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 active:scale-95 w-full md:w-auto shadow-lg">
                Começar Agora
            </button>
<p className="text-on-surface-variant text-xs font-medium tracking-wide">
                *Você pode ajustar seu ritmo a qualquer momento.
            </p>
</div>

        </main>
        
        <footer className="shrink-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40 p-6 relative z-40 bg-surface/80 backdrop-blur-md pb-8">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             <button onClick={onNext} className="bg-primary text-on-primary font-headline font-semibold py-4 px-12 rounded-xl text-lg hover:bg-primary-container transition-all min-w-[200px]">Continuar</button>
          </div>
        </footer>
      </div>
  
  );
};

export default NuraPlanoPersonalizado;
