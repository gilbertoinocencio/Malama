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
}> = {
  alta_exigencia: {
    label: 'Alta exigência',
    descricao: 'Demanda elevada combinada com baixo controle sobre o trabalho.',
  },
  trabalho_ativo: {
    label: 'Trabalho ativo',
    descricao: 'Demanda elevada, mas com controle preservado.',
  },
  trabalho_passivo: {
    label: 'Trabalho passivo',
    descricao: 'Demanda menor combinada com baixo controle.',
  },
  baixa_exigencia: {
    label: 'Baixa exigência',
    descricao: 'Demanda menor e controle preservado.',
  },
};

export const JSS_PRIORIDADE: Record<JssPrioridade, { label: string; cor: string }> = {
  critica: { label: 'Investigar primeiro', cor: '#d03b3b' },
  alta: { label: 'Prioridade elevada', cor: '#ec835a' },
  moderada: { label: 'Aprofundar análise', cor: '#d59a16' },
  acompanhamento: { label: 'Acompanhar', cor: '#548064' },
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
