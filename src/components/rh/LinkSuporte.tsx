// =====================================================
// Malama — "Falar com o suporte", com o contexto junto
//
// Existe para que nenhuma tela de bloqueio volte a terminar em "entre em
// contato com a Malama" sem dizer como. Cada uso informa o que a pessoa
// estava tentando fazer, e isso vai no assunto do e-mail — o atendimento
// começa sabendo do que se trata, em vez de gastar a primeira resposta
// perguntando.
// =====================================================

import React from 'react';
import { LifeBuoy } from 'lucide-react';
import { linkSuporte, type ContextoSuporte } from '../../lib/suporteMalama';
import { useRhJornada } from '../../contexts/RhJornadaContext';

export const LinkSuporte: React.FC<{
  assunto: string;
  detalhe?: string;
  rotulo?: string;
  className?: string;
}> = ({ assunto, detalhe, rotulo = 'Falar com o suporte', className }) => {
  // A empresa vem da jornada, que o layout já carregou. Em tela de bloqueio
  // ela pode ser nula — e aí o e-mail sai sem o nome, que é melhor do que
  // não sair.
  const { empresa } = useRhJornada();
  const ctx: ContextoSuporte = { empresa: empresa?.nome, assunto, detalhe };

  return (
    <a
      href={linkSuporte(ctx)}
      className={className ?? 'mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#7d4a3c] transition hover:bg-gray-50'}
    >
      <LifeBuoy className="h-4 w-4" /> {rotulo}
    </a>
  );
};
