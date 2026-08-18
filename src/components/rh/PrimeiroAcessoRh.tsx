// =====================================================
// Malama — Apresentação do painel, no primeiro acesso
//
// Até aqui o login caía direto no dashboard, cuja primeira frase falava em
// "colaboradores com acesso ao benefício". Quem foi vendido em NR-1 chegava
// e não reconhecia o que comprou — e é essa dissonância dos primeiros trinta
// segundos que vira o "estou perdido" que RH e SST relatam.
//
// Três telas, e nenhuma delas é tour de interface. O que falta não é saber
// onde clicar: é saber o que se está fazendo, em que ordem, e de quem é cada
// parte. A terceira tela existe porque RH e SST são pessoas diferentes com
// responsabilidades diferentes, e o painel nunca disse isso em lugar nenhum.
// =====================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, Search, BarChart3, ClipboardList, CalendarClock,
  X, Users, HardHat, Building2, Sparkles, Bot, CheckCircle2,
} from 'lucide-react';
import { PerfilEmpresaForm } from './PerfilEmpresaForm';

type Passo = { chave: string; titulo: string; resumo: string; corpo: React.ReactNode };

const CICLO = [
  { Icone: Search, nome: 'Identificar', texto: 'Perguntar às equipes, com questionário validado, o que no trabalho pesa.' },
  { Icone: BarChart3, nome: 'Avaliar', texto: 'Ver o resultado por setor e decidir por onde começar.' },
  { Icone: ClipboardList, nome: 'Controlar', texto: 'Combinar medidas com responsável, prazo e evidência de execução.' },
  { Icone: CalendarClock, nome: 'Verificar', texto: 'Medir de novo no período seguinte e ver se mudou.' },
];

const SEMANAS = [
  {
    quando: 'Esta semana',
    o_que: 'Montar a base',
    detalhe: 'Registrar os setores da empresa, trazer a lista de pessoas (a planilha resolve de uma vez) e aceitar os documentos que autorizam a coleta.',
  },
  {
    quando: 'Semanas 1 e 2',
    o_que: 'Primeira medição aberta',
    detalhe: 'Seu trabalho aqui é divulgar, não cobrar. O painel gera o cartaz com QR e os textos prontos para o grupo e o e-mail.',
  },
  {
    quando: 'Semana 3',
    o_que: 'Ler o resultado',
    detalhe: 'Encerrar a janela e ver quais setores pedem atenção primeiro — sempre em números somados, nunca resposta de ninguém.',
  },
  {
    quando: 'Semana 4',
    o_que: 'Conversar e combinar',
    detalhe: 'Levar o resultado a cada liderança, reconhecer o que funciona e combinar até três melhorias por setor. '
      + 'Cada combinado vira sozinho um item do plano de ação — é lá que ele se encerra, com evidência.',
  },
];

const PAPEIS = [
  {
    Icone: Users,
    quem: 'Você, no RH',
    faz: 'Cadastra as pessoas, divulga a pesquisa, conduz as conversas com a liderança e registra as medidas com evidência.',
  },
  {
    Icone: HardHat,
    quem: 'Quem a empresa designar para SST',
    faz: 'Faz a leitura técnica, toma as decisões formais do GRO e integra as evidências ao processo da empresa. Essa atribuição não passa para a plataforma.',
  },
  {
    Icone: Building2,
    quem: 'A liderança de cada setor',
    faz: 'Recebe o resultado do próprio setor, assume até três combinados e mostra o que entrou em prática.',
  },
  {
    Icone: Sparkles,
    quem: 'A Malama',
    faz: 'Apoia a coleta, calcula os instrumentos de forma determinística e organiza resultados agregados, medidas e evidências. Não substitui AEP, PGR, PCMSO nem decisão técnica.',
  },
];

