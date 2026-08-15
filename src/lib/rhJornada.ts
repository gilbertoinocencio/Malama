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

export type PassoJornada = {
  titulo: string;
  descricao: string;
  /** null = não há ação clicável; a tela não deve desenhar botão morto. */
  destino: string | null;
  acao: string;
  atalho?: { to: string; label: string };
  /** Bloqueia o resto da jornada — a faixa destaca em âmbar. */
  bloqueio?: boolean;
};

export type ItemPreparacao = { label: string; ok: boolean };

export const docsPendentesDe = (documentos: DocumentoLegal[]): number =>
  documentos.filter(d => d.exige_aceite && !d.aceito_em).length;

// ── Próximo passo ──────────────────────────────────────
export function proximoPasso(d: DadosJornada): PassoJornada {
  const { pode } = d;
  const temCampanha = d.campanhas.some(c => c.status !== 'cancelada');
  const campanhaAberta = d.campanhas.find(c => c.status === 'aberta');
  const temResultado = d.campanhas.some(c => c.status === 'encerrada');
  const temJss = d.campanhas.some(c => c.instrument === 'jss' && c.status !== 'cancelada');
  const cicloAtivo = d.ciclos.find(c => c.status === 'ativo');
  const pendentes = docsPendentesDe(d.documentos);
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
    };
  }
  if (pode.colaboradores && d.nColaboradores === 0) {
    return {
      titulo: 'Adicione os colaboradores',
      descricao: 'Convide um a um pelo painel ou traga a lista inteira de uma vez pela planilha.',
      destino: '/rh/dashboard#novo-colaborador',
      acao: 'Adicionar colaboradores',
      atalho: { to: '/rh/importar', label: 'Importar planilha' },
    };
  }
  // Antes da campanha de propósito: a coleta é de dado de saúde, e o aceite
  // é o que documenta a base legal disso.
  if (pode.empresa && pendentes > 0) {
    return {
      titulo: pendentes === 1 ? 'Aceite o documento pendente' : `Aceite os ${pendentes} documentos pendentes`,
      descricao: 'O aceite fica registrado com versão, data e quem assinou — é o que sustenta a coleta de dados de saúde no PGR.',
      destino: '/rh/empresa',
      acao: 'Revisar documentos',
      bloqueio: true,
    };
  }
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
      bloqueio: true,
    };
  }
  if (pode.saudeMental && campanhaAberta) {
    return {
      titulo: `Acompanhe a campanha de ${campanhaAberta.instrument === 'jss' ? 'carga de trabalho' : 'bem-estar'}`,
      descricao: 'Veja a participação, compartilhe os links e encerre a campanha quando a janela terminar.',
      destino: '/rh/saude-mental#campanhas',
      acao: 'Acompanhar campanha',
    };
  }
  if (pode.saudeMental && !temCampanha) {
    return {
      titulo: 'Abra o primeiro diagnóstico',
      descricao: 'Comece com WHO-5 e JSS para criar a primeira fotografia de bem-estar e condições de trabalho.',
      destino: '/rh/saude-mental?nova=1',
      acao: 'Iniciar diagnóstico',
    };
  }
  if (pode.saudeMental && !temJss) {
    return {
      titulo: 'Complete o diagnóstico inicial com o JSS',
      descricao: 'O WHO-5 mostra como as pessoas estão; o JSS ajuda a entender o que no trabalho precisa mudar.',
      destino: '/rh/saude-mental?nova=1&instrumento=jss',
      acao: 'Abrir JSS',
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
    };
  }
  if (pode.planoAcao && cicloAtivo) {
    return {
      titulo: `Acompanhe os combinados de ${cicloAtivo.setor}`,
      descricao: 'Registre o que entrou em prática e avance a jornada somente quando houver evidência.',
      destino: '/rh/plano-acao?visao=lideranca',
      acao: 'Ver evolução',
    };
  }
  if (pode.planoAcao && temJss && d.planos.length === 0) {
    return {
      titulo: 'Prepare a conversa com as lideranças',
      descricao: 'Use o diagnóstico agregado para reconhecer pontos fortes e combinar até três melhorias por setor.',
      destino: '/rh/plano-acao?visao=lideranca&nova=1',
      acao: 'Preparar conversa',
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
    ...(d.pode.empresa ? [{ label: 'Documentos aceitos', ok: docsPendentesDe(d.documentos) === 0 }] : []),
    // "realizada", não "aberta": campanha encerrada também conta, e o item
    // ficava verde dizendo "aberta" depois que a janela fechava.
    ...(d.pode.saudeMental
      ? [{ label: 'Primeira avaliação realizada', ok: d.campanhas.some(c => c.status !== 'cancelada') }]
      : []),
  ];
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
  const aceites = d.documentos.filter(doc => doc.exige_aceite);

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
      comprova: 'Documentos da empresa aceitos, com versão, data e signatário',
      ok: aceites.length > 0 && aceites.every(doc => !!doc.aceito_em),
      pendencia: aceites.length === 0
        ? 'Ainda não há documento vigente exigindo aceite.'
        : 'Há documento aguardando aceite.',
      destino: '/rh/empresa',
    },
  ];
}
