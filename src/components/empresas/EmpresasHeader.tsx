// =====================================================
// Malama Empresas — cabeçalho compartilhado das landings B2B
//
// FONTE ÚNICA da navegação entre os modos contratáveis (Metabólico e
// Mental). Existe como componente, e não copiado em cada página, porque
// aba nova precisa aparecer nas DUAS no mesmo commit — uma landing que
// não lista o outro modo é um modo que o comprador nunca descobre.
// =====================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

export type AbaEmpresas = 'metabolico' | 'mental';

const ABAS: { id: AbaEmpresas; to: string; label: string; curto: string }[] = [
  { id: 'metabolico', to: '/empresas', label: 'Saúde Metabólica', curto: 'Metabólica' },
  { id: 'mental', to: '/empresas/saude-mental', label: 'Saúde Mental', curto: 'Mental' },
];

/** Rola até o formulário de contato — as duas landings têm `id="contato"`. */
export const scrollToContato = () =>
  document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });

export const EmpresasHeader: React.FC<{ aba: AbaEmpresas }> = ({ aba }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const irParaContato = () => {
    scrollToContato();
    setIsMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b border-transparent ${
        scrolled ? 'bg-Malama-bg/80 backdrop-blur-xl border-Malama-border/50 py-4' : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between">
          <Link to="/" className="relative z-10 flex items-center gap-2">
            <img
              src="/malama-logo-transparent.png"
              alt="Malama"
              className="h-[190px] w-auto max-w-none object-contain -my-[70px]"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className="text-sm font-medium tracking-wide text-Malama-muted hover:text-Malama-petrol transition-colors"
            >
              A Plataforma
            </Link>

            {/* Alternador de modo. A aba ativa é a página em que se está —
                nunca as duas acesas, para não sugerir que o conteúdo é o mesmo. */}
            <div className="flex items-center gap-1 p-1 rounded-full border border-Malama-border bg-white/60 backdrop-blur-sm">
              {ABAS.map(t => (
                <Link
                  key={t.id}
                  to={t.to}
                  aria-current={aba === t.id ? 'page' : undefined}
                  className={`px-4 py-2 rounded-full text-sm font-medium tracking-wide transition-colors ${
                    aba === t.id
                      ? 'bg-Malama-main text-white'
                      : 'text-Malama-muted hover:text-Malama-petrol'
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>

            <button
              onClick={irParaContato}
              className="text-sm font-medium tracking-wide text-Malama-petrol border-b border-Malama-petrol/40"
            >
              Falar com especialista
            </button>
          </nav>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            className="md:hidden relative z-10 p-2 text-Malama-main"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-Malama-bg border-b border-Malama-border/50 shadow-2xl py-8 px-6 flex flex-col gap-6"
          >
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-xl font-serif text-Malama-main">
              A Plataforma
            </Link>
            {ABAS.map(t => (
              <Link
                key={t.id}
                to={t.to}
                onClick={() => setIsMenuOpen(false)}
                className={`text-xl font-serif ${aba === t.id ? 'text-Malama-petrol' : 'text-Malama-main'}`}
              >
                {t.label}
              </Link>
            ))}
            <button onClick={irParaContato} className="text-left text-xl font-serif text-Malama-petrol">
              Falar com especialista
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
