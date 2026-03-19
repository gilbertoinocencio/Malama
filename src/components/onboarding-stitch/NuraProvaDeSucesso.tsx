import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraProvaDeSucesso: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    
      <div className="flex flex-col h-full bg-surface text-on-surface overflow-hidden">
        <header className="shrink-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow overflow-y-auto pt-8 pb-32 px-6 max-w-2xl mx-auto w-full relative">
          
{/* Contextual Leaf Decoration */}
<div className="fixed -top-10 -right-10 opacity-20 pointer-events-none">
<span className="material-symbols-outlined text-[20rem] text-secondary-container" data-icon="eco">eco</span>
</div>
{/* Hero Section */}
<div className="w-full text-center space-y-4 mb-10">
<span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-medium text-sm tracking-wide mb-2">
<span className="material-symbols-outlined text-sm" data-icon="verified" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                PERFIL ANALISADO
            </span>
<h1 className="text-4xl md:text-5xl font-extrabold font-lexend text-primary tracking-tight leading-tight">
                Tudo pronto para sua jornada.
            </h1>
<p className="text-on-surface-variant text-lg max-w-md mx-auto">
                Seu plano personalizado foi gerado com base em seus objetivos e biotipo.
            </p>
</div>
{/* Main Content: Goal Success Bento Card */}
<div className="w-full grid grid-cols-1 gap-6">
{/* Success Highlight Card */}
<div className="relative bg-secondary p-10 md:p-12 rounded-xl shadow-[0_16px_32px_rgba(0,109,54,0.12)] overflow-hidden group">
{/* Background pattern */}
<div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 transition-transform duration-700 group-hover:rotate-45">
<span className="material-symbols-outlined text-[12rem]" data-icon="trending_up">trending_up</span>
</div>
<div className="relative z-10 flex flex-col items-center text-center space-y-6">
<div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-2">
<span className="material-symbols-outlined text-white text-4xl" data-icon="workspace_premium" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
</div>
<h2 className="text-white font-lexend text-2xl md:text-3xl font-bold leading-snug">
                        87% das pessoas com o seu perfil atingem a meta seguindo o plano NURA.
                    </h2>
<div className="h-px w-24 bg-white/30"></div>
<p className="text-secondary-fixed font-medium tracking-wide text-sm uppercase">
                        Selo de Confiança NURA Science
                    </p>
</div>
</div>
{/* Supporting Info Cards (Asymmetric Layout) */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<div className="bg-surface-container-lowest p-8 rounded-xl flex items-start gap-4 transition-all duration-300 hover:bg-surface-container">
<div className="p-3 bg-primary/5 rounded-lg">
<span className="material-symbols-outlined text-primary" data-icon="bolt">bolt</span>
</div>
<div>
<h3 className="font-lexend font-bold text-primary mb-1">Início Imediato</h3>
<p className="text-sm text-on-surface-variant leading-relaxed">Seu primeiro passo começa agora com uma rotina adaptada.</p>
</div>
</div>
<div className="bg-surface-container-lowest p-8 rounded-xl flex items-start gap-4 transition-all duration-300 hover:bg-surface-container">
<div className="p-3 bg-secondary/5 rounded-lg">
<span className="material-symbols-outlined text-secondary" data-icon="auto_graph">auto_graph</span>
</div>
<div>
<h3 className="font-lexend font-bold text-secondary mb-1">Acompanhamento</h3>
<p className="text-sm text-on-surface-variant leading-relaxed">Métricas em tempo real para garantir que você esteja no plano.</p>
</div>
</div>
</div>
</div>
{/* Footer Action */}
<footer className="mt-12 w-full max-w-sm mx-auto space-y-4">
<button className="w-full h-16 bg-primary text-on-primary font-lexend font-bold text-lg rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-xl active:scale-95">
                Continuar
                <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</button>
<p className="text-center text-xs text-on-surface-variant/60 font-medium">
                Ao continuar, você concorda com nossos Termos de Jornada.
            </p>
</footer>

        </main>
        
        <footer className="shrink-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40 p-6 relative z-40 bg-surface/80 backdrop-blur-md pb-8">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             
<button className="w-full h-16 bg-primary text-on-primary font-lexend font-bold text-lg rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-xl active:scale-95">
                Continuar
                <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</button>
<p className="text-center text-xs text-on-surface-variant/60 font-medium">
                Ao continuar, você concorda com nossos Termos de Jornada.
            </p>

          </div>
        </footer>
      </div>
  
  );
};

export default NuraProvaDeSucesso;
