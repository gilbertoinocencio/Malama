// =====================================================
// Malama — "Falar com o suporte", com o contexto junto
//
// Existe para que nenhuma tela de bloqueio volte a terminar em "entre em
// contato com a Malama" sem dizer como. Cada uso informa o que a pessoa
// estava tentando fazer, e isso vai no assunto do e-mail — o atendimento
// começa sabendo do que se trata, em vez de gastar a primeira resposta
// perguntando.
//
// NÃO É MAIS UM <a href="mailto:">. Era, e em quem não tem cliente de
// e-mail padrão configurado no sistema — comum em máquina de empresa,
// Windows recém-instalado — isso abria o seletor "Escolha um app para abrir
// este link" do próprio sistema operacional: uma tela do Windows, não da
// Malama, que não mostra o e-mail em lugar nenhum e deixa quem clicou sem
// saída.
//
// Não existe uma caixa de mensagem construída dentro do produto ainda, então
// o clique abre um CARTÃO com o endereço por extenso e um botão de copiar —
// funciona sempre, sem depender de nada instalado. O link mailto continua
// existindo, como segunda opção menor dentro do cartão, para quem tem
// Outlook ou Gmail configurado e prefere abrir por lá, com assunto e corpo
// já preenchidos a partir do contexto da tela.
// =====================================================

import React, { useEffect, useRef, useState } from 'react';
import { LifeBuoy, Copy, Mail, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { linkSuporte, EMAIL_SUPORTE, type ContextoSuporte } from '../../lib/suporteMalama';
import { useRhJornada } from '../../contexts/RhJornadaContext';

/**
 * O cartão em si. Compartilhado entre o botão de bloqueio (`LinkSuporte`) e
 * o botão do cabeçalho (`RhLayout`), para as duas superfícies mostrarem
 * exatamente o mesmo endereço do mesmo jeito.
 *
 * Fecha ao clicar fora, ao apertar Esc, ou pelo X — três saídas porque é um
 * elemento novo no produto e ainda não tem convenção própria estabelecida.
 */
export const CartaoSuporte: React.FC<{
  ctx: ContextoSuporte;
  aberto: boolean;
  onFechar: () => void;
  /** Header ancorado à direita da tela: o cartão abre para a esquerda do
   *  botão, não para fora da viewport. */
  alinhamento?: 'esquerda' | 'direita';
}> = ({ ctx, aberto, onFechar, alinhamento = 'direita' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    // 'pointerdown' e não 'mousedown': o segundo não cobre toque de forma
    // confiável em todos os navegadores, e este é justamente um controle
    // que aparece no cabeçalho do celular.
    const aoClicarFora = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onFechar();
    };
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('pointerdown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('pointerdown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto, onFechar]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL_SUPORTE);
      toast.success('E-mail copiado.');
    } catch {
      // Sem permissão de clipboard (raro, mas acontece): o endereço já está
      // escrito no cartão, então a pessoa ainda sai daqui com o que precisa.
      toast.error(`Não foi possível copiar. O e-mail é ${EMAIL_SUPORTE}`);
    }
  };

  if (!aberto) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Falar com o suporte"
      className={`absolute z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-4 text-left shadow-lg ${
        alinhamento === 'direita' ? 'right-0' : 'left-0'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">Fale com o suporte</p>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="-mr-1 -mt-1 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        Ainda não temos uma caixa de mensagem aqui dentro — escreva para o e-mail abaixo.
      </p>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
        <span className="truncate text-sm font-medium text-gray-700">{EMAIL_SUPORTE}</span>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
        >
          <Copy className="h-3.5 w-3.5" /> Copiar
        </button>
      </div>

      {/* Continua sendo um mailto de verdade — com assunto e corpo prontos,
          a partir do contexto da tela — para quem tem cliente de e-mail
          configurado e prefere esse caminho. Só deixou de ser a ÚNICA
          saída. */}
      <a
        href={linkSuporte(ctx)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#7d4a3c] hover:underline"
      >
        <Mail className="h-3.5 w-3.5" /> Ou abra no seu aplicativo de e-mail
      </a>
    </div>
  );
};

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
  const [aberto, setAberto] = useState(false);
  const ctx: ContextoSuporte = { empresa: empresa?.nome, assunto, detalhe };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        className={className ?? 'mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#7d4a3c] transition hover:bg-gray-50'}
      >
        <LifeBuoy className="h-4 w-4" /> {rotulo}
      </button>
      <CartaoSuporte ctx={ctx} aberto={aberto} onFechar={() => setAberto(false)} alinhamento="esquerda" />
    </div>
  );
};
