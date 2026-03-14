import React from 'react';
import { AppView } from '../types';

interface VisualEvolutionProps {
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

export const VisualEvolution: React.FC<VisualEvolutionProps> = ({ onBack, onNavigate }) => {
  return (
    <div className="relative flex flex-col h-full min-h-screen w-full max-w-md mx-auto bg-[#FDFBF9] dark:bg-[#152024] shadow-2xl overflow-hidden font-display animate-fade-in transition-colors duration-300">
      
      {/* Top App Bar */}
      <header className="flex items-center justify-between p-6 pb-2 bg-transparent z-10">
        <button 
          onClick={onBack}
          className="flex items-center justify-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[#111618] dark:text-white" style={{ fontSize: '24px' }}>arrow_back</span>
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-[#111618] dark:text-white">Evolução</h1>
        <button className="flex items-center justify-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-[#111618] dark:text-white" style={{ fontSize: '24px' }}>more_horiz</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col px-6 pt-4 pb-8 overflow-y-auto no-scrollbar">
        
        {/* Dates Header */}
        <div className="flex justify-between items-center mb-6 px-2 animate-fade-in-up">
          <div className="flex flex-col items-center w-1/2">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">Início</span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">12 JAN</span>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-2"></div>
          <div className="flex flex-col items-center w-1/2">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">Atual</span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">12 ABR</span>
          </div>
        </div>

        {/* Image Comparison Gallery */}
        <div className="grid grid-cols-2 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {/* Before Image Frame */}
          <div className="relative group cursor-pointer">
            <div className="aspect-[9/16] w-full rounded-xl overflow-hidden shadow-sm bg-gray-100 dark:bg-gray-800 border-4 border-white dark:border-[#1e2930] transition-transform duration-300 hover:scale-[1.02]">
              <div 
                className="w-full h-full bg-cover bg-center" 
                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBJ9AMrl2iYBCoa6gVp0XmrfbUPcbdt3Ajxd81T9_U7hHTjp4vgzc_tMbPKwB84tva-atJPDgofRr6uEiusDD3L7A3N3hmUmQZ4DHFNH0pTvzam_iCy5Gkm-zBMyug6XhQ6Z7WM2RIe5REZ2AVVKk0vEBjb0X8a60wEPCgbGA4P_L-XQMyd-fFX66XCY7FqiJBRPZOtCg77Abg63HVQy4UoC2Z8oxh2kyS3ETM3uMsu0ChOHJ3BtuwvaVp-Sw7Gubp3Rdtl2s3EJNo')" }}
              ></div>
            </div>
            {/* Subtle overlay label */}
            <div className="absolute bottom-3 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full">Antes</span>
            </div>
          </div>

          {/* After Image Frame */}
          <div className="relative group cursor-pointer">
            <div className="aspect-[9/16] w-full rounded-xl overflow-hidden shadow-sm bg-gray-100 dark:bg-gray-800 border-4 border-white dark:border-[#1e2930] ring-1 ring-primary/20 dark:ring-primary/40 transition-transform duration-300 hover:scale-[1.02]">
              <div 
                className="w-full h-full bg-cover bg-center" 
                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBawMmAqrZ1VOFxDHhGcM-5rQ8FxzDb7MVFvOjnqG9AZ3DCS3_fIqI36vvPsaDWNENBGxzuj7tZVS4rfUdVd1-n2OAZb27XvnU6M4BHIzCuuUYwdGHJFqgTuiC3l7U-Co55Y4vl2rpq5hh99eb1ca8rHa4GxwtGBJ9QSOJlNWOQFPSpp_5pe5PIFBHsnspW65mfFM_1A5w-J_bKIFi35OXnUNsQM0cATWBL3GqRm5M59uHKTy5vcuMUdZhi96ZPUrdYB8XvNr9jUoI')" }}
              ></div>
            </div>
            {/* Subtle overlay label */}
            <div className="absolute bottom-3 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="bg-primary/80 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full">Depois</span>
            </div>
          </div>
        </div>

        {/* Flow Summary Text */}
        <div className="flex flex-col items-center justify-center text-center space-y-3 mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="inline-flex items-center justify-center size-10 rounded-full bg-primary/10 dark:bg-primary/20 mb-2 text-primary">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>timer</span>
          </div>
          <h2 className="text-2xl font-bold text-[#111618] dark:text-white tracking-tight">90 dias de consistência</h2>
          <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed max-w-[280px]">
              Você manteve o <span className="text-primary font-medium">Flow</span> ativo e transformou sua rotina completamente.
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-auto flex justify-center w-full animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <button 
            onClick={() => onNavigate(AppView.VISUAL_SHARE)}
            className="relative w-full max-w-[320px] group overflow-hidden rounded-xl bg-primary shadow-lg shadow-primary/20 hover:shadow-xl transition-all duration-300 active:scale-95 p-4 flex items-center justify-center gap-3"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <span className="material-symbols-outlined text-white relative z-10" style={{ fontSize: '20px' }}>share</span>
            <span className="text-white font-semibold tracking-wide text-sm uppercase relative z-10">Gerar Card de Compartilhamento</span>
          </button>
        </div>

      </main>

      {/* Optional Minimal Bottom Navigation Indicator */}
      <div className="h-6 w-full flex items-center justify-center pb-2 opacity-30">
        <div className="h-1 w-1/3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
      </div>

    </div>
  );
};