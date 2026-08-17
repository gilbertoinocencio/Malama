// =====================================================
// Malama — A jornada do RH, derivada do dado real
//
// Um lugar só decide "o que este RH tem que fazer agora". Antes isso vivia
// dentro do card do dashboard, então só existia numa aba: quem trocava de
// tela perdia a bússola. Aqui é função pura — a faixa do cabeçalho, o card
// do dashboard, o ritmo do ciclo e o dossiê do PGR leem todos daqui e nunca
// se contradizem.
//
// Nada aqui compara setores ou lideranças entre si, e nada pontua adesão:
// ranking de setor vira avaliação de gestor (e dedura gente em setor
// pequeno), e meta de adesão faz o RH pressionar quem não respondeu — o que
// enviesa justamente o instrumento que sustenta o relatório.
// =====================================================

import type {
  DocumentoLegal, LiderancaCiclo, PlanoAcao, PsychosocialCampanha,
} from '../services/empresaService';

export type PermissoesJornada = {
  /** Cadastro de setores e de pessoas. Sem isto os passos de base somem: a
   *  faixa aparece em todas as abas e não pode mandar alguém fazer o que a
   *  permissão dele não permite. */
  colaboradores: boolean;
  saudeMental: boolean;
  planoAcao: boolean;
  empresa: boolean;
  /** Aba Importar. Separada de `colaboradores` porque é permissão própria:
   *  mandar para a planilha quem não pode abri-la cai no gate e volta. */
  importar: boolean;
  /** Consegue LER campanhas/medidas (saúde mental ou compliance). Separado
   *  de agir sobre elas: o dossiê só pode dizer "não foi feito" sobre o que
   *  este usuário enxerga — o resto é "sem visibilidade", não "pendente". */
  veCampanhas: boolean;
  vePlanos: boolean;
};

export type DadosJornada = {
  empresaAtiva: boolean;
  nSetores: number;
  nColaboradores: number;
  campanhas: PsychosocialCampanha[];
  ciclos: LiderancaCiclo[];
  planos: PlanoAcao[];
  documentos: DocumentoLegal[];
  pode: PermissoesJornada;
};

/** Etapas do ciclo, na ordem em que acontecem. Ver `etapasDaJornada`. */
export type EtapaChave =
  | 'setores' | 'pessoas' | 'medir' | 'ler' | 'conversar'
  | 'medidas' | 'comprovar';

export type PassoJornada = {
  titulo: string;
  descricao: string;
  /** null = não há ação clicável; a tela não deve desenhar botão morto. */
  destino: string | null;
  acao: string;
  atalho?: { to: string; label: string };
  /** Bloqueia o resto da jornada — a faixa destaca em âmbar. */
  bloqueio?: boolean;
  /** Onde este passo cai no trilho. É o que mantém o card e o trilho
   *  concordando: o trilho não recalcula "onde estou", ele lê daqui. */
  etapa?: EtapaChave;
};

export type ItemPreparacao = { label: string; ok: boolean };

export const docsPendentesDe = (documentos: DocumentoLegal[]): number =>
  documentos.filter(d => d.exige_aceite && !d.aceito_em).length;

/** Dias inteiros até uma data ISO, do ponto de vista de hoje. */
const diasAte = (iso: string, hoje: Date): number => {
  const alvo = new Date(`${iso.slice(0, 10)}T12:00:00`);
  const base = new Date(hoje);
  base.setHours(12, 0, 0, 0);
  return Math.round((alvo.getTime() - base.getTime()) / 86400000);
};

/**
 * Abaixo disto, não se pede mais divulgação.
 * Três dias é o mínimo para uma mensagem circular entre turnos, folgas e
 * quem está fora na semana — abaixo disso o único jeito de mover o número
 * é cobrar pessoa por pessoa, que é o que invalida o instrumento.
 */
const DIAS_MINIMOS_PARA_DIVULGAR = 3;

