import type {
  JssClassificacao, JssCortes, JssItemKey, JssSetor,
} from '../services/empresaService';

export type JssPrioridade = 'critica' | 'alta' | 'moderada' | 'acompanhamento';

export type JssInsight = {
  classificacao: JssClassificacao | null;
  prioridade: JssPrioridade;
  apoioReduzido: boolean;
  fatores: string[];
  sinais: string[];
  encaminhamentos: string[];
};

export const JSS_CLASSIFICACAO: Record<JssClassificacao, {
  label: string;
  descricao: string;
  /** O que o quadrante significa na prática, para quem lê o painel. */
  leitura: string;
}> = {
  alta_exigencia: {
    label: 'Alta exigência',
    descricao: 'Demanda elevada combinada com baixo controle sobre o trabalho.',
    leitura: 'É o quadrante associado a maior risco à saúde no modelo de Karasek — cobra-se muito de quem tem pouca margem para decidir. Costuma ser por onde a investigação começa.',
  },
  trabalho_ativo: {
    label: 'Trabalho ativo',
    descricao: 'Demanda elevada, mas com controle preservado.',
    leitura: 'Trabalho puxado em que a pessoa ainda decide como fazer. Desgasta, mas a autonomia protege; vale monitorar volume e pausas.',
  },
  trabalho_passivo: {
    label: 'Trabalho passivo',
    descricao: 'Demanda menor combinada com baixo controle.',
    leitura: 'Pouca sobrecarga, pouca autonomia. Associa-se a desmotivação e perda de habilidades, não a sobrecarga aguda.',
  },
  baixa_exigencia: {
    label: 'Baixa exigência',
    descricao: 'Demanda menor e controle preservado.',
    leitura: 'Sem sinal de sobrecarga nem de falta de autonomia por este instrumento. Segue no acompanhamento de rotina.',
  },
};

export const JSS_PRIORIDADE: Record<JssPrioridade, {
  label: string;
  cor: string;
  /** Regra que colocou o setor nesta faixa — o RH precisa saber por quê. */
  criterio: string;
}> = {
  critica: {
    label: 'Investigar primeiro',
    cor: '#d03b3b',
    criterio: 'Alta exigência e apoio abaixo da mediana do período.',
  },
  alta: {
    label: 'Prioridade elevada',
    cor: '#ec835a',
    criterio: 'Alta exigência: demanda acima e controle abaixo da mediana.',
  },
  moderada: {
    label: 'Aprofundar análise',
    cor: '#d59a16',
    criterio: 'Um fator isolado: apoio reduzido, trabalho passivo ou trabalho ativo.',
  },
  acompanhamento: {
    label: 'Acompanhar',
    cor: '#548064',
    criterio: 'Nenhum fator acima do limiar relativo neste período.',
  },
};

// ── Dicionário dos indicadores gerais ──────────────────
// O painel é lido por RH e SST, não por quem conhece a JSS. Cada número
// precisa dizer o que mede, para que lado ele piora e de onde ele vem.
export type JssMetricaKey = 'indice' | 'demanda' | 'controle' | 'apoio';

export const JSS_METRICAS: Record<JssMetricaKey, {
  label: string;
  /** Onde o número piora: 'adverso' = maior é pior; 'protetor' = maior é melhor. */
  sentido: 'adverso' | 'protetor';
  sentidoLabel: string;
  /** Uma linha, visível no card. */
  resumo: string;
  /** A pergunta de gestão que o indicador responde. */
  pergunta: string;
  /** Do que o número é feito — as perguntas do questionário. */
  composicao: string;
}> = {
  indice: {
    label: 'Índice de exposição',
    sentido: 'adverso',
    sentidoLabel: 'Maior = mais exposição',
    resumo: 'Resume em um número o quanto o trabalho, do jeito que está organizado, expõe quem o faz.',
    pergunta: 'Se eu tivesse um só número para priorizar, qual seria?',
    composicao: 'Média de demanda, controle invertido e apoio invertido: (demanda + (100 − controle) + (100 − apoio)) ÷ 3. Demanda alta empurra para cima; controle e apoio altos puxam para baixo.',
  },
  demanda: {
    label: 'Demanda',
    sentido: 'adverso',
    sentidoLabel: 'Maior = mais cobrança',
    resumo: 'O quanto o trabalho cobra: ritmo, volume e prazo.',
    pergunta: 'Estamos pedindo mais do que cabe no tempo e na equipe?',
    composicao: '5 perguntas sobre rapidez exigida, intensidade, exigência excessiva, tempo suficiente para as tarefas e exigências contraditórias.',
  },
  controle: {
    label: 'Controle',
    sentido: 'protetor',
    sentidoLabel: 'Maior = mais autonomia',
    resumo: 'O quanto a pessoa decide sobre o próprio trabalho e usa o que sabe.',
    pergunta: 'Quem faz o trabalho tem margem para decidir como fazê-lo?',
    composicao: '6 perguntas sobre aprender coisas novas, usar habilidades, tomar iniciativa, repetição de tarefas e escolher como e o que fazer.',
  },
  apoio: {
    label: 'Apoio',
    sentido: 'protetor',
    sentidoLabel: 'Maior = mais suporte',
    resumo: 'O quanto colegas e liderança sustentam quem está sob pressão.',
    pergunta: 'Quem está sobrecarregado tem com quem contar?',
    composicao: '6 perguntas sobre ambiente, convivência da equipe, apoio dos colegas, compreensão em dias difíceis e relação com a chefia.',
  },
};

