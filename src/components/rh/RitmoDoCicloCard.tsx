// =====================================================
// Malama — O ritmo do ciclo da empresa
//
// O tabuleiro do RH é o calendário, não um placar: a pergunta que ele traz
// para a reunião é "estou atrasado?", não "qual é a minha nota". Cada linha
// é um compromisso recorrente com estado honesto — inclusive "vencido",
// que é a informação mais útil das quatro.
//
// Sem pontos, sem ofensiva, sem comparação entre setores. Ver o cabeçalho
// de lib/rhJornada.ts para o porquê.
// =====================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, CheckCircle2, CircleDot, Clock, AlertTriangle } from 'lucide-react';
import { ritmoDoCiclo, type CompromissoRitmo, type SituacaoRitmo } from '../../lib/rhJornada';
import type { DadosJornada } from '../../lib/rhJornada';

const ESTILO: Record<SituacaoRitmo, { rotulo: string; classe: string; Icone: React.ElementType }> = {
  em_andamento: { rotulo: 'Em andamento', classe: 'text-green-700 bg-green-50 border-green-100', Icone: CircleDot },
  em_dia:       { rotulo: 'Em dia',       classe: 'text-gray-600 bg-gray-50 border-gray-100',    Icone: CheckCircle2 },
  pendente:     { rotulo: 'Ainda não começou', classe: 'text-[#7d4a3c] bg-[#7d4a3c]/5 border-[#7d4a3c]/15', Icone: Clock },
  vencido:      { rotulo: 'Passou do prazo',   classe: 'text-amber-800 bg-amber-50 border-amber-200', Icone: AlertTriangle },
  // Vermelho, e não âmbar: aqui o ciclo está PARADO, não atrasado. Enquanto
  // a campanha não for encerrada não há relatório, nem tendência, nem
  // hipótese — e é um clique que destrava tudo isso.
  aguardando_encerramento: {
    rotulo: 'Coleta encerrada — falta fechar', classe: 'text-red-700 bg-red-50 border-red-200', Icone: AlertTriangle,
  },
};

const Linha: React.FC<{ item: CompromissoRitmo }> = ({ item }) => {
  const { rotulo, classe, Icone } = ESTILO[item.situacao];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-gray-100 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{item.nome}</span>
          <span className="text-[11px] text-gray-400">{item.cadencia}</span>
          {/* Cor nunca sozinha: ícone + palavra, para ler em preto e branco. */}
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${classe}`}>
            <Icone className="h-3 w-3" /> {rotulo}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{item.proposito}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400">{item.detalhe}</p>
      </div>
      {/* `pronto === false`: a próxima medição ainda está longe (ver
          `prontoParaPreparar`). Sem link — um botão sempre ativo não
          distingue "pode começar agora" de "só daqui a 80 dias", e o
          `detalhe` acima já diz a partir de quando. */}
      {item.pronto === false ? (
        <span
          title="Ainda não é hora de preparar — veja a data acima"
          className="inline-flex shrink-0 cursor-default items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400"
        >
          {item.acao}
        </span>
      ) : (
        <Link
          to={item.destino}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#7d4a3c]/30 px-3 py-1.5 text-xs font-semibold text-[#7d4a3c] transition hover:bg-[#7d4a3c]/5"
        >
          {item.acao} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
};

export const RitmoDoCicloCard: React.FC<{ dados: DadosJornada }> = ({ dados }) => {
  const itens = ritmoDoCiclo(dados);
  if (itens.length === 0) return null;

  const atencao = itens.filter(i => i.situacao === 'vencido' || i.situacao === 'pendente').length;

  // Deixou de ser card próprio: mora dentro do card do ciclo, logo abaixo
  // da leitura inteligente. Dois cartões com "ciclo" no título, um embaixo
  // do outro, faziam o RH procurar a diferença entre eles em vez de ler
  // qualquer um dos dois.
  return (
    <section className="mt-5 border-t border-gray-100 pt-4" aria-labelledby="ritmo-titulo">
      <h3 id="ritmo-titulo" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#7d4a3c]">
        <CalendarClock className="h-3.5 w-3.5" /> Ritmo do ciclo
      </h3>
      <p className="mb-4 mt-1 text-sm leading-relaxed text-gray-500">
        A NR-1 não é um documento que se entrega uma vez: é um ciclo que se repete. Aqui está o
        que a sua empresa combinou de fazer e quando cada coisa é esperada de novo.{' '}
        {atencao > 0
          ? <strong className="text-gray-700">{atencao} item(ns) pedem atenção.</strong>
          : 'Nada em atraso no momento.'}
      </p>
      <div className="grid gap-2">
        {itens.map(item => <Linha key={item.chave} item={item} />)}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
        As datas saem das suas próprias campanhas — não são prazo legal. A norma pede periodicidade
        e revisão sempre que algo mudar no trabalho, sem fixar um calendário único.
      </p>
    </section>
  );
};