// ── Próximo passo ──────────────────────────────────────
export function proximoPasso(d: DadosJornada, hoje = new Date()): PassoJornada {
  const { pode } = d;
  const temCampanha = d.campanhas.some(c => c.status !== 'cancelada');
  const campanhaAberta = d.campanhas.find(c => c.status === 'aberta');
  const temResultado = d.campanhas.some(c => c.status === 'encerrada');
  const temJss = d.campanhas.some(c => c.instrument === 'jss' && c.status !== 'cancelada');
  const cicloAtivo = d.ciclos.find(c => c.status === 'ativo');
  const atrasadas = d.planos.filter(p => p.atrasada && p.status !== 'concluida' && p.status !== 'cancelada');

  if (!d.empresaAtiva) {
    return {
      titulo: 'Conta da empresa não está ativa',
      descricao: 'Enquanto isso não for regularizado, não dá para adicionar colaboradores nem abrir avaliações. Fale com a Malama.',
      destino: pode.empresa ? '/rh/empresa' : null,
      acao: 'Ver dados da empresa',
      bloqueio: true,
    };
  }
  if (pode.colaboradores && d.nSetores === 0) {
    return {
      titulo: 'Organize os setores da empresa',
      descricao: 'Os setores permitem apresentar resultados úteis sem expor respostas individuais.',
      destino: '/rh/dashboard#setores',
      acao: 'Cadastrar setores',
      etapa: 'setores',
    };
  }
  // A planilha é a ação principal, e o formulário virou o atalho. Era o
  // contrário, e nenhuma empresa de duzentas pessoas cadastra uma a uma —
  // descobrir isso depois de digitar quinze é uma péssima primeira hora de
  // produto. Quem não tem a permissão de importar continua vendo o
  // formulário como caminho, senão o passo aponta para uma porta fechada.
  if (pode.colaboradores && d.nColaboradores === 0) {
    return {
      titulo: 'Traga as pessoas para o painel',
      descricao: pode.importar
        ? 'Suba a lista inteira de uma vez pela planilha. Para uma pessoa só, o formulário do painel resolve.'
        : 'Cadastre pelo formulário do painel. Se precisar subir uma lista inteira, peça a permissão de importar ao usuário principal.',
      destino: pode.importar ? '/rh/importar' : '/rh/dashboard#novo-colaborador',
      acao: pode.importar ? 'Importar planilha' : 'Adicionar colaboradores',
      atalho: pode.importar
        ? { to: '/rh/dashboard#novo-colaborador', label: 'Adicionar uma pessoa' }
        : undefined,
      etapa: 'pessoas',
    };
  }
  // O passo "aceite os documentos pendentes" foi removido daqui. Ele era
  // inalcançável: `RhJornadaContext` chama `rh_registrar_ciencia()` ANTES de
  // ler a lista, então todo documento aplicável já volta aceito. Pior, ele
  // interrompia o ciclo em nome de uma "base legal da coleta" que o contrato
  // de adesão não estabelece. Documento realmente pendente continua sinalizado
  // pelo ponto âmbar ao lado do nome da empresa, no cabeçalho.
  // Medida vencida passa na frente de abrir avaliação nova: diagnóstico que
  // não vira medida executada é o que a fiscalização enxerga como omissão.
  if (pode.planoAcao && atrasadas.length > 0) {
    return {
      titulo: atrasadas.length === 1
        ? 'Uma medida passou do prazo'
        : `${atrasadas.length} medidas passaram do prazo`,
      descricao: 'Conclua com evidência ou repactue o prazo. Medida vencida sem registro enfraquece todo o dossiê.',
      destino: '/rh/plano-acao',
      acao: 'Rever plano de ação',
      etapa: 'comprovar',
      bloqueio: true,
    };
  }
  // Duas ou quatro semanas de janela em que o passo dizia "acompanhe" — que
  // na prática significa "fique olhando". É aqui que nasce o "e agora?" e é
  // aqui que o RH fecha a aba e não volta. Então o passo passa a dizer a
  // data em que algo muda e qual é o trabalho útil DESTE intervalo.
  if (pode.saudeMental && campanhaAberta) {
    const nome = campanhaAberta.instrument === 'jss' ? 'carga de trabalho' : 'bem-estar';
    const taxa = campanhaAberta.n_convidados > 0
      ? Math.round((campanhaAberta.n_respondentes / campanhaAberta.n_convidados) * 100)
      : 0;
    const baixa = campanhaAberta.n_convidados > 0 && taxa < 30;
    const respostas = `${campanhaAberta.n_respondentes} de ${campanhaAberta.n_convidados}`;
    const dias = diasAte(campanhaAberta.janela_fim, hoje);
    // Divulgar de novo só rende com tempo de circular: link mandado na
    // véspera não alcança quem está de folga, de férias ou em outro turno.
    // Faltando isso, sugerir divulgação empurra o RH para a cobrança de
    // última hora — a única forma de mexer no número nesse prazo, e a que
    // enviesa o instrumento. Não havendo como prorrogar a janela, o que
    // resta é ler o que veio.
    const daTempo = dias > DIAS_MINIMOS_PARA_DIVULGAR;

    if (baixa && daTempo) {
      return {
        titulo: `Poucas respostas na medição de ${nome}`,
        descricao: `A janela fica aberta até ${fmt(campanhaAberta.janela_fim)} e ${respostas} responderam. `
          + 'Vale reenviar o link do setor e repor os cartazes — adesão baixa costuma ser receio, não desinteresse. '
          + 'Não cobre ninguém individualmente: além de constranger, distorce o resultado.',
        destino: '/rh/saude-mental#campanhas',
        acao: 'Divulgar de novo',
        etapa: 'medir',
      };
    }
    return {
      titulo: daTempo
        ? `Medição de ${nome} em andamento`
        : `A medição de ${nome} está fechando`,
      descricao: daTempo
        ? `A janela fica aberta até ${fmt(campanhaAberta.janela_fim)} e ${respostas} já responderam. `
          + 'Não há nada a fazer até lá — avisamos você quando estiver perto de fechar.'
        : `A janela fecha em ${fmt(campanhaAberta.janela_fim)}, com ${respostas} até agora. `
          + 'Não vale mais correr atrás de resposta: nesse prazo só se consegue número na base da cobrança, '
          + 'e aí o resultado deixa de valer. Assim que fechar, o diagnóstico fica pronto para leitura.',
      destino: '/rh/saude-mental#campanhas',
      acao: 'Ver participação',
      etapa: 'medir',
    };
  }
  if (pode.saudeMental && !temCampanha) {
    return {
      titulo: 'Abra o primeiro diagnóstico',
      descricao: 'Comece com WHO-5 e JSS para criar a primeira fotografia de bem-estar e condições de trabalho.',
      destino: '/rh/saude-mental?nova=1',
      acao: 'Iniciar diagnóstico',
      etapa: 'medir',
    };
  }
  if (pode.saudeMental && !temJss) {
    return {
      titulo: 'Complete o diagnóstico inicial com o JSS',
      descricao: 'O WHO-5 mostra como as pessoas estão; o JSS ajuda a entender o que no trabalho precisa mudar.',
      destino: '/rh/saude-mental?nova=1&instrumento=jss',
      acao: 'Abrir JSS',
      etapa: 'medir',
    };
  }
  // Sem este passo a jornada pulava de "acompanhe a campanha" direto para
  // "converse com a liderança", sem nunca convidar a LER o resultado.
  if (pode.saudeMental && temResultado && d.ciclos.length === 0) {
    return {
      titulo: 'Leia o diagnóstico do período',
      descricao: 'Veja quais setores pedem atenção primeiro e o que puxou o resultado, antes de decidir qualquer medida.',
      destino: '/rh/saude-mental#resultado-jss',
      acao: 'Ver diagnóstico',
      etapa: 'ler',
    };
  }
  if (pode.planoAcao && cicloAtivo) {
    return {
      titulo: `Acompanhe os combinados de ${cicloAtivo.setor}`,
      descricao: 'Registre o que entrou em prática e avance a jornada somente quando houver evidência.',
      destino: '/rh/plano-acao?visao=lideranca',
      acao: 'Ver evolução',
      etapa: 'conversar',
    };
  }
  if (pode.planoAcao && temJss && d.planos.length === 0) {
    return {
      titulo: 'Prepare a conversa com as lideranças',
      descricao: 'Use o diagnóstico agregado para reconhecer pontos fortes e combinar até três melhorias por setor.',
      destino: '/rh/plano-acao?visao=lideranca&nova=1',
      acao: 'Preparar conversa',
      etapa: 'medidas',
    };
  }
  return {
    titulo: 'Empresa em dia com o ciclo',
    descricao: 'A base está montada e o ciclo está rodando. Acompanhe os resultados a cada nova janela de resposta.',
    destino: pode.saudeMental ? '/rh/saude-mental#resultado-jss'
      : pode.colaboradores ? '/rh/dashboard#novo-colaborador' : null,
    acao: pode.saudeMental ? 'Ver diagnóstico' : 'Gerenciar colaboradores',
  };
}

