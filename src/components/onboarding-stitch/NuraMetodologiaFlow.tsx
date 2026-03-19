import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraMetodologiaFlow: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const features = [
    {
      icon: 'auto_awesome',
      title: 'IA Personalizada',
      desc: 'Algoritmos que aprendem com você e se adaptam à sua rotina em tempo real.',
      color: 'secondary',
    },
    {
      icon: 'monitoring',
      title: 'Evidência Científica',
      desc: 'Cada recomendação é baseada em estudos revisados por pares e validada por nutricionistas.',
      color: 'primary',
    },
    {
      icon: 'spa',
      title: 'Sem Restrição',
      desc: 'Equilíbrio em vez de privação. Nenhum alimento é proibido no método NURA.',
      color: 'tertiary',
    },
    {
      icon: 'group',
      title: 'Suporte Contínuo',
      desc: 'Acesso a especialistas e uma comunidade engajada no seu bem-estar.',
      color: 'secondary',
    },
  ];

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen selection:bg-secondary-container">
      {/* Sutil Flow Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container-high z-[60]">
        <div className="h-full bg-secondary w-4/5"></div>
      </div>

      {/* Top Navigation Anchor */}
      <nav className="fixed top-0 w-full z-50 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20 w-full">
        <div className="flex items-center gap-2">
          <button onClick={onBack}>
            <span className="material-symbols-outlined text-teal-900">close</span>
          </button>
        </div>
        <span className="font-lexend tracking-tight font-medium text-2xl font-bold tracking-tighter text-teal-900">NURA</span>
        <div className="w-10"></div>
      </nav>

      <main className="relative pt-32 pb-40 px-6 max-w-4xl mx-auto overflow-hidden">
        {/* Background Elements */}
        <div className="contextual-leaf w-64 h-64 -top-20 -left-20 absolute -z-10" style={{
          filter: 'blur(40px)',
          opacity: 0.15,
          background: '#83fba5',
          borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%'
        }}></div>
        <div className="contextual-leaf w-96 h-96 top-1/2 -right-32 absolute -z-10" style={{
          filter: 'blur(40px)',
          opacity: 0.15,
          background: '#83fba5',
          borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%'
        }}></div>

        {/* Header Section */}
        <header className="mb-16 space-y-6">
          <h1 className="font-lexend text-4xl md:text-5xl lg:text-6xl text-primary font-bold tracking-tight leading-tight">
            O que torna o <span className="text-secondary">NURA</span> diferente?
          </h1>
          <p className="text-on-surface-variant text-xl md:text-2xl font-light max-w-2xl leading-relaxed">
            Nossa metodologia foi desenhada para quem busca harmonia, não restrição.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {features.map((feat, i) => (
            <div
              key={i}
              className={`bg-surface-container-lowest p-8 rounded-xl shadow-[0_16px_32px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                i === 0 ? 'md:col-span-2' : ''
              }`}
            >
              <div className={`w-14 h-14 rounded-xl bg-${feat.color}-container/20 flex items-center justify-center mb-6`}>
                <span className={`material-symbols-outlined text-${feat.color} text-3xl`} style={{ fontVariationSettings: "'FILL' 1" }}>{feat.icon}</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-primary mb-3">{feat.title}</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-primary text-on-primary p-8 rounded-xl relative overflow-hidden mb-8">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-container rounded-full blur-3xl opacity-50"></div>
          <div className="relative z-10">
            <h3 className="font-headline text-2xl font-bold mb-3">Nosso Compromisso</h3>
            <p className="text-primary-fixed-dim leading-relaxed">
              Transformar sua relação com a comida. Sem dietas extremas, sem culpa — apenas ciência aplicada ao seu estilo de vida.
            </p>
          </div>
        </div>
      </main>

      <footer className="shrink-0 w-full p-6 bg-surface/90 backdrop-blur-md z-10">
        <div className="max-w-2xl mx-auto">
          <button onClick={onNext} className="w-full h-16 bg-primary text-on-primary font-headline font-bold text-lg rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group">
            Continuar
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraMetodologiaFlow;
