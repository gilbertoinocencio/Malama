// =====================================================
// Malama — Dossiê NR-1: o que já se sustenta e o que falta
//
// Não é score de gamificação e não vira nota: é completude de EVIDÊNCIA. O
// medo real do RH é fiscalização, e a pergunta que ele quer respondida é
// "se me pedirem agora, o que eu mostro e o que falta?".
//
// Cada linha diz o que a norma exige, como a empresa comprova aqui dentro e
// — quando não fecha — por que não fecha. Uma barra sem essa terceira parte
// vira ansiedade sem saída.
// =====================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, EyeOff, FolderCheck, HelpCircle } from 'lucide-react';
import { dossieNr1, type DadosJornada } from '../../lib/rhJornada';

export const DossieNr1Card: React.FC<{ dados: DadosJornada }> = ({ dados }) => {
  const etapas = dossieNr1(dados);
  // Etapa que este acesso não enxerga sai da conta inteira: contá-la como
  // feita seria mentira, e como pendente seria acusar sem base.
  const avaliaveis = etapas.filter(e => !e.desconhecido);
  const prontas = avaliaveis.filter(e => e.ok).length;
  const pct = avaliaveis.length > 0 ? Math.round((prontas / avaliaveis.length) * 100) : 0;
  const proxima = avaliaveis.find(e => !e.ok);

  return (
    <section className="rounded-xl bg-white p-5 shadow" aria-labelledby="dossie-titulo">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <FolderCheck className="h-5 w-5 shrink-0 text-[#7d4a3c]" />
          <h2 id="dossie-titulo" className="font-semibold text-gray-800">Dossiê NR-1 da empresa</h2>
        </div>
        <Link to="/rh/nr1" className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition hover:text-[#7d4a3c]">
          <HelpCircle className="h-3.5 w-3.5" /> O que a norma exige
        </Link>
      </div>

      <p className="mt-1 text-sm leading-relaxed text-gray-500">
        Se a fiscalização pedir hoje, isto é o que a sua empresa consegue mostrar sobre riscos
        psicossociais. Não é nota nem selo — é o estado das evidências.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-[#7d4a3c] transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-xs font-medium tabular-nums text-gray-600">{prontas} de {avaliaveis.length}</span>
      </div>
      <p className="mt-1.5 text-xs text-gray-500">
        {proxima
          ? <>Ponto mais frágil agora: <strong className="text-gray-700">{proxima.exige.toLowerCase()}</strong>.</>
          : 'Todas as etapas do ciclo têm evidência registrada. Continue revisando a cada novo período.'}
      </p>

      <ul className="mt-4 space-y-2">
        {etapas.map(e => {
          const pendente = !e.ok && !e.desconhecido;
          return (
            <li key={e.chave} className={`rounded-lg border p-3 ${pendente ? 'border-[#7d4a3c]/20 bg-[#7d4a3c]/[0.03]' : 'border-gray-100'}`}>
              <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                {e.desconhecido
                  ? <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                  : e.ok
                    ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${pendente ? 'text-gray-900' : 'text-gray-700'}`}>{e.exige}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{e.comprova}</p>
                  {e.desconhecido && (
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">
                      Seu acesso não enxerga esta parte, então ela não entra na conta. Quem tem a
                      permissão consegue confirmar.
                    </p>
                  )}
                  {pendente && <p className="mt-1 text-xs leading-relaxed text-[#7d4a3c]">{e.pendencia}</p>}
                </div>
                {pendente && (
                  <Link
                    to={e.destino}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#7d4a3c] hover:underline"
                  >
                    Resolver <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
        Evidência documental complementar. Não substitui o PGR, o PCMSO, o SESMT nem o médico do
        trabalho, e a classificação formal de risco continua sendo da empresa e dos seus
        responsáveis técnicos.
      </p>
    </section>
  );
};