// ── Checklist de preparação ────────────────────────────
export function passosPreparacao(d: DadosJornada): ItemPreparacao[] {
  return [
    { label: 'Empresa vinculada', ok: true },
    ...(d.pode.colaboradores ? [
      { label: 'Setores organizados', ok: d.nSetores > 0 },
      { label: 'Colaboradores adicionados', ok: d.nColaboradores > 0 },
    ] : []),
    // "realizada", não "aberta": campanha encerrada também conta, e o item
    // ficava verde dizendo "aberta" depois que a janela fechava.
    ...(d.pode.saudeMental
      ? [{ label: 'Primeira avaliação realizada', ok: d.campanhas.some(c => c.status !== 'cancelada') }]
      : []),
  ];
}

// ── Trilho da jornada ──────────────────────────────────
// O checklist acima cobria só a preparação (4 itens de cadastro) e sumia
// depois. Quem terminava o cadastro perdia qualquer noção de onde estava
// no ciclo da NR-1 — e a faixa do cabeçalho, que mostra um passo por vez,
// nunca deixou ver o que vem depois.
//
// A etapa ATUAL não é recalculada aqui: vem do `etapa` que `proximoPasso`
// declara. Se o trilho decidisse por conta própria, ele e o card diriam
// coisas diferentes na primeira regra que mudasse — que é exatamente o
// problema que este arquivo existe para não ter.

