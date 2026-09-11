// =====================================================
// Malama — Apresentação do painel, no primeiro acesso
//
// Até aqui o login caía direto no dashboard, cuja primeira frase falava em
// "colaboradores com acesso ao benefício". Quem foi vendido em NR-1 chegava
// e não reconhecia o que comprou — e é essa dissonância dos primeiros trinta
// segundos que vira o "estou perdido" que RH e SST relatam.
//
// Nenhuma tela aqui é tour de interface. O que falta não é saber onde clicar:
// é saber o que se está fazendo, em que ordem, e de quem é cada parte.
//
// O ACEITE DOS TERMOS VEM ANTES DE TUDO, e só para o usuário principal.
//   A ciência automática (`rh_registrar_ciencia`) continua existindo e grava
//   sozinha o registro de quem abre o painel — mas ciência não é aceite
//   explícito, e é o aceite explícito que o jurídico do cliente pede. Quem
//   tem poderes para obrigar a empresa é o usuário principal, então é dele,
//   e no primeiro acesso, que se pede a marcação explícita: rolar o texto
//   até o fim e marcar "li e aceito". Sem pedir nome e cargo de novo — eles
//   já foram capturados quando o admin da Malama criou esta conta
//   (`rh_usuarios.cargo`, migration 20260910), e é isso que vai para o
//   registro do aceite.
//   O passo não fecha no X nem no Esc enquanto não for aceito: o painel
//   inteiro opera sob esses Termos, e começar a usar antes de aceitar é
//   exatamente a ordem que o documento não admite.
//   Usuário convidado pela equipe não vê o passo. Ele não aceita pela
//   empresa, e travá-lo num aceite que não lhe cabe o deixaria de fora
//   do painel para sempre.
//
// O PERFIL ABRE A APRESENTAÇÃO, e não fecha.
//   Ele estava no último passo, depois de três telas de leitura — o ponto de
//   maior fadiga acumulada, com um botão "Fazer depois" ao lado. Era o campo
//   que alimenta o copiloto e as sugestões de setor sendo pedido no pior
//   momento possível.
//   Trazê-lo para a frente arrastou junto a explicação do copiloto: o passo
//   do copiloto existia sobretudo para justificar o perfil e hospedá-lo, e
//   deixá-lo para depois faria o passo 1 pedir trabalho sem dizer para quê.
//   Os dois viraram um passo só. A ressalva de que o copiloto não substitui
//   AEP, PGR, PCMSO nem decisão formal continua aqui, inteira.
// =====================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, Search, BarChart3, ClipboardList, CalendarClock,
  X, Users, HardHat, Building2, Sparkles, Bot, CheckCircle2, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PerfilEmpresaForm } from './PerfilEmpresaForm';
import { useRhJornada } from '../../contexts/RhJornadaContext';
import { useRhAccess } from '../../contexts/RhAccessContext';
import { rhService, type DocumentoLegal } from '../../services/empresaService';

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

/** Passos de leitura. O de perfil é montado no componente porque depende do
 *  nome da empresa e de o perfil já estar confirmado. */
const PASSOS_LEITURA: Passo[] = [
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
];

/** O que a empresa ganha por escrever o perfil. Fica antes do formulário
 *  porque é o que compra o esforço: pedir texto livre sem dizer para onde ele
 *  vai é o jeito mais rápido de receber uma linha e meia. */
const RETORNO_DO_PERFIL = [
  'O copiloto lê cada resultado sabendo sua escala, liderança e o que mudou no último ano.',
  'Um resultado ruim vira hipótese com contexto, não "o setor está mal".',
  'A Receita já respondeu o que a empresa faz — aqui é como o trabalho é organizado.',
  'Você revisa tudo antes de confirmar — nada é gravado sozinho.',
];

/**
 * Cabeçalho do passo. Curto de propósito: o objetivo deste passo é receber
 * texto, e cada bloco de enfeite acima empurra o campo para baixo da dobra.
 * A ressalva legal do copiloto não vem aqui — ela é renderizada DEPOIS do
 * formulário, porque é ressalva, não argumento para preencher.
 */
