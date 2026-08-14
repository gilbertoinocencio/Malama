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
    descricao: 'Cobra-se muito de quem tem pouca liberdade para decidir.',
    leitura: 'É a pior combinação das duas: muita cobrança e pouca autonomia. Costuma ser por onde começar a olhar.',
  },
  trabalho_ativo: {
    label: 'Trabalho ativo',
    descricao: 'Cobra-se muito, mas a pessoa tem liberdade para decidir.',
    leitura: 'Cansa, mas poder decidir protege. Vale ficar de olho no volume de trabalho e nas pausas.',
  },
  trabalho_passivo: {
    label: 'Trabalho passivo',
    descricao: 'Cobra-se menos, mas a pessoa também decide pouco.',
    leitura: 'Aqui o problema não é sobrecarga: é o desânimo e a pessoa ir perdendo prática no que sabe fazer.',
  },
  baixa_exigencia: {
    label: 'Baixa exigência',
    descricao: 'Cobrança menor e liberdade para decidir preservada.',
    leitura: 'Não apareceu sinal de sobrecarga nem de falta de autonomia. Segue no acompanhamento de sempre.',
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
    criterio: 'Muita cobrança, pouca autonomia e pouco apoio ao mesmo tempo.',
  },
  alta: {
    label: 'Prioridade elevada',
    cor: '#ec835a',
    criterio: 'Muita cobrança com pouca autonomia.',
  },
  moderada: {
    label: 'Olhar com calma',
    cor: '#d59a16',
    criterio: 'Só um ponto chamou atenção: o apoio, a autonomia ou a cobrança.',
  },
  acompanhamento: {
    label: 'Acompanhar',
    cor: '#548064',
    criterio: 'Nada chamou atenção neste período.',
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
    sentidoLabel: 'Quanto maior, pior',
    resumo: 'Junta os três números abaixo em um só, para você saber por onde começar.',
    pergunta: 'Se eu pudesse olhar um número só, qual seria?',
    composicao: 'É a média de três coisas: a cobrança, a falta de autonomia e a falta de apoio. Cobrança alta faz o número subir; autonomia e apoio altos fazem ele descer.',
  },
  demanda: {
    label: 'Demanda',
    sentido: 'adverso',
    sentidoLabel: 'Quanto maior, mais cobrança',
    resumo: 'O quanto o trabalho cobra: pressa, quantidade de tarefas e prazo.',
    pergunta: 'Estamos pedindo mais do que cabe no tempo e na equipe?',
    composicao: '5 perguntas: se precisa trabalhar rápido demais, se produz muito em pouco tempo, se sente que o trabalho exige demais, se o tempo dá para as tarefas e se recebe ordens que se contradizem.',
  },
  controle: {
    label: 'Controle',
    sentido: 'protetor',
    sentidoLabel: 'Quanto maior, melhor',
    resumo: 'O quanto a pessoa decide sobre o próprio trabalho e usa o que sabe fazer.',
    pergunta: 'Quem faz o trabalho tem espaço para decidir como fazer?',
    composicao: '6 perguntas: se aprende coisas novas, se usa o que sabe, se pode tomar iniciativa, se repete sempre as mesmas tarefas e se escolhe como e o que fazer.',
  },
  apoio: {
    label: 'Apoio',
    sentido: 'protetor',
    sentidoLabel: 'Quanto maior, melhor',
    resumo: 'O quanto os colegas e a chefia seguram a barra de quem está sob pressão.',
    pergunta: 'Quem está sobrecarregado tem com quem contar?',
    composicao: '6 perguntas: como é o ambiente, como o time convive, se dá para contar com os colegas, se há compreensão nos dias ruins e como é a relação com a chefia.',
  },
};

const ITEM_SINAIS: Record<JssItemKey, string> = {
  a: 'Precisa trabalhar rápido demais',
  b: 'Precisa produzir muito em pouco tempo',
  c: 'Sente que o trabalho exige demais',
  d: 'O tempo não dá para as tarefas',
  e: 'Recebe ordens que se contradizem',
  f: 'Quase não aprende coisas novas',
  g: 'Não usa o que sabe fazer',
  h: 'Pouco espaço para tomar iniciativa',
  i: 'Repete sempre as mesmas tarefas',
  j: 'Não escolhe como fazer o trabalho',
  k: 'Não escolhe o que fazer no trabalho',
  l: 'Ambiente pouco tranquilo',
  m: 'Convivência ruim no time',
  n: 'Não dá para contar com os colegas',
  o: 'Pouca compreensão dos colegas nos dias ruins',
  p: 'Relação difícil com a chefia',
  q: 'Pouco vínculo com os colegas',
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
  if (demandaAlta) fatores.push('Cobrança alta (sobrecarga)');
  if (controleBaixo) fatores.push('Pouca autonomia para decidir');
  if (apoioReduzido) fatores.push('Pouco apoio de colegas ou da chefia');

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
  if (demandaAlta) encaminhamentos.push('Rever metas, volume de trabalho, prazos, pausas, prioridades e tamanho da equipe.');
  if (controleBaixo) encaminhamentos.push('Dar mais espaço de decisão, ouvir a equipe nas mudanças, rever como as tarefas são divididas e deixar claro o papel de cada um.');
  if (apoioReduzido) encaminhamentos.push('Olhar de perto a chefia e a convivência do time: conflitos, desrespeito, possível assédio. Isso pede conversa reservada e método próprio.');
  if (fatores.length === 0) encaminhamentos.push('Seguir acompanhando e confirmar o resultado conversando com quem faz o trabalho.');

  return { classificacao, prioridade, apoioReduzido, fatores, sinais, encaminhamentos };
}