export type EtapaJornada = {
  chave: EtapaChave;
  nome: string;
  /** O que essa etapa entrega, em uma linha. */
  resumo: string;
  /** Já foi cumprida ao menos uma vez neste histórico. */
  ok: boolean;
  /** É para cá que o próximo passo aponta agora. */
  atual: boolean;
  destino: string;
};

type DefEtapa = {
  chave: EtapaChave;
  nome: string;
  resumo: string;
  destino: string;
  /** Já foi cumprida? */
  ok: (d: DadosJornada) => boolean;
  /** Este usuário participa desta etapa? Etapa que ele não pode executar
   *  nem enxergar não entra no trilho — senão o trilho promete progresso
   *  que ele não tem como destravar. */
  visivel: (p: PermissoesJornada) => boolean;
};

const ETAPAS: DefEtapa[] = [
  {
    chave: 'setores', nome: 'Setores', resumo: 'O recorte que protege o anonimato',
    destino: '/rh/dashboard#setores',
    ok: d => d.nSetores > 0, visivel: p => p.colaboradores,
  },
  {
    chave: 'pessoas', nome: 'Pessoas', resumo: 'Quem será convidado a responder',
    destino: '/rh/dashboard#novo-colaborador',
    ok: d => d.nColaboradores > 0, visivel: p => p.colaboradores,
  },
  // "Documentos" saiu do trilho. Não era etapa do ciclo: o único documento
  // que existe é o contrato de adesão, e `rh_registrar_ciencia()` o aceita
  // sozinha na primeira carga do painel. A etapa nascia verde sem ninguém
  // fazer nada, e o rótulo ainda dava a entender que aquele aceite era a
  // base legal da coleta de dado de saúde — que é outro documento, o termo
  // de tratamento de dados. Ver a etapa 'formalizar' do dossiê.
  {
    chave: 'medir', nome: 'Medir', resumo: 'Questionário validado aplicado',
    destino: '/rh/saude-mental#campanhas',
    // Encerrada, não aberta: campanha em andamento ainda não produziu
    // resultado, e marcar como feita esconderia o passo que falta.
    ok: d => d.campanhas.some(c => c.status === 'encerrada'),
    visivel: p => p.saudeMental,
  },
  {
    chave: 'ler', nome: 'Ler', resumo: 'Quais setores pedem atenção',
    destino: '/rh/saude-mental#resultado-jss',
    // A leitura não deixa rastro próprio; o que prova que aconteceu é a
    // decisão que veio depois.
    ok: d => d.ciclos.length > 0 || d.planos.length > 0,
    visivel: p => p.saudeMental,
  },
  {
    chave: 'conversar', nome: 'Conversar', resumo: 'Combinados com cada liderança',
    destino: '/rh/plano-acao?visao=lideranca',
    ok: d => d.ciclos.length > 0, visivel: p => p.planoAcao,
  },
  {
    // O resumo diz de onde as medidas vêm: o RH lia "Conversar" e "Medidas"
    // como duas listas paralelas, quando a segunda é alimentada pela primeira.
    chave: 'medidas', nome: 'Medidas', resumo: 'Os combinados viram plano formal',
    destino: '/rh/plano-acao',
    ok: d => d.planos.length > 0, visivel: p => p.planoAcao,
  },
  {
    chave: 'comprovar', nome: 'Comprovar', resumo: 'Medida concluída com evidência',
    destino: '/rh/plano-acao',
    ok: d => d.planos.some(p => p.status === 'concluida' && !!p.evidencia),
    visivel: p => p.planoAcao,
  },
];

