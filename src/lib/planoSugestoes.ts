import type {
  JssCortes, JssItemKey, JssSetor, PlanoFator, PlanoNivel, PsychosocialSetor,
} from '../services/empresaService';
import {
  obterInsightJss, itensFortesJss, JSS_ITENS_POR_DIMENSAO, type JssDimensao,
} from './jssInsights';
import { obterInsightWho5, pontoForteWho5 } from './who5Insights';

export type Sugestao = {
  fator: PlanoFator; titulo: string; objetivo: string; medida: string; nivel: PlanoNivel;
};

export type Diagnostico = { fortes: string[]; atencao: string[]; sugestoes: Sugestao[] };

export const SUGESTOES: Record<'demanda' | 'controle' | 'apoio' | 'bemEstar' | 'manutencao', Sugestao[]> = {
  demanda: [
    { fator: 'demanda', titulo: 'Três prioridades por semana', objetivo: 'Dar clareza ao que realmente precisa ser entregue.', medida: 'No início da semana, definir com a equipe as três prioridades e o que pode esperar.', nivel: 'organizacional' },
    { fator: 'demanda', titulo: 'Revisão rápida da carga', objetivo: 'Evitar acúmulo e prazos incompatíveis.', medida: 'Fazer uma conversa de 20 minutos para listar tarefas, retirar duplicidades e redistribuir o excesso.', nivel: 'fonte' },
    { fator: 'jornada', titulo: 'Pausas e turnos previsíveis', objetivo: 'Reduzir desgaste durante a jornada.', medida: 'Revisar pausas, trocas de turno e horas extras; comunicar a escala com antecedência.', nivel: 'fonte' },
  ],
  controle: [
    { fator: 'controle', titulo: 'Escolha de como fazer', objetivo: 'Aumentar a autonomia nas tarefas.', medida: 'Definir o resultado esperado e deixar a equipe escolher o melhor modo de executar.', nivel: 'organizacional' },
    { fator: 'controle', titulo: 'Ouvir antes de mudar', objetivo: 'Incluir quem executa o trabalho nas decisões.', medida: 'Antes de alterar rotina, meta ou escala, ouvir impactos e sugestões da equipe.', nivel: 'organizacional' },
    { fator: 'controle', titulo: 'Papéis mais claros', objetivo: 'Reduzir ordens conflitantes e retrabalho.', medida: 'Registrar quem decide, quem executa e qual é o critério de conclusão das tarefas principais.', nivel: 'fonte' },
  ],
  apoio: [
    { fator: 'apoio', titulo: 'Conversa individual curta', objetivo: 'Criar espaço seguro para pedir ajuda.', medida: 'Realizar uma conversa individual de 20 minutos por mês, com escuta e próximo passo registrado.', nivel: 'organizacional' },
    { fator: 'apoio', titulo: 'Acordos de convivência', objetivo: 'Melhorar respeito e cooperação no dia a dia.', medida: 'Construir com a equipe três acordos simples de convivência e revisá-los mensalmente.', nivel: 'organizacional' },
    { fator: 'reconhecimento', titulo: 'Reconhecimento específico', objetivo: 'Valorizar entregas e atitudes positivas.', medida: 'Toda semana, reconhecer de forma específica uma entrega, colaboração ou melhoria observada.', nivel: 'organizacional' },
  ],
  // Sinal vem do WHO-5 (bem-estar), não do JSS (organização do trabalho) —
  // por isso o encaminhamento prioriza escuta e cuidado, não redesenho de tarefa.
  bemEstar: [
    { fator: 'apoio', titulo: 'Escuta individual dedicada', objetivo: 'Entender o que está pesando antes que vire afastamento.', medida: 'Realizar uma conversa individual reservada, sem cobrança de resultado, e registrar o que a pessoa precisa agora.', nivel: 'individual' },
    { fator: 'apoio', titulo: 'Lembrar o apoio disponível', objetivo: 'Garantir que a equipe saiba a quem recorrer.', medida: 'Comunicar de novo, de forma simples, o canal de apoio psicológico adicional já contratado pela empresa, quando existir.', nivel: 'individual' },
    { fator: 'reconhecimento', titulo: 'Pausa e reconhecimento no time', objetivo: 'Aliviar o clima antes de discutir carga ou processo.', medida: 'Reservar um momento do time para reconhecer o período difícil e alinhar expectativas realistas para as próximas semanas.', nivel: 'organizacional' },
  ],
  manutencao: [
    { fator: 'apoio', titulo: 'Preservar o que funciona', objetivo: 'Manter as práticas positivas do setor.', medida: 'Perguntar à equipe qual prática ajuda mais o trabalho e combinar como mantê-la no próximo ciclo.', nivel: 'organizacional' },
    { fator: 'reconhecimento', titulo: 'Compartilhar uma boa prática', objetivo: 'Transformar um ponto forte em rotina consciente.', medida: 'Registrar uma prática que funciona, explicar por que ajuda e reforçá-la nas reuniões do setor.', nivel: 'organizacional' },
  ],
};

