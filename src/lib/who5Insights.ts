import type { PsychosocialSetor } from '../services/empresaService';

export type Who5Prioridade = 'critica' | 'alta' | 'moderada' | 'acompanhamento';

export type Who5Insight = {
  prioridade: Who5Prioridade;
  bemEstarReduzido: boolean;
  fatores: string[];
  encaminhamentos: string[];
};

// Mesmos cortes já usados no agregado do banco (20260723_psychosocial_rh_report.sql):
// score < 50 = bem-estar reduzido, score <= 28 = faixa de maior atenção.
// Aqui olhamos a PROPORÇÃO de respondentes em cada faixa, não a contagem
// bruta — setor com 3 de 4 pessoas na faixa de risco pesa diferente de um
// setor com 3 de 40.
const PROPORCAO_RISCO_ALTA = 0.2;
const PROPORCAO_REDUZIDO_ALTA = 0.4;

export function obterInsightWho5(setor: PsychosocialSetor): Who5Insight {
  const n = setor.n_respondentes || 0;
  const propReduzido = n > 0 ? setor.faixa_reduzido / n : 0;
  const propRisco = n > 0 ? setor.faixa_risco / n : 0;
  const bemEstarReduzido = setor.score_medio < 50;

  const fatores: string[] = [];
  if (propRisco >= PROPORCAO_RISCO_ALTA) {
    fatores.push('Parte relevante da equipe na faixa de bem-estar de maior atenção');
  } else if (setor.faixa_risco > 0) {
    fatores.push('Há resultado individual na faixa de bem-estar de maior atenção');
  }
  if (bemEstarReduzido || propReduzido >= PROPORCAO_REDUZIDO_ALTA) {
    fatores.push('Bem-estar médio do setor abaixo do esperado');
  }

  let prioridade: Who5Prioridade = 'acompanhamento';
  if (propRisco >= PROPORCAO_RISCO_ALTA) prioridade = 'critica';
  else if (setor.faixa_risco > 0 || (bemEstarReduzido && propReduzido >= PROPORCAO_REDUZIDO_ALTA)) prioridade = 'alta';
  else if (bemEstarReduzido) prioridade = 'moderada';

  const encaminhamentos: string[] = [];
  if (propRisco >= PROPORCAO_RISCO_ALTA || setor.faixa_risco > 0) {
    encaminhamentos.push('Abrir espaço de escuta individual e lembrar o time do plano psicológico adicional disponível.');
  }
  if (bemEstarReduzido || propReduzido >= PROPORCAO_REDUZIDO_ALTA) {
    encaminhamentos.push('Conversar com a liderança sobre carga, clima e reconhecimento antes que o resultado se repita no próximo ciclo.');
  }
  if (fatores.length === 0) {
    encaminhamentos.push('Seguir acompanhando o bem-estar no próximo ciclo do WHO-5.');
  }

  return { prioridade, bemEstarReduzido, fatores, encaminhamentos };
}
