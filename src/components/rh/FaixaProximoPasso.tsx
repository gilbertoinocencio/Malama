// =====================================================
// Malama — Faixa "próximo passo", fixa no cabeçalho do portal
//
// O guia completo mora no dashboard; esta faixa é o mesmo cérebro em uma
// linha, para quem está em qualquer outra aba não perder a bússola. Some no
// próprio dashboard, onde repetir seria ruído.
// =====================================================

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, AlertTriangle, Compass, HelpCircle } from 'lucide-react';
import { useRhJornada } from '../../contexts/RhJornadaContext';
import { proximoPasso } from '../../lib/rhJornada';

export const FaixaProximoPasso: React.FC = () => {
  const { pathname } = useLocation();
  const { dados, loading, empresa } = useRhJornada();

  // No dashboard o card completo já diz isso, com descrição e checklist.
  if (pathname === '/rh/dashboard' || loading || !empresa) return null;

  const passo = proximoPasso(dados);
  const alerta = passo.bloqueio === true;

  // Na própria aba Saúde Mental, o passo "medir" aponta para o mesmo lugar
  // que o card "Ciclo de cuidado da empresa" já mostra na tela — "Ver
  // participação"/"Divulgar de novo" e "Acompanhar"/"Preparar" levam ao
  // mesmo #campanhas. O título continua útil como resumo fixo ao rolar a
  // página; o botão duplicado é que não tem por quê existir aqui.
  const botaoRedundante = pathname === '/rh/saude-mental' && passo.etapa === 'medir';

  return (
    <div className={`border-t ${alerta ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-[#7d4a3c]/[0.04]'}`}>
      <div className="mx-auto flex w-full max-w-[1800px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
        {alerta
          ? <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          : <Compass className="h-4 w-4 shrink-0 text-[#7d4a3c]" />}
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${alerta ? 'text-amber-700' : 'text-[#7d4a3c]'}`}>
          Próximo passo
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-gray-700" title={passo.descricao}>
          {passo.titulo}
        </span>
        <Link
          to="/rh/nr1"
          title="Entenda o que a NR-1 exige e onde cada exigência é cumprida"
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition hover:text-[#7d4a3c]"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Entenda a NR-1</span>
        </Link>
        {passo.destino && !botaoRedundante && (
          <Link
            to={passo.destino}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${
              alerta ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#7d4a3c] hover:bg-[#623a2f]'
            }`}
          >
            {passo.acao} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
};