/**
 * Cruza o diagnóstico JSS (organização do trabalho) com o WHO-5 (bem-estar)
 * de um setor. Sem `setorJss`/`cortesJss` cai no que o WHO-5 sozinho indicar;
 * sem sinal nenhum dos dois, cai na manutenção. É usado tanto pelo cartão de
 * jornada de liderança quanto pela criação de uma ação geral — mesma leitura
 * em qualquer entrada do plano de ação.
 */
export function gerarDiagnostico(
  setorJss: JssSetor | undefined,
  cortesJss: JssCortes | null | undefined,
  setorWho5?: PsychosocialSetor,
): Diagnostico {
  const who5 = setorWho5 ? obterInsightWho5(setorWho5) : null;
  const forteWho5 = setorWho5 ? pontoForteWho5(setorWho5) : null;

  if (!setorJss || !cortesJss) {
    if (who5 && who5.fatores.length > 0) {
      return { fortes: [], atencao: who5.fatores.slice(0, 6), sugestoes: SUGESTOES.bemEstar };
    }
    return { fortes: forteWho5 ? [forteWho5] : [], atencao: [], sugestoes: SUGESTOES.manutencao };
  }

  const temSinal = (itens: JssItemKey[]) => itens.some(item => (setorJss.itens_risco?.[item] ?? 0) >= 50);
  const sinalDemanda = temSinal(JSS_ITENS_POR_DIMENSAO.demanda);
  const sinalControle = temSinal(JSS_ITENS_POR_DIMENSAO.controle);
  const sinalApoio = temSinal(JSS_ITENS_POR_DIMENSAO.apoio);
  const fortes: string[] = [];
  const mistos: string[] = [];
  // Dimensões que NÃO saíram como ponto forte no conjunto: é dentro delas
  // que vale nomear o item que já funciona.
  const dimensoesEmAtencao: JssDimensao[] = [];
  if (setorJss.demanda < cortesJss.demanda && !sinalDemanda) fortes.push('A cobrança está mais equilibrada que o ponto de referência atual.');
  else dimensoesEmAtencao.push('demanda');
  if (setorJss.controle >= cortesJss.controle && !sinalControle) fortes.push('A equipe demonstra boa autonomia para organizar o trabalho.');
  else dimensoesEmAtencao.push('controle');
  if (setorJss.apoio >= cortesJss.apoio && !sinalApoio) fortes.push('O apoio entre equipe e liderança aparece como ponto positivo.');
  else dimensoesEmAtencao.push('apoio');
  if (setorJss.demanda < cortesJss.demanda && sinalDemanda) mistos.push('Resultado misto na cobrança: o geral é favorável, mas há situações específicas para investigar.');
  if (setorJss.controle >= cortesJss.controle && sinalControle) mistos.push('Resultado misto na autonomia: o geral é favorável, mas há situações específicas para investigar.');
  if (setorJss.apoio >= cortesJss.apoio && sinalApoio) mistos.push('Resultado misto no apoio: o geral é favorável, mas há situações específicas para investigar.');
  if (forteWho5) fortes.push(forteWho5);
  fortes.push(...itensFortesJss(setorJss, dimensoesEmAtencao));
  const insight = obterInsightJss(setorJss, cortesJss);
  let atencao = [...insight.fatores, ...mistos, ...insight.sinais];

  const grupos: Sugestao[] = [];
  if (setorJss.demanda >= cortesJss.demanda || sinalDemanda) grupos.push(...SUGESTOES.demanda);
  if (setorJss.controle < cortesJss.controle || sinalControle) grupos.push(...SUGESTOES.controle);
  if (setorJss.apoio < cortesJss.apoio || sinalApoio) grupos.push(...SUGESTOES.apoio);

  if (who5 && who5.fatores.length > 0) {
    atencao = [...atencao, ...who5.fatores];
    if (grupos.length === 0) grupos.push(...SUGESTOES.bemEstar);
  }
  if (grupos.length === 0) grupos.push(...SUGESTOES.manutencao);

  return { fortes, atencao: atencao.slice(0, 6), sugestoes: grupos.slice(0, 4) };
}