export function etapasDaJornada(d: DadosJornada): EtapaJornada[] {
  const atual = proximoPasso(d).etapa;
  return ETAPAS
    .filter(e => e.visivel(d.pode))
    .map(e => ({
      chave: e.chave,
      nome: e.nome,
      resumo: e.resumo,
      destino: e.destino,
      // Cumprida e atual são independentes, e precisam ser: o ciclo se
      // repete, então a empresa que já fechou um ciclo inteiro volta a
      // "Medir" na janela seguinte sem desfazer o que fez. Colapsar os dois
      // num estado só fazia uma etapa concluída voltar a aparecer como
      // pendente — e o contador dizer "7 de 8" com as 8 cumpridas.
      ok: e.ok(d),
      atual: e.chave === atual,
    }));
}

/** Ciclo completo: todas as etapas visíveis cumpridas. É o marco que o
 *  painel nunca marcou — e é a batida em que o cliente percebe que
 *  recebeu o que comprou. */
export function cicloCompleto(d: DadosJornada): boolean {
  const etapas = ETAPAS.filter(e => e.visivel(d.pode));
  // Um usuário que só enxerga cadastro não "conclui o ciclo" por ter
  // cadastrado gente: sem as etapas de medição e controle não há ciclo.
  const temNucleo = etapas.some(e => e.chave === 'comprovar');
  return temNucleo && etapas.every(e => e.ok(d));
}

// ── Ritmo do ciclo ─────────────────────────────────────
// A angústia real do RH com a NR-1 não é "qual é a minha nota", é "estou
// atrasado?". O tabuleiro, então, é o calendário — não um placar.

export type SituacaoRitmo = 'em_andamento' | 'pendente' | 'vencido' | 'em_dia';

export type CompromissoRitmo = {
  chave: 'who5' | 'jss' | 'lideranca' | 'plano';
  nome: string;
  /** O que este compromisso responde, em uma linha. */
  proposito: string;
  cadencia: string;
  situacao: SituacaoRitmo;
  /** Frase curta de estado — sempre concreta, nunca "tudo certo". */
  detalhe: string;
  destino: string;
  acao: string;
};

const fmt = (d: Date | string) =>
  (typeof d === 'string' ? new Date(`${d.slice(0, 10)}T12:00:00`) : d)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const somaMeses = (base: Date, meses: number) => {
  const d = new Date(base);
  d.setMonth(d.getMonth() + meses);
  return d;
};

/**
 * Cadência de um instrumento a partir do histórico de campanhas.
 * Compartilhado entre o painel do RH e a tela de saúde mental para as duas
 * telas nunca discordarem sobre quando é a próxima medição.
 */
export function ritmoInstrumento(
  campanhas: PsychosocialCampanha[],
  instrumento: 'who5' | 'jss',
  meses: number,
  hoje = new Date(),
): { situacao: SituacaoRitmo; detalhe: string; proxima: Date | null } {
  const relacionadas = campanhas
    .filter(c => c.instrument === instrumento && c.status !== 'cancelada')
    .sort((a, b) => b.janela_fim.localeCompare(a.janela_fim));

  const aberta = relacionadas.find(c => c.status === 'aberta');
  if (aberta) {
    return {
      situacao: 'em_andamento',
      detalhe: `Janela aberta até ${fmt(aberta.janela_fim)} · ${aberta.n_respondentes} de ${aberta.n_convidados} responderam`,
      proxima: null,
    };
  }

  const ultima = relacionadas[0];
  if (!ultima) {
    return { situacao: 'pendente', detalhe: 'Nunca foi aplicado — é a linha de base da empresa.', proxima: null };
  }

  const referencia = ultima.encerrada_em?.slice(0, 10) ?? ultima.janela_fim;
  const proxima = somaMeses(new Date(`${referencia}T12:00:00`), meses);
  if (proxima <= hoje) {
    return {
      situacao: 'vencido',
      detalhe: `Último ciclo terminou em ${fmt(referencia)}. Nova medição já era esperada.`,
      proxima,
    };
  }
  return {
    situacao: 'em_dia',
    detalhe: `Último ciclo em ${fmt(referencia)} · próxima medição a partir de ${fmt(proxima)}`,
    proxima,
  };
}

