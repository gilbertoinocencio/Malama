// =====================================================
// Malama — "Entenda a NR-1", dentro do painel
//
// O conteúdo que explica a norma vivia só na landing de vendas. Quem já é
// cliente e está perdido não vai voltar para uma página de marketing: a
// dúvida acontece aqui dentro, e é aqui que ela precisa de resposta — com
// link para a tela onde cada exigência é cumprida.
//
// Escopo declarado de propósito: o que o Malama faz, o que NÃO faz, e o que
// continua sendo do SESMT. Prometer conformidade completa seria mentira e
// arriscaria mais o cliente do que ajudá-lo.
// =====================================================

import React, { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ArrowRight, BarChart3, CalendarClock, ClipboardList, Info, PlayCircle, Search,
  ShieldCheck, XCircle,
} from 'lucide-react';
import { useRhAccess } from '../../contexts/RhAccessContext';
import { PrimeiroAcessoRh } from '../../components/rh/PrimeiroAcessoRh';

const CICLO = [
  {
    n: '01', titulo: 'Identificar', Icone: Search,
    exige: 'Levantar quais fatores psicossociais existem no trabalho: cobrança, autonomia, apoio, jornada, assédio.',
    aqui: 'Uma campanha com questionário validado, aplicada por setor e por função.',
    onde: '/rh/saude-mental', ondeLabel: 'Saúde Mental',
  },
  {
    n: '02', titulo: 'Avaliar', Icone: BarChart3,
    exige: 'Dimensionar o risco por recorte, com método rastreável e reprodutível.',
    aqui: 'Escore calculado por fórmula (nunca por IA) e matriz de risco por setor, com o critério exposto na tela.',
    onde: '/rh/saude-mental#resultado-jss', ondeLabel: 'Resultado da carga de trabalho',
  },
  {
    n: '03', titulo: 'Controlar', Icone: ClipboardList,
    exige: 'Definir medidas com responsável, prazo e nível na hierarquia de controle — e executá-las.',
    aqui: 'Plano de ação que só encerra uma medida com evidência anexada.',
    onde: '/rh/plano-acao', ondeLabel: 'Plano de ação',
  },
  {
    n: '04', titulo: 'Verificar', Icone: CalendarClock,
    exige: 'Comprovar que a medida funcionou, reavaliando no período seguinte.',
    aqui: 'Reaplicação periódica, série histórica e o dossiê que mostra o que ainda não fecha.',
    onde: '/rh/compliance', ondeLabel: 'Compliance',
  },
];

const NAO_FAZ = [
  'Não substitui o PGR nem o inventário de riscos da empresa — é evidência que entra neles.',
  'Não substitui o PCMSO, o SESMT nem o médico do trabalho, e não é laudo pericial.',
  'Não emite diagnóstico clínico de ninguém: os resultados são sempre agregados e anônimos.',
  'Não prova que houve assédio, nem que alguém adoeceu por causa do trabalho.',
  'Não classifica formalmente o risco no GRO — essa decisão é da empresa e dos seus responsáveis técnicos.',
];

const DUVIDAS = [
  {
    p: 'A nota do meu setor está ruim. Isso é uma infração?',
    r: 'Não. A comparação é interna: as linhas do gráfico são o meio da sua própria empresa naquele período, então sempre existe setor dos dois lados — inclusive numa empresa saudável. O número serve para escolher por onde começar, não para dar nota nem para punir liderança.',
  },
  {
    p: 'Preciso de 100% de resposta?',
    r: 'Não, e perseguir isso atrapalha. Resposta obtida sob pressão enviesa o resultado, e é justamente a validade do instrumento que sustenta o relatório num questionamento. O que a norma pede é que a empresa avalie com método, não que todo mundo responda.',
  },
  {
    p: 'Posso ver quem respondeu o quê?',
    r: 'Não, e isso é proposital. Recorte com menos de cinco respondentes não sai do servidor, e o perfil de RH não tem permissão de leitura na tabela de respostas. É o que torna o dado confiável — e o que a LGPD exige de dado de saúde.',
  },
  {
    p: 'Ofereci apoio psicológico. Já cumpri a norma?',
    r: 'Não sozinho. Cuidado individual é a última camada da hierarquia de controle: ajuda a pessoa, mas não encerra um risco que nasce de como o trabalho está organizado. Por isso o dossiê cobra ao menos uma medida na fonte ou na organização do trabalho.',
  },
];

export const RhComoFunciona: React.FC = () => {
  const { can } = useRhAccess();
  const { abrirCopiloto } = useOutletContext<{ abrirCopiloto: () => void }>();
  // Rever a apresentação do primeiro acesso. Sem esta porta, quem clicou em
  // "Começar" sem ler perdia o enquadramento para sempre — e é justamente
  // quem tem pressa no primeiro dia que mais precisa dele depois.
  const [revendo, setRevendo] = useState(false);

  return (
    <div className="space-y-6">
      {revendo && (
        <PrimeiroAcessoRh
          onFechar={() => setRevendo(false)}
          onAbrirCopiloto={abrirCopiloto}
        />
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Entenda a NR-1 em cinco minutos</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-500">
            A NR-1 passou a tratar risco psicossocial como qualquer outro risco ocupacional: a empresa
            precisa <strong>identificar</strong>, <strong>avaliar</strong>, <strong>controlar</strong> e{' '}
            <strong>verificar</strong>. Não existe prova de conformidade que seja um documento só —
            o que se comprova é um ciclo que gira e deixa rastro. Esta página mostra o ciclo e onde,
            neste painel, cada parte dele acontece.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRevendo(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          <PlayCircle className="h-4 w-4" /> Rever a apresentação
        </button>
      </div>

      <section className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-1 font-semibold text-gray-800">O ciclo que a norma pede</h2>
        <p className="mb-4 text-sm text-gray-500">
          Quatro etapas que se repetem. Pular uma é o erro mais comum — em geral a terceira, quando
          a empresa mede, arquiva o relatório e não muda nada.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {CICLO.map(e => (
            <div key={e.n} className="rounded-lg border border-gray-100 p-4">
              <div className="flex items-center gap-2">
                <e.Icone className="h-4 w-4 shrink-0 text-[#7d4a3c]" />
                <span className="text-xs font-semibold text-gray-400">{e.n}</span>
                <span className="font-semibold text-gray-800">{e.titulo}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-gray-600"><strong className="text-gray-700">A norma pede:</strong> {e.exige}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-600"><strong className="text-gray-700">Aqui vira:</strong> {e.aqui}</p>
              <Link to={e.onde} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#7d4a3c] hover:underline">
                Ir para {e.ondeLabel} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow">
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#7d4a3c]" />
          <h2 className="font-semibold text-gray-800">Onde você comprova cada coisa</h2>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          O dossiê acompanha isso automaticamente e mostra o que ainda não fecha.
        </p>
        {can('compliance') ? (
          <Link
            to="/rh/compliance"
            className="inline-flex items-center gap-2 rounded-lg bg-[#7d4a3c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#623a2f]"
          >
            Abrir o dossiê da empresa <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <p className="text-sm text-gray-500">
            O dossiê fica na aba Compliance, que não está liberada para o seu acesso. Peça ao
            usuário principal da sua empresa.
          </p>
        )}
      </section>

      <section className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-3 font-semibold text-gray-800">Dúvidas que aparecem em toda reunião</h2>
        <dl className="space-y-3">
          {DUVIDAS.map(d => (
            <div key={d.p} className="rounded-lg bg-gray-50 p-3">
              <dt className="text-sm font-medium text-gray-800">{d.p}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-gray-600">{d.r}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-1 flex items-center gap-2">
          <XCircle className="h-5 w-5 text-gray-400" />
          <h2 className="font-semibold text-gray-800">O que o Malama não faz</h2>
        </div>
        <p className="mb-3 text-sm text-gray-500">
          Vale saber antes de a auditoria perguntar — e antes de alguém prometer isso internamente.
        </p>
        <ul className="space-y-1.5">
          {NAO_FAZ.map(t => (
            <li key={t} className="flex items-start gap-2 text-xs leading-relaxed text-gray-600">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-gray-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Este material é explicativo e não é parecer jurídico. A leitura oficial da norma para o
            seu caso é do SESMT, do responsável técnico ou do jurídico da sua empresa.
          </span>
        </div>
      </section>
    </div>
  );
};