const ITEM_SINAIS: Record<JssItemKey, string> = {
  a: 'Ritmo de trabalho muito rápido',
  b: 'Trabalho intenso em pouco tempo',
  c: 'Exigência percebida como excessiva',
  d: 'Tempo insuficiente para as tarefas',
  e: 'Exigências contraditórias ou discordantes',
  f: 'Pouca oportunidade de aprender',
  g: 'Baixo uso de habilidades e conhecimentos',
  h: 'Pouco espaço para iniciativa',
  i: 'Repetição excessiva de tarefas',
  j: 'Pouca autonomia sobre como trabalhar',
  k: 'Pouca autonomia sobre o que fazer',
  l: 'Ambiente pouco calmo ou agradável',
  m: 'Relacionamento de equipe fragilizado',
  n: 'Baixo apoio dos colegas',
  o: 'Baixa compreensão dos colegas em dias difíceis',
  p: 'Relacionamento com a liderança fragilizado',
  q: 'Baixa vinculação com os colegas',
};

const ORDEM: JssPrioridade[] = ['critica', 'alta', 'moderada', 'acompanhamento'];

export const prioridadeOrdem = (p: JssPrioridade) => ORDEM.indexOf(p);

export function classificarJss(setor: JssSetor, cortes?: JssCortes | null): JssClassificacao | null {
  if (setor.classificacao) return setor.classificacao;
  if (!cortes) return null;
  const demandaAlta = setor.demanda >= cortes.demanda;
  const controleBaixo = setor.controle < cortes.controle;
  if (demandaAlta && controleBaixo) return 'alta_exigencia';
  if (demandaAlta) return 'trabalho_ativo';
  if (controleBaixo) return 'trabalho_passivo';
  return 'baixa_exigencia';
}

export function obterInsightJss(setor: JssSetor, cortes?: JssCortes | null): JssInsight {
  const classificacao = classificarJss(setor, cortes);
  const demandaAlta = cortes ? setor.demanda >= cortes.demanda : false;
  const controleBaixo = cortes ? setor.controle < cortes.controle : false;
  const apoioReduzido = cortes ? setor.apoio < cortes.apoio : false;
  const fatores: string[] = [];
  if (demandaAlta) fatores.push('Excesso de demanda / sobrecarga');
  if (controleBaixo) fatores.push('Baixo controle / pouca autonomia');
  if (apoioReduzido) fatores.push('Falta de suporte / apoio no trabalho');

  let prioridade: JssPrioridade = 'acompanhamento';
  if (classificacao === 'alta_exigencia' && apoioReduzido) prioridade = 'critica';
  else if (classificacao === 'alta_exigencia') prioridade = 'alta';
  else if (apoioReduzido || classificacao === 'trabalho_passivo') prioridade = 'moderada';
  else if (classificacao === 'trabalho_ativo') prioridade = 'moderada';

  const sinais = Object.entries(setor.itens_risco ?? {})
    .filter((entry): entry is [JssItemKey, number] => Number.isFinite(entry[1]))
    .sort((a, b) => b[1] - a[1])
    .filter(([, valor]) => valor >= 50)
    .slice(0, 3)
    .map(([key]) => ITEM_SINAIS[key]);

  const encaminhamentos: string[] = [];
  if (demandaAlta) encaminhamentos.push('Revisar metas, volume, prazos, pausas, prioridades e dimensionamento da equipe.');
  if (controleBaixo) encaminhamentos.push('Rever autonomia, participação nas decisões, desenho das tarefas e clareza de papéis.');
  if (apoioReduzido) encaminhamentos.push('Investigar liderança, relações de equipe, conflitos, violência e possível assédio por método específico.');
  if (fatores.length === 0) encaminhamentos.push('Manter acompanhamento periódico e validar o resultado com a escuta do trabalho real.');

  return { classificacao, prioridade, apoioReduzido, fatores, sinais, encaminhamentos };
}
