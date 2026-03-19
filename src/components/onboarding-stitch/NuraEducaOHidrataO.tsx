import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraEducaOHidrataO: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    
      <div className="flex flex-col h-full bg-surface text-on-surface">
        <header className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow pt-24 pb-32 px-6 max-w-2xl mx-auto w-full">
          
{/* Contextual Leaf Decorative Element */}
<div className="fixed -right-20 top-1/4 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none -z-10"></div>
{/* Onboarding Header Section */}
<section className="mb-12 space-y-4">
<span className="text-secondary font-headline font-semibold tracking-widest text-sm uppercase px-1">Fase 04 — Metabolismo</span>
<h1 className="text-4xl md:text-5xl font-extrabold text-primary leading-tight tracking-tight">
                Água como Combustível
            </h1>
<p className="text-on-surface-variant text-lg leading-relaxed max-w-lg">
                Seu metabolismo não é apenas genética; é química. A hidratação correta é o catalisador que transforma nutrientes em energia vital.
            </p>
</section>
{/* Asymmetric Bento-style Infographic Grid */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
{/* Main Efficiency Graph Card */}
<div className="md:col-span-8 bg-surface-container-lowest rounded-xl p-8 shadow-[0_16px_32px_rgba(0,0,0,0.04)] relative overflow-hidden group">
<div className="flex justify-between items-end mb-8">
<div>
<h3 className="text-primary font-headline font-bold text-xl">Eficiência Metabólica</h3>
<p className="text-sm text-on-surface-variant">Taxa de queima calórica basal</p>
</div>
<div className="text-right">
<span className="text-3xl font-bold text-secondary font-headline">+24%</span>
<div className="flex items-center gap-1 text-secondary">
<span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
<span className="text-xs font-bold uppercase tracking-tighter">Otimizado</span>
</div>
</div>
</div>
{/* Minimalist Chart */}
<div className="relative h-48 w-full flex items-end gap-2 px-2">
{/* Grid Lines */}
<div className="absolute inset-0 flex flex-col justify-between py-1 opacity-10 pointer-events-none">
<div className="border-t border-primary w-full"></div>
<div className="border-t border-primary w-full"></div>
<div className="border-t border-primary w-full"></div>
</div>
{/* Bars */}
<div className="flex-1 bg-surface-container-high h-[30%] rounded-t-lg transition-all duration-500 hover:bg-primary-fixed-dim"></div>
<div className="flex-1 bg-surface-container-high h-[42%] rounded-t-lg transition-all duration-500 hover:bg-primary-fixed-dim"></div>
<div className="flex-1 bg-surface-container-high h-[55%] rounded-t-lg transition-all duration-500 hover:bg-primary-fixed-dim"></div>
<div className="flex-1 bg-primary-container h-[72%] rounded-t-lg transition-all duration-500"></div>
<div className="flex-1 flow-gradient h-[95%] rounded-t-lg transition-all duration-700 relative">
<div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-secondary text-white text-[10px] px-2 py-1 rounded font-bold">PICO</div>
</div>
</div>
<div className="mt-6 flex justify-between text-[10px] font-bold text-outline uppercase tracking-widest border-t border-surface-container-highest pt-4">
<span>Desidratado</span>
<span>Hidratado</span>
</div>
</div>
{/* Side Metric Card 01 */}
<div className="md:col-span-4 bg-surface-container-low rounded-xl p-6 flex flex-col justify-between aspect-square group transition-all duration-300 hover:bg-white hover:shadow-xl">
<div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
</div>
<div>
<span className="text-xs font-bold text-outline uppercase tracking-widest block mb-1">Volume Ideal</span>
<h4 className="text-2xl font-bold text-primary font-headline">500ml</h4>
<p className="text-xs text-on-surface-variant mt-2">Ingestão matinal aumenta o metabolismo em 30% nos primeiros 60 min.</p>
</div>
</div>
{/* Wide Insight Card */}
<div className="md:col-span-12 flex flex-col md:flex-row gap-8 items-center bg-primary text-on-primary p-8 rounded-xl shadow-2xl relative overflow-hidden">
{/* Abstract Background Pattern */}
<div className="absolute top-0 right-0 opacity-10 translate-x-1/4 -translate-y-1/4">
<span className="material-symbols-outlined text-[20rem]" style={{ fontVariationSettings: "'FILL' 0" }}>waves</span>
</div>
<div className="flex-shrink-0 w-24 h-24 rounded-full border-2 border-primary-fixed-dim/30 flex items-center justify-center p-2">
<div className="w-full h-full rounded-full bg-secondary flex items-center justify-center shadow-lg">
<span className="material-symbols-outlined text-white text-4xl">bolt</span>
</div>
</div>
<div className="relative z-10">
<h3 className="text-2xl font-headline font-bold mb-2">Combustão Celular</h3>
<p className="text-on-primary-container text-opacity-90 max-w-xl leading-relaxed">
                        A água é essencial para a <span className="text-secondary-fixed-dim font-bold">lipólise</span> — o processo metabólico de queima de gordura. Sem ela, seu corpo reduz a velocidade de processamento para conservar energia.
                    </p>
</div>
</div>
</div>
{/* Call to Action Section */}
<div className="mt-16 text-center">
<button className="w-full md:w-auto min-w-[300px] h-16 bg-primary text-on-primary rounded-xl font-headline font-bold text-lg shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 px-12 group">
                Entendi
                <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
</button>
<p className="mt-6 text-on-surface-variant text-sm font-medium">Próximo: Definindo sua meta diária personalizada</p>
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

export default NuraEducaOHidrataO;