export function ritmoDoCiclo(d: DadosJornada, hoje = new Date()): CompromissoRitmo[] {
  const itens: CompromissoRitmo[] = [];

  if (d.pode.saudeMental) {
    const who5 = ritmoInstrumento(d.campanhas, 'who5', 1, hoje);
    itens.push({
      chave: 'who5',
      nome: 'Bem-estar (WHO-5)',
      proposito: 'Como as pessoas estão',
      cadencia: 'Mensal',
      situacao: who5.situacao,
      detalhe: who5.detalhe,
      destino: who5.situacao === 'em_andamento' ? '/rh/saude-mental#campanhas' : '/rh/saude-mental?nova=1&instrumento=who5',
      acao: who5.situacao === 'em_andamento' ? 'Acompanhar' : 'Preparar',
    });

    const jss = ritmoInstrumento(d.campanhas, 'jss', 3, hoje);
    itens.push({
      chave: 'jss',
      nome: 'Carga de trabalho (JSS)',
      proposito: 'O que no trabalho pesa',
      cadencia: 'Trimestral',
      situacao: jss.situacao,
      detalhe: jss.detalhe,
      destino: jss.situacao === 'em_andamento' ? '/rh/saude-mental#campanhas' : '/rh/saude-mental?nova=1&instrumento=jss',
      acao: jss.situacao === 'em_andamento' ? 'Acompanhar' : 'Preparar',
    });
  }

  if (d.pode.planoAcao) {
    const ativo = d.ciclos.find(c => c.status === 'ativo');
    const temJss = d.campanhas.some(c => c.instrument === 'jss' && c.status === 'encerrada');
    itens.push({
      chave: 'lideranca',
      nome: 'Conversa com a liderança',
      proposito: 'Transformar o diagnóstico em combinado',
      cadencia: 'A cada JSS',
      situacao: ativo ? 'em_andamento' : (temJss && d.ciclos.length === 0 ? 'pendente' : 'em_dia'),
      detalhe: ativo
        ? `Jornada aberta em ${ativo.setor}, até ${fmt(ativo.fim)}`
        : d.ciclos.length === 0
          ? (temJss ? 'Há diagnóstico fechado e nenhuma conversa registrada.' : 'Começa quando o primeiro JSS for encerrado.')
          : `${d.ciclos.length} jornada(s) registrada(s). Nenhuma em aberto.`,
      destino: ativo ? '/rh/plano-acao?visao=lideranca' : '/rh/plano-acao?visao=lideranca&nova=1',
      acao: ativo ? 'Acompanhar' : 'Preparar',
    });

    const abertas = d.planos.filter(p => p.status !== 'concluida' && p.status !== 'cancelada');
    const atrasadas = abertas.filter(p => p.atrasada);
    itens.push({
      chave: 'plano',
      nome: 'Medidas do plano de ação',
      proposito: 'O que a empresa mudou de fato',
      cadencia: 'Contínuo',
      situacao: atrasadas.length > 0 ? 'vencido' : abertas.length > 0 ? 'em_andamento' : d.planos.length === 0 ? 'pendente' : 'em_dia',
      detalhe: atrasadas.length > 0
        ? `${atrasadas.length} medida(s) fora do prazo, de ${abertas.length} em aberto.`
        : abertas.length > 0
          ? `${abertas.length} medida(s) em andamento, nenhuma atrasada.`
          : d.planos.length === 0
            ? 'Nenhuma medida registrada ainda.'
            : `${d.planos.length} medida(s), todas encerradas.`,
      destino: '/rh/plano-acao',
      acao: 'Abrir plano',
    });
  }

  return itens;
}

// ── Dossiê do PGR ──────────────────────────────────────
// Não é score: é completude de evidência. O medo do RH é fiscalização, e a
// pergunta que ele quer respondida é "o que falta para isto se sustentar".

export type EtapaDossie = {
  chave: string;
  /** O que a NR-1 pede, na linguagem da norma. */
  exige: string;
  /** Como a empresa comprova isso aqui dentro. */
  comprova: string;
  ok: boolean;
  /** Por que ainda não fecha — só aparece quando `ok` é falso. */
  pendencia: string;
  destino: string;
  /** Sem permissão para ler a origem do dado: não dá para afirmar nada. */
  desconhecido?: boolean;
};

export function dossieNr1(d: DadosJornada): EtapaDossie[] {
  const aplicadas = d.campanhas.filter(c => c.status === 'encerrada' && c.n_respondentes > 0);
  const jssAplicado = aplicadas.some(c => c.instrument === 'jss');
  const comMedida = d.planos.length > 0;
  const naFonte = d.planos.some(p => p.nivel_controle === 'fonte' || p.nivel_controle === 'organizacional');
  const comEvidencia = d.planos.some(p => p.status === 'concluida' && !!p.evidencia);
  // O contrato de adesão (`termos_b2b`) não autoriza tratar dado de saúde:
  // ele rege a relação comercial. A base legal da coleta é o termo de
  // tratamento de dados (controladora × operadora, LGPD art. 39).
  const tratamentoDados = d.documentos.filter(
    doc => doc.tipo === 'tratamento_dados' && doc.exige_aceite,
  );

  return [
    {
      chave: 'identificar',
      exige: 'Identificar os fatores de risco psicossocial',
      comprova: 'Questionário validado aplicado por setor, com resultado agregado',
      ok: aplicadas.length > 0,
      pendencia: 'Nenhuma campanha encerrada com respostas até agora.',
      destino: '/rh/saude-mental',
      desconhecido: !d.pode.veCampanhas,
    },
    {
      chave: 'avaliar',
      exige: 'Avaliar o risco e apontar a fonte',
      comprova: 'JSS encerrado: separa cobrança, autonomia e apoio por setor',
      ok: jssAplicado,
      pendencia: 'Só o bem-estar foi medido. Sem o JSS o relatório mostra o sintoma, não a causa.',
      destino: '/rh/saude-mental#resultado-jss',
      desconhecido: !d.pode.veCampanhas,
    },
    {
      chave: 'medidas',
      exige: 'Adotar medidas de prevenção e controle',
      comprova: 'Plano de ação com responsável e prazo para cada risco',
      ok: comMedida,
      pendencia: 'Diagnóstico sem medida registrada documenta que a empresa sabia do risco e não agiu.',
      destino: '/rh/plano-acao',
      desconhecido: !d.pode.vePlanos,
    },
    {
      chave: 'fonte',
      exige: 'Priorizar a atuação sobre a fonte',
      comprova: 'Ao menos uma medida no nível da fonte ou da organização do trabalho',
      ok: naFonte,
      pendencia: 'Todas as medidas são de cuidado individual — a última camada da hierarquia de controle, que sozinha não encerra o risco.',
      destino: '/rh/plano-acao',
      desconhecido: !d.pode.vePlanos,
    },
    {
      chave: 'evidencia',
      exige: 'Comprovar a execução do que foi definido',
      comprova: 'Medida concluída com arquivo de evidência anexado',
      ok: comEvidencia,
      pendencia: 'Nenhuma medida foi concluída com evidência. Sem o arquivo, a medida não fecha.',
      destino: '/rh/plano-acao',
      desconhecido: !d.pode.vePlanos,
    },
    {
      chave: 'formalizar',
      exige: 'Formalizar a base legal do tratamento de dados',
      comprova: 'Termo de tratamento de dados aceito, com versão, data e signatário',
      // SÓ o termo de tratamento de dados vale aqui. Antes qualquer aceite
      // servia — e o único documento que existe é o contrato de adesão
      // (`termos_b2b`), aceito automaticamente na primeira carga do painel.
      // Ou seja: o dossiê dava esta etapa por cumprida sem que a empresa
      // tivesse assinado nada sobre tratamento de dado de saúde. Num
      // documento que existe para responder à fiscalização, afirmar isso é
      // pior do que deixar a etapa em aberto.
      ok: tratamentoDados.length > 0 && tratamentoDados.every(doc => !!doc.aceito_em),
      pendencia: tratamentoDados.length === 0
        ? 'Não há termo de tratamento de dados vigente para aceitar. O contrato de adesão não cobre isto — fale com a Malama.'
        : 'O termo de tratamento de dados ainda não foi aceito.',
      destino: '/rh/empresa#documentos',
    },
  ];
}
