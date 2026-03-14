import React, { useRef } from 'react';
import html2canvas from 'html2canvas';

interface VisualShareProps {
  onBack: () => void;
}

export const VisualShare: React.FC<VisualShareProps> = ({ onBack }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (cardRef.current) {
      await new Promise(r => setTimeout(r, 100)); // Wait for render
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#F9F8F6',
      });
      const link = document.createElement('a');
      link.download = `nura-evolution-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const renderConsistencyGrid = (opacity: string) => (
    <div className={`grid grid-cols-12 gap-[3px] ${opacity}`}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className={`aspect-square rounded-[1px] ${i === 3 && opacity.includes('60') ? 'bg-nura-petrol/40' : 'bg-nura-petrol'}`}></div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#e0e0e0] dark:bg-[#0a0a0a] flex flex-col justify-center items-center overflow-hidden font-sans animate-fade-in">
      
      {/* Container for the Card - Centered */}
      <div 
        ref={cardRef}
        className="relative w-full max-w-md aspect-[9/16] bg-[#F9F8F6] shadow-2xl overflow-hidden flex flex-col mx-auto my-auto"
      >
        {/* Border Frame */}
        <div className="absolute inset-4 border border-nura-border/30 z-20 pointer-events-none rounded-[2px]"></div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col px-8 py-10 z-10 h-full justify-between">
          
          {/* Header */}
          <div className="text-center mt-10 relative">
            <div className="w-px h-8 bg-nura-border/30 mx-auto mb-4"></div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-nura-border mb-3 font-medium">Jornada Feed the Flow</p>
            <h1 className="font-serif text-5xl text-nura-petrol leading-[1.05]">
              90 Dias<br/>
              <span className="italic font-light text-nura-dark text-4xl">de Flow</span>
            </h1>
          </div>

          {/* Images Grid */}
          <div className="flex-1 flex items-center justify-center my-6">
            <div className="grid grid-cols-2 gap-4 w-full">
              {/* Before */}
              <div className="flex flex-col gap-3 group">
                <div className="relative aspect-[9/16] bg-white border border-nura-border/20 shadow-frame p-1.5">
                  <div className="w-full h-full bg-cover bg-center filter grayscale-[10%] contrast-[0.95]" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBJ9AMrl2iYBCoa6gVp0XmrfbUPcbdt3Ajxd81T9_U7hHTjp4vgzc_tMbPKwB84tva-atJPDgofRr6uEiusDD3L7A3N3hmUmQZ4DHFNH0pTvzam_iCy5Gkm-zBMyug6XhQ6Z7WM2RIe5REZ2AVVKk0vEBjb0X8a60wEPCgbGA4P_L-XQMyd-fFX66XCY7FqiJBRPZOtCg77Abg63HVQy4UoC2Z8oxh2kyS3ETM3uMsu0ChOHJ3BtuwvaVp-Sw7Gubp3Rdtl2s3EJNo')" }}></div>
                </div>
                <div className="flex items-center justify-center gap-2 opacity-80">
                  <span className="font-serif italic text-nura-border text-sm">Início</span>
                </div>
              </div>
              
              {/* After */}
              <div className="flex flex-col gap-3 group">
                <div className="relative aspect-[9/16] bg-white border border-nura-petrol/20 shadow-frame p-1.5">
                  <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBawMmAqrZ1VOFxDHhGcM-5rQ8FxzDb7MVFvOjnqG9AZ3DCS3_fIqI36vvPsaDWNENBGxzuj7tZVS4rfUdVd1-n2OAZb27XvnU6M4BHIzCuuUYwdGHJFqgTuiC3l7U-Co55Y4vl2rpq5hh99eb1ca8rHa4GxwtGBJ9QSOJlNWOQFPSpp_5pe5PIFBHsnspW65mfFM_1A5w-J_bKIFi35OXnUNsQM0cATWBL3GqRm5M59uHKTy5vcuMUdZhi96ZPUrdYB8XvNr9jUoI')" }}></div>
                  <div className="absolute -top-1 -right-1 size-2.5 bg-nura-petrol rounded-full border-2 border-nura-bg shadow-sm"></div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-serif italic text-nura-petrol text-sm font-medium">Atual</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Stats & Brand */}
          <div className="space-y-8 mb-6">
            <div className="space-y-3">
              <div className="flex justify-between items-end text-nura-petrol px-1 border-b border-nura-border/10 pb-2">
                <span className="text-[10px] font-semibold tracking-widest uppercase opacity-60">Consistência</span>
                <span className="font-serif text-lg italic">Nível Premium</span>
              </div>
              <div className="flex flex-col gap-1">
                {renderConsistencyGrid("opacity-90")}
                {renderConsistencyGrid("opacity-60")}
              </div>
            </div>
            
            <div className="text-center pt-2">
              <div className="inline-block border-y border-nura-border/20 py-2 px-6">
                <h3 className="font-serif font-bold text-xl text-nura-dark tracking-tight leading-none">NURA</h3>
                <p className="text-[8px] tracking-[0.45em] uppercase text-nura-border mt-1">Feed the Flow</p>
              </div>
            </div>
          </div>
        </div>

        {/* Texture Overlay */}
        <div className="absolute inset-0 z-30 pointer-events-none opacity-[0.03] mix-blend-multiply bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBqD0_umvkasmVePOrmlzoifzrsjK9oCMbWXNWXH0M_hwzza3JvypV909zm3DzqLUWBCfA2Ucttg8WwpA6GjwLNyQkRKEXUJa1e0E9S0mkh5Pih3lzSIa0UobLSaBn2bvT56xj88DT-gE7lZ_nZj5bxrYx7dX12-3MGH92WHUr7j9h57ZvHK1dBNBs3psUr2up_3XA3MbbCTIIS6BFJrIsy2vsZQv1J-GMJzpltZg-Zatzd62zyNus6uJQT-NQgl1KhSB7PaMQfpco')" }}></div>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-6 left-0 w-full px-6 z-50 flex justify-center gap-3">
        <button 
          onClick={onBack}
          className="flex items-center justify-center size-12 rounded-full bg-white text-nura-dark shadow-lg hover:bg-gray-100 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <button 
          onClick={handleDownload}
          className="flex-1 max-w-sm bg-nura-petrol hover:bg-[#153a44] text-white font-bold text-base py-3 rounded-xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
        >
          <span className="material-symbols-outlined group-hover:-translate-y-0.5 transition-transform">download</span>
          Salvar Card Premium
        </button>
      </div>

    </div>
  );
};