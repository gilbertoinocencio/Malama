// =====================================================
// Malama Empresas — rodapé compartilhado das landings B2B
// =====================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { MalamaLogo } from '../MalamaLogo';

export const EmpresasFooter: React.FC<{ tagline: string }> = ({ tagline }) => (
  <footer className="border-t border-Malama-border py-12 px-6 md:px-12">
    <div className="max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <MalamaLogo size="sm" />
          <p className="text-xs text-Malama-muted">{tagline}</p>
        </div>
        <div className="flex items-center gap-6 text-xs text-Malama-muted">
          <Link to="/empresas" className="hover:text-Malama-petrol transition-colors">Saúde Metabólica</Link>
          <Link to="/empresas/saude-mental" className="hover:text-Malama-petrol transition-colors">Saúde Mental</Link>
          <Link to="/privacidade" className="hover:text-Malama-petrol transition-colors">Privacidade</Link>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-Malama-border/50 text-center text-xs text-Malama-muted/60">
        © {new Date().getFullYear()} Malama. Todos os direitos reservados.
      </div>
    </div>
  </footer>
);