const PassoPerfil: React.FC<{ nomeEmpresa?: string | null; jaConfirmado: boolean }> = ({
  nomeEmpresa, jaConfirmado,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-2 text-[#7d4a3c]">
      <Bot className="h-4 w-4 shrink-0" />
      <p className="text-xs font-semibold uppercase tracking-wide">Copiloto do RH</p>
    </div>

    {jaConfirmado ? (
      <p className="text-sm leading-relaxed text-gray-600">
        O perfil {nomeEmpresa ? <strong className="text-gray-800">da {nomeEmpresa}</strong> : 'da empresa'} já
        foi confirmado por alguém da equipe. Confira se ainda descreve a operação de hoje — escala,
        liderança e vínculos mudam, e o copiloto continua respondendo pelo que estiver aqui.
      </p>
    ) : (
      <p className="text-sm leading-relaxed text-gray-600">
        Antes de abrir o painel, conte como o trabalho é organizado {nomeEmpresa ? <>na <strong className="text-gray-800">{nomeEmpresa}</strong></> : 'na empresa'}:
        o que mudou no último ano, liderança, vínculos, jornada. São escolhas rápidas, não redação —
        e é o que separa orientação sob medida de conselho genérico.
      </p>
    )}

    <div className="grid gap-2 sm:grid-cols-2">
      {RETORNO_DO_PERFIL.map(item => (
        <div key={item} className="flex gap-2 rounded-lg border border-gray-100 p-2.5">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
          <p className="text-xs leading-relaxed text-gray-600">{item}</p>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Aceite do contrato de adesão, no primeiro acesso do usuário principal.
 *
 * O texto inteiro é exibido aqui — não um resumo com link. Contrato de
 * adesão aceito sobre um resumo é aceito sobre outra coisa.
 *
 * Sem campo de nome nem de cargo: os dois já foram capturados quando o
 * admin da Malama criou esta conta — é informação da venda, coletada uma
 * vez. Pedir de novo aqui não reforça a prova, só repete um campo que já
 * existe em outro ponto do cadastro. O padrão é o de qualquer instalador:
 * rolar até o fim libera o checkbox, marcar o checkbox libera o botão. A
 * conta e o horário do clique é que ficam registrados como prova.
 *
 * Sem tela própria de "aceite registrado" depois do clique: `onAceito` avisa
 * o pai, que tira este passo da lista na hora — o índice que apontava para
 * ele passa a apontar direto para o próximo. Uma confirmação aqui dentro
 * seria mais um clique para sair de uma tela que só existe para dizer que
 * deu certo.
 */
const PassoTermos: React.FC<{
  doc: DocumentoLegal | null;
  carregando: boolean;
  /** Nome da conta autenticada, já resolvido com o fallback do e-mail — é
   *  o que vai para o registro, sem pedir para ninguém digitar de novo. */
  nomeConta: string;
  /** Cargo capturado na criação da conta (migration 20260910). Pode faltar
   *  em conta antiga ou criada sem o campo preenchido — nesse caso grava
   *  vazio, como sempre gravou antes de existir esta coluna. */
  cargoConta: string;
  onAceito: () => void;
}> = ({ doc, carregando, nomeConta, cargoConta, onAceito }) => {
  const [lido, setLido] = useState(false);
  const [concordo, setConcordo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);

  // Texto que cabe na caixa nunca dispara evento de rolagem — sem esta
  // medição o checkbox ficaria bloqueado para sempre.
  useEffect(() => {
    const el = caixaRef.current;
    if (!el) return;
    const medir = () => {
      if (el.scrollHeight <= el.clientHeight + 8) setLido(true);
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [doc?.id]);

  const aoRolar = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setLido(true);
  };

  const continuar = async () => {
    if (!doc) return;
    setEnviando(true);
    try {
      const res = await rhService.aceitarDocumento(doc.id, nomeConta, cargoConta);
      if (!res.ok) { toast.error(res.error || 'Não foi possível registrar o aceite.'); return; }
      onAceito();
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-[#7d4a3c]" />
      </div>
    );
  }

  if (!doc) {
    return (
      <p className="text-sm leading-relaxed text-gray-600">
        Nenhum documento pendente de aceite. Você pode seguir para o painel.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[#7d4a3c]">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <p className="text-xs font-semibold uppercase tracking-wide">Contrato de adesão</p>
      </div>

      <p className="text-sm leading-relaxed text-gray-600">
        O painel inteiro funciona sob estes Termos: eles definem o que a Malama trata como
        operadora, o que a empresa nunca vê de cada colaborador e o que a empresa se
        compromete a não fazer com o que vê. Leia o documento e marque que está de acordo
        antes de entrar.
      </p>

      <div className="rounded-xl border border-gray-200">
        <div className="border-b border-gray-100 px-4 py-2.5">
          <p className="text-sm font-medium text-gray-800">{doc.titulo}</p>
        </div>
        <div
          ref={caixaRef}
          onScroll={aoRolar}
          className="max-h-64 overflow-y-auto whitespace-pre-wrap px-4 py-3 text-xs leading-relaxed text-gray-700"
        >
          {doc.conteudo}
        </div>
      </div>

      <label className={`flex items-start gap-2 text-sm ${lido ? 'text-gray-700' : 'text-gray-400'}`}>
        <input
          type="checkbox"
          checked={concordo}
          disabled={!lido}
          onChange={e => setConcordo(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#7d4a3c] focus:ring-[#7d4a3c] disabled:cursor-not-allowed"
        />
        Li e aceito as condições dos termos.
      </label>
      {!lido && (
        <p className="-mt-1 text-xs text-gray-500">Role o documento até o fim para marcar esta opção.</p>
      )}

      <button
        type="button"
        onClick={continuar}
        disabled={enviando || !concordo}
        className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#7d4a3c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#623a2f] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#7d4a3c]"
      >
        <ShieldCheck className="h-4 w-4" />
        {enviando ? 'Registrando...' : 'Continuar'}
      </button>

      <p className="text-xs leading-relaxed text-gray-400">
        O aceite fica registrado com a versão do documento, a data, a hora e a conta
        autenticada. Publicar uma versão nova não apaga este registro.
      </p>
    </div>
  );
};

export const PrimeiroAcessoRh: React.FC<{ onFechar: () => void }> = ({ onFechar }) => {
  const [i, setI] = useState(0);
  const [perfilConcluido, setPerfilConcluido] = useState(false);
  const [termosAceitos, setTermosAceitos] = useState(false);
  const painelRef = useRef<HTMLDivElement>(null);
  const { empresa, documentos, loading: carregandoJornada, recarregar } = useRhJornada();
  const { acesso, can } = useRhAccess();

  // Só é exigido de quem PODE preencher. PerfilEmpresaForm recusa a edição a
  // quem não tem o módulo 'empresa' — exigir dessa pessoa a trancaria fora do
  // painel para sempre, por uma tarefa que ela não tem permissão de fazer.
  // (`can` já devolve true para o usuário principal.)
  const perfilPendente = can('empresa') && !perfilConcluido;

  // Contrato de adesão vigente que ainda não tem assinatura. `modo` vem
  // 'automatico' quando existe só a ciência gravada no acesso — e é
  // justamente esse caso que o passo existe para resolver.
  const termo = acesso.principal
    ? documentos.find(d => d.tipo === 'termos_b2b' && d.exige_aceite && d.modo !== 'explicito') ?? null
    : null;
  // Enquanto a jornada carrega ainda não se sabe se há termo pendente. O
  // passo aparece assim mesmo, travado: deixar passar por causa de uma
  // leitura em andamento pularia o aceite justamente no primeiro acesso.
  //
  // `!termosAceitos` aqui é o que faz o passo DESAPARECER da lista assim
  // que o aceite é registrado nesta sessão — não vira uma tela própria de
  // "termos aceitos" que ainda precisa de mais um clique para sair dela.
  // `i` continua apontando pro mesmo número (0) e o `Math.min` logo abaixo
  // — que já existia para a lista encolher quando a carga termina sem termo
  // pendente — faz o resto sozinho: com 'termos' fora do array, o índice 0
  // aponta direto para o próximo passo de verdade.
  const mostrarTermos = acesso.principal && !termosAceitos && (carregandoJornada || !!termo);

  const PASSOS: Passo[] = [
    ...(mostrarTermos ? [{
      chave: 'termos',
      titulo: 'Antes de entrar: os termos de uso do painel',
      resumo: 'Termos de uso',
      corpo: (
        <PassoTermos
          doc={termo}
          carregando={carregandoJornada}
          nomeConta={acesso.nome || acesso.email}
          cargoConta={acesso.cargo ?? ''}
          onAceito={() => setTermosAceitos(true)}
        />
      ),
    }] : []),
    {
      chave: 'perfil',
      titulo: perfilConcluido ? 'Confira o perfil da empresa' : 'Comece contando o que a empresa faz',
      resumo: 'Perfil da empresa',
      corpo: <PassoPerfil nomeEmpresa={empresa?.nome} jaConfirmado={perfilConcluido} />,
    },
    ...PASSOS_LEITURA,
  ];

  // A lista encolhe se a carga da jornada terminar sem termo pendente. Sem
  // travar o índice dentro dela, um avanço rápido durante a carga apontaria
  // para fora do array e a apresentação quebraria na hora de renderizar.
  const indice = Math.min(i, PASSOS.length - 1);
  const passo = PASSOS[indice];
  const ultimo = indice === PASSOS.length - 1;

  // O perfil é obrigatório no início: enquanto ele não for confirmado, este
  // passo não avança, não fecha no X e não fecha no Esc. Não é gentileza
  // retirada por capricho — sem o perfil, o copiloto trabalha no vazio pelo
  // resto do ciclo. O formulário não depende de nenhum provedor externo (a
  // Receita só pré-preenche; a organização é sempre preenchida à mão), então
  // não há risco de o passo trancar por uma falha de infraestrutura.
  // 'termos' só existe no array enquanto `mostrarTermos` for true, e isso já
  // exige `!termosAceitos` — então estar neste passo já significa pendente,
  // sem precisar de uma segunda variável para dizer a mesma coisa.
  const travado =
    (passo.chave === 'perfil' && perfilPendente) ||
    passo.chave === 'termos';

  const avisoDeTrava = passo.chave === 'termos'
    ? 'Aceite os termos para continuar.'
    : 'Confirme o perfil para continuar.';

  // Ao sair, a jornada relê os documentos: o registro deixou de ser ciência
  // automática e virou aceite assinado, e o resto do painel precisa saber.
  const fechar = useCallback(() => {
    if (termosAceitos) void recarregar();
    onFechar();
  }, [onFechar, recarregar, termosAceitos]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !travado) fechar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fechar, travado]);

  // Foco no painel a cada passo: sem isto o leitor de tela continua anunciando
  // o conteúdo anterior depois de avançar.
  useEffect(() => { painelRef.current?.focus(); }, [indice]);

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
              Bem-vindo ao Portal do RH · {indice + 1} de {PASSOS.length}
            </p>
            <h2 id="primeiro-acesso-titulo" className="mt-1 text-xl font-semibold leading-snug text-gray-900">
              {passo.titulo}
            </h2>
          </div>
          {!travado && (
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar apresentação"
              className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {passo.corpo}
          {passo.chave === 'perfil' && (
            <>
              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <PerfilEmpresaForm onSaved={() => setPerfilConcluido(true)} />
              </div>
              {/* Depois do formulário: é ressalva de responsabilidade, não
                  argumento de venda. Acima, só empurrava o campo para fora
                  da primeira tela do passo que existe para ser preenchido. */}
              <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                O copiloto é uma ferramenta de apoio: não assume responsabilidade técnica, não
                substitui AEP, PGR, PCMSO ou decisões formais da empresa e nunca cria setores ou
                grava mudanças sem sua confirmação. O perfil é declaração da empresa, não avaliação
                de risco.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {PASSOS.map((p, idx) => (
                <span
                  key={p.chave}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === indice ? 'w-6 bg-[#7d4a3c]' : 'w-1.5 bg-gray-300'
                  }`}
                />
              ))}
            </div>
            {/* Botão desabilitado sem explicação lê-se como tela quebrada. */}
            {travado && (
              <p className="text-xs text-gray-500">{avisoDeTrava}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {indice > 0 && (
              <button
                type="button"
                onClick={() => setI(indice - 1)}
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
                  Entrar no painel <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={travado}
                onClick={() => setI(indice + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#7d4a3c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#623a2f] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#7d4a3c]"
              >
                {PASSOS[indice + 1].resumo} <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
