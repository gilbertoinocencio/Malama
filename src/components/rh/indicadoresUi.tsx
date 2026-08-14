// =====================================================
// Malama — Peças compartilhadas dos indicadores do RH
//
// Os painéis de bem-estar (WHO-5) e de exposição (JSS) explicam números
// da mesma forma: régua 0–100 com uma marca de referência e um bloco
// "como ler" que pode ser aberto sem poluir a tela de quem já sabe ler.
// Mantido em um lugar só para que os dois cards não divirjam com o tempo.
// =====================================================

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

/** Régua 0–100 com marca opcional de referência (mediana, ponto de corte). */
export const Regua: React.FC<{
  valor: number;
  cor: string;
  marca?: number | null;
  marcaTitulo?: string;
}> = ({ valor, cor, marca, marcaTitulo }) => (
  <div className="relative mt-2 h-1.5 w-full rounded-full bg-gray-100">
    <div className="h-full rounded-full" style={{ width: `${valor}%`, background: cor }} />
    {marca != null && (
      <span
        className="absolute -top-1 h-3.5 w-px bg-gray-500"
        style={{ left: `${marca}%` }}
        title={marcaTitulo}
      />
    )}
  </div>
);

/** Seção do painel explicativo: título curto em caixa alta + texto. */
export const BlocoExplicativo: React.FC<{
  titulo: string;
  children: React.ReactNode;
}> = ({ titulo, children }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{titulo}</p>
    <div className="mt-1">{children}</div>
  </div>
);

/** Painel "como ler estes números", fechado por padrão. */
export const ComoLer: React.FC<{
  label?: string;
  children: React.ReactNode;
}> = ({ label = 'Como ler estes números', children }) => {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        onClick={() => setAberto(a => !a)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#7d4a3c] hover:underline"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        {label}
        {aberto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {aberto && (
        <div className="mt-3 space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
          {children}
        </div>
      )}
    </>
  );
};