const PASSOS: Passo[] = [
  {
    chave: 'ciclo',
    titulo: 'A NR-1 não pede um documento. Pede um ciclo.',
    resumo: 'O que a empresa precisa comprovar',
    corpo: (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-gray-600">
          Risco psicossocial virou risco ocupacional como qualquer outro: a empresa precisa
          identificar, avaliar, controlar e verificar. Não existe um papel único que prove
          conformidade — <strong className="text-gray-800">o que se comprova é um ciclo que girou
          e deixou rastro</strong>. Este painel é onde esse rastro se forma.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CICLO.map(({ Icone, nome, texto }, i) => (
            <div key={nome} className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7d4a3c]/10 text-[#7d4a3c]">
                <Icone className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  <span className="text-gray-400">{i + 1}.</span> {nome}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{texto}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-gray-500">
          O erro mais comum é parar no segundo passo: medir, arquivar o relatório e não mudar
          nada. Diagnóstico sem medida registrada documenta que a empresa sabia do risco e não
          agiu — é pior do que não ter medido.
        </p>
      </div>
    ),
  },
  {
    chave: 'semanas',
    titulo: 'Suas próximas quatro semanas',
    resumo: 'O que fazer, e em que ordem',
    corpo: (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-gray-600">
          Você não precisa decidir por onde começar. O painel calcula o próximo passo a partir
          do que já existe e mostra ele no topo de todas as telas — mas ajuda saber onde isso
          vai dar.
        </p>
        <ol className="flex flex-col gap-2">
          {SEMANAS.map(s => (
            <li key={s.quando} className="grid grid-cols-[104px_1fr] gap-3 rounded-lg border border-gray-100 p-3 sm:grid-cols-[128px_1fr]">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#7d4a3c]">{s.quando}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">{s.o_que}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{s.detalhe}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs leading-relaxed text-gray-500">
          Depois disso o ciclo se repete no ritmo da sua empresa. Você não precisa lembrar das
          datas — o painel mostra o que está em dia e o que passou do prazo.
        </p>
      </div>
    ),
  },
  {
    chave: 'papeis',
    titulo: 'Quem faz o quê',
    resumo: 'RH, SST, liderança e Malama',
    corpo: (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-gray-600">
          A parte mais confusa costuma ser essa. Nada aqui substitui o trabalho técnico de
          segurança e saúde — o painel produz a evidência, e a leitura oficial dela continua
          sendo de quem responde tecnicamente pela empresa.
        </p>
        <div className="flex flex-col gap-2">
          {PAPEIS.map(({ Icone, quem, faz }) => (
            <div key={quem} className="flex gap-3 rounded-lg border border-gray-100 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                <Icone className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">{quem}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{faz}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    chave: 'copiloto',
    titulo: 'Seu copiloto acompanha esse caminho com você',
    resumo: 'Conheça seu copiloto',
    corpo: (
      <div className="flex flex-col gap-4">
        <div className="flex gap-3 rounded-xl border border-[#7d4a3c]/10 bg-[#7d4a3c]/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#7d4a3c] shadow-sm">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Copiloto do RH</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Apoio sênior em RH e SST para explicar o painel, organizar informações da empresa
              e ajudar você a executar o próximo passo indicado pelo Malama.
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {[
            'Traduz os dados agregados e o ciclo em linguagem clara.',
            'Usa o perfil da empresa e os setores que você confirmou.',
            'Prepara rascunhos e sugestões para sua revisão.',
            'Aponta a tela certa sem alterar nada sozinho.',
          ].map(item => (
            <div key={item} className="flex gap-2 rounded-lg border border-gray-100 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <p className="text-xs leading-relaxed text-gray-600">{item}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          O copiloto é uma ferramenta de apoio: não assume responsabilidade técnica, não substitui
          AEP, PGR, PCMSO ou decisões formais da empresa e nunca cria setores ou grava mudanças sem
          sua confirmação.
        </div>

        <p className="text-sm leading-relaxed text-gray-600">
          Para começar, conte brevemente o que a empresa faz. O copiloto organiza o perfil e pode
          sugerir setores; você revisa tudo e configura modalidade e turnos de cada setor no painel.
        </p>
      </div>
    ),
  },
];

export const PrimeiroAcessoRh: React.FC<{ onFechar: () => void }> = ({ onFechar }) => {
  const [i, setI] = useState(0);
  const [perfilConcluido, setPerfilConcluido] = useState(false);
  const painelRef = useRef<HTMLDivElement>(null);
  const passo = PASSOS[i];
  const ultimo = i === PASSOS.length - 1;

  // Esc fecha: uma sobreposição que trava a tela sem saída óbvia assusta
  // mais do que orienta.
  const fechar = useCallback(() => onFechar(), [onFechar]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fechar]);

  // Foco no painel a cada passo: sem isto o leitor de tela continua anunciando
  // o conteúdo anterior depois de avançar.
  useEffect(() => { painelRef.current?.focus(); }, [i]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="primeiro-acesso-titulo"
        tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl outline-none sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 pb-4 pt-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7d4a3c]">
              Bem-vindo ao Portal do RH · {i + 1} de {PASSOS.length}
            </p>
            <h2 id="primeiro-acesso-titulo" className="mt-1 text-xl font-semibold leading-snug text-gray-900">
              {passo.titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar apresentação"
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {passo.corpo}
          {passo.chave === 'copiloto' && (
            <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#7d4a3c]">
                Perfil inicial da empresa
              </p>
              <PerfilEmpresaForm onSaved={() => setPerfilConcluido(true)} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {PASSOS.map((p, idx) => (
              <span
                key={p.chave}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? 'w-6 bg-[#7d4a3c]' : 'w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {i > 0 && (
              <button
                type="button"
                onClick={() => setI(v => v - 1)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
            )}
            {ultimo ? (
              <>
                <Link
                  to="/rh/nr1"
                  onClick={fechar}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                >
                  Ver em detalhe
                </Link>
                <button
                  type="button"
                  onClick={fechar}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#7d4a3c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#623a2f]"
                >
                  {perfilConcluido ? 'Entrar no painel' : 'Fazer depois'} <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setI(v => v + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#7d4a3c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#623a2f]"
              >
                {PASSOS[i + 1].resumo} <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
