import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraProjeODeSucesso: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    
      <div className="flex flex-col h-full bg-surface text-on-surface">
        <header className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow pt-24 pb-32 px-6 max-w-2xl mx-auto w-full">
          
{/* Contextual Leaf (Decorative Element) */}
<div className="absolute -right-20 top-40 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl -z-10"></div>
<div className="absolute -left-20 bottom-20 w-80 h-80 bg-primary-fixed/10 rounded-full blur-3xl -z-10"></div>
{/* Editorial Header */}
<section className="mb-12">
<h2 className="text-4xl md:text-5xl font-extrabold font-lexend text-primary leading-tight tracking-tight mb-4">
                Sua Projeção de Sucesso
            </h2>
<p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
                Baseado no seu perfil metabólico, desenhamos o caminho para sua transformação nos próximos 3 meses.
            </p>
</section>
{/* Main Chart Section (Bento Grid Style) */}
<div className="grid grid-cols-1 gap-6">
{/* Elegant Projection Card */}
<div className="bg-surface-container-lowest rounded-lg p-8 shadow-[0_16px_32px_rgba(0,0,0,0.02)] border border-outline-variant/10 relative overflow-hidden">
<div className="flex justify-between items-end mb-12">
<div>
<p className="text-sm font-label uppercase tracking-widest text-on-surface-variant mb-1">Meta Estimada</p>
<p className="text-4xl font-lexend font-bold text-secondary">-8.5kg</p>
</div>
<div className="text-right">
<p className="text-sm font-label text-on-surface-variant">Data Alvo</p>
<p className="text-xl font-lexend font-medium text-primary">12 Semanas</p>
</div>
</div>
{/* Custom Visual Chart (SVG for Precision) */}
<div className="relative h-64 w-full mt-8">
<svg className="w-full h-full drop-shadow-sm" viewbox="0 0 400 150">
{/* Grid Lines */}
<line className="text-surface-container-highest" stroke="currentColor" stroke-dasharray="4" x1="0" x2="400" y1="20" y2="20"></line>
<line className="text-surface-container-highest" stroke="currentColor" stroke-dasharray="4" x1="0" x2="400" y1="60" y2="60"></line>
<line className="text-surface-container-highest" stroke="currentColor" stroke-dasharray="4" x1="0" x2="400" y1="100" y2="100"></line>
{/* Gradient Fill */}
<defs>
<lineargradient id="chartGradient" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" style={{}}></stop>
<stop offset="100%" style={{}}></stop>
</lineargradient>
</defs>
{/* Path Area */}
<path d="M0,20 L50,25 L100,45 L150,55 L200,80 L250,90 L300,115 L350,125 L400,140 L400,150 L0,150 Z" fill="url(#chartGradient)"></path>
{/* Main Line */}
<path d="M0,20 L50,25 L100,45 L150,55 L200,80 L250,90 L300,115 L350,125 L400,140" fill="none" stroke="#006d36" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"></path>
{/* Pulse Point (Current Target) */}
<circle className="fill-secondary shadow-lg" cx="400" cy="140" r="6"></circle>
<circle className="fill-secondary/20 animate-pulse" cx="400" cy="140" r="12"></circle>
</svg>
{/* X-Axis Labels */}
<div className="flex justify-between mt-4 text-[10px] font-label text-stone-400 uppercase tracking-tighter">
<span>Hoje</span>
<span>Semana 4</span>
<span>Semana 8</span>
<span>Semana 12</span>
</div>
</div>
</div>
{/* Insight Stats Bento */}
<div className="grid grid-cols-2 gap-4">
<div className="bg-surface-container-low p-6 rounded-lg flex flex-col gap-2">
<span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
<p className="text-xs font-label text-on-surface-variant">Metabolismo</p>
<p className="text-xl font-lexend font-semibold text-primary">+14% Eficiência</p>
</div>
<div className="bg-surface-container-low p-6 rounded-lg flex flex-col gap-2">
<span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
<p className="text-xs font-label text-on-surface-variant">Saúde Celular</p>
<p className="text-xl font-lexend font-semibold text-primary">Nível Ótimo</p>
</div>
</div>
{/* Goal Milestone Card */}
<div className="flex items-center gap-6 p-6 bg-primary-container/10 rounded-lg border border-primary-container/20">
<div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-primary-fixed text-3xl">auto_awesome</span>
</div>
<div>
<h4 className="font-lexend font-bold text-primary">Seu "Novo Eu" em 90 dias</h4>
<p className="text-sm text-on-surface-variant">72% dos usuários NURA alcançam a meta projetada mantendo a consistência sugerida.</p>
</div>
</div>
</div>
{/* Spacer for FAB/Button Area */}
<div className="h-12"></div>

        </main>
        
        <footer className="fixed bottom-0 left-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             
<div className="max-w-2xl mx-auto">
<button className="w-full bg-primary hover:bg-primary-container text-on-primary font-lexend font-bold py-5 rounded-xl transition-all duration-300 transform active:scale-95 shadow-xl shadow-primary/10 flex items-center justify-center gap-2 group">
                Continuar
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
</button>
<p className="text-center mt-4 text-xs font-label text-stone-400">
                Dados baseados em modelos científicos de termogênese aplicada.
            </p>
</div>

          </div>
        </footer>
      </div>
  
  );
};

export default NuraProjeODeSucesso;
