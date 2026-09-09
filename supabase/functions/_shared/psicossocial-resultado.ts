// =====================================================
// Malama — Motor de resultado observado
//
// Compara a linha de base congelada na medida com o ciclo de reavaliação e
// classifica o MOVIMENTO DO INDICADOR. Aritmética pura: nenhuma chamada de
// rede, nenhum modelo de linguagem, nenhuma leitura de resposta individual.
//
// O QUE ESTE MOTOR AFIRMA E O QUE ELE NÃO AFIRMA
// Afirma: "entre a coleta A e a coleta B, este indicador agregado foi de X
// para Y, e as duas coletas são (ou não são) comparáveis".
// NÃO afirma: que a medida causou o movimento. 'favoravel' descreve o
// sentido do indicador, nunca o efeito da intervenção — por isso a palavra
// "eficácia" não aparece neste arquivo, nem deve aparecer.
//
// MEDIDA NÃO EXECUTADA também é calculada e gravada. É um comparador
// observacional útil, mas NÃO é grupo de controle: a empresa pode não ter
// executado por uma razão que também mexe no indicador (crise, troca de
// liderança, pico de demanda). A narrativa deixa isso explícito.
// =====================================================

import {
  CONFIG_APRENDIZADO, INDICADORES, LOGICA_VERSAO,
  arredonda1, diasEntre, numeroOuNull,
  type IndicadorId, type FavoravelQuando,
} from './psicossocial-logica.ts';

/** Por que o par de coletas é (ou não é) comparável. */
export type Comparabilidade =
  | 'comparavel'
  /** Um dos recortes ficou abaixo do piso de anonimato e foi suprimido. */
  | 'dado_suprimido'
  /** Respondentes abaixo do piso em alguma das pontas. */
  | 'amostra_insuficiente'
  /** A amostra mudou tanto que as médias não retratam o mesmo grupo. */
  | 'participacao_divergente'
  /** Coletas próximas demais para serem reavaliação uma da outra. */
  | 'intervalo_insuficiente'
  /** A medida não tem linha de base congelada (vínculo não inequívoco). */
  | 'sem_linha_de_base';

export type Classificacao = 'favoravel' | 'estavel' | 'desfavoravel' | 'inconclusivo';
export type ExecucaoMedida = 'executada' | 'em_andamento' | 'nao_executada' | 'cancelada';

export type PontoDeMedicao = {
  /** Índice agregado 0–100. `null` = recorte suprimido pelo piso de k. */
  valor: number | null;
  /** Respondentes do recorte. */
  n: number | null;
  /** Data de referência da coleta (fim da janela da campanha), ISO. */
  data: string | null;
};

export type EntradaResultado = {
  planoAcaoId: string;
  campanhaFollowupId: string;
  indicador: IndicadorId;
  setor: string | null;
  baseline: PontoDeMedicao;
  followup: PontoDeMedicao;
  execucao: ExecucaoMedida;
};

export type ResultadoObservado = {
  plano_acao_id: string;
  campanha_followup_id: string;
  indicador: IndicadorId;
  instrumento: 'who5' | 'jss';
  valor_baseline: number | null;
  valor_followup: number | null;
  delta: number | null;
  favoravel_quando: FavoravelQuando;
  n_baseline: number | null;
  n_followup: number | null;
  intervalo_dias: number | null;
  execucao: ExecucaoMedida;
  classificacao: Classificacao;
  comparabilidade: Comparabilidade;
  narrativa: string;
  logica_versao: string;
};

const dataPt = (iso: unknown): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : 'data não informada';
};

/**
 * Estado da medida na data do cálculo, derivado do que o RH já registrou
 * no quadro. Nenhum campo novo: `status` e `concluida_em` já existem.
 *
 * "Executada" exige status concluída — o plano de ação já obriga evidência
 * para concluir, então concluída sem evidência não passa pelo banco.
 */
export function execucaoDaMedida(status: string, concluidaEm: string | null): ExecucaoMedida {
  if (status === 'cancelada') return 'cancelada';
  if (status === 'concluida' && concluidaEm) return 'executada';
  if (status === 'em_andamento') return 'em_andamento';
  return 'nao_executada';
}

/** Variação relativa do número de respondentes entre as duas coletas. */
function variacaoParticipacao(nBase: number, nSeguinte: number): number {
  if (nBase <= 0) return Number.POSITIVE_INFINITY;
  return Math.abs(nSeguinte - nBase) / nBase;
}

function comparabilidadeDe(entrada: EntradaResultado, intervalo: number | null): Comparabilidade {
  const vBase = numeroOuNull(entrada.baseline.valor);
  const vSeg = numeroOuNull(entrada.followup.valor);
  const nBase = numeroOuNull(entrada.baseline.n);
  const nSeg = numeroOuNull(entrada.followup.n);

  // Sem linha de base não há o que comparar. É o caso das medidas criadas
  // manualmente fora de um contexto de leitura: por decisão de produto elas
  // ficam sem vínculo, e ficar sem vínculo é melhor que um vínculo errado.
  if (vBase === null && nBase === null) return 'sem_linha_de_base';

  // Recorte suprimido pelo piso de anonimato. Não se reconstrói o número
  // pequeno para "salvar" o caso — o caso se perde, o anonimato não.
  if (vBase === null || vSeg === null) return 'dado_suprimido';
  if (nBase === null || nSeg === null) return 'dado_suprimido';

  if (nBase < CONFIG_APRENDIZADO.MIN_RESPONDENTES || nSeg < CONFIG_APRENDIZADO.MIN_RESPONDENTES) {
    return 'amostra_insuficiente';
  }
  if (intervalo === null || intervalo < CONFIG_APRENDIZADO.MIN_INTERVALO_DIAS) {
    return 'intervalo_insuficiente';
  }
  if (variacaoParticipacao(nBase, nSeg) > CONFIG_APRENDIZADO.MAX_VARIACAO_PARTICIPACAO) {
    return 'participacao_divergente';
  }
  return 'comparavel';
}

const MOTIVO_INCONCLUSIVO: Record<Exclude<Comparabilidade, 'comparavel'>, string> = {
  sem_linha_de_base:
    'Esta medida não está vinculada a uma medição de origem, então não há linha de base para comparar.',
  dado_suprimido:
    'Um dos recortes ficou abaixo do piso de anonimato e não pode ser publicado, então a comparação não é possível.',
  amostra_insuficiente:
    'O número de respondentes em uma das coletas ficou abaixo do piso mínimo para leitura agregada.',
  intervalo_insuficiente:
    'As duas coletas estão próximas demais para que a segunda seja tratada como reavaliação da primeira.',
  participacao_divergente:
    'O número de respondentes mudou demais entre as coletas; as médias não retratam o mesmo grupo.',
};

/**
 * Classificação e narrativa de um par (linha de base, reavaliação).
 *
 * Ordem das checagens importa: comparabilidade primeiro, classificação
 * depois. Um par não comparável é sempre 'inconclusivo', mesmo quando o
 * delta parece ótimo — é justamente onde a leitura enganaria.
 */
export function calcularResultadoObservado(entrada: EntradaResultado): ResultadoObservado {
  const def = INDICADORES[entrada.indicador];
  const intervalo = diasEntre(entrada.baseline.data, entrada.followup.data);
  const comparabilidade = comparabilidadeDe(entrada, intervalo);

  const vBase = numeroOuNull(entrada.baseline.valor);
  const vSeg = numeroOuNull(entrada.followup.valor);
  const delta = vBase !== null && vSeg !== null ? arredonda1(vSeg - vBase) : null;

  const base = {
    plano_acao_id: entrada.planoAcaoId,
    campanha_followup_id: entrada.campanhaFollowupId,
    indicador: entrada.indicador,
    instrumento: def.instrumento,
    valor_baseline: vBase,
    valor_followup: vSeg,
    delta,
    favoravel_quando: def.favoravelQuando,
    n_baseline: numeroOuNull(entrada.baseline.n),
    n_followup: numeroOuNull(entrada.followup.n),
    intervalo_dias: intervalo,
    execucao: entrada.execucao,
    logica_versao: LOGICA_VERSAO,
  };

  const recorte = entrada.setor ? `no setor ${entrada.setor}` : 'na empresa';

  if (comparabilidade !== 'comparavel') {
    return {
      ...base,
      classificacao: 'inconclusivo',
      comparabilidade,
      narrativa:
        `Resultado inconclusivo para ${def.label.toLowerCase()} ${recorte}. `
        + MOTIVO_INCONCLUSIVO[comparabilidade],
    };
  }

  const relevante = Math.abs(delta as number) >= CONFIG_APRENDIZADO.LIMIAR_VARIACAO_RELEVANTE;
  const andouNoSentidoDesejado = def.favoravelQuando === 'sobe'
    ? (delta as number) > 0
    : (delta as number) < 0;
  const classificacao: Classificacao = !relevante
    ? 'estavel'
    : andouNoSentidoDesejado ? 'favoravel' : 'desfavoravel';

  // A abertura da frase muda com a execução, e só com ela. Em nenhuma das
  // versões a medida é apresentada como causa do movimento.
  const abertura = entrada.execucao === 'executada'
    ? 'Após a implantação da medida'
    : entrada.execucao === 'em_andamento'
      ? 'Com a medida ainda em andamento'
      : entrada.execucao === 'cancelada'
        ? 'Com a medida cancelada antes da conclusão'
        : 'Sem registro de execução da medida até a reavaliação';

  const movimento = classificacao === 'estavel'
    ? `manteve-se em torno de ${vSeg} (era ${vBase})`
    : `passou de ${vBase} para ${vSeg}`;

  const ressalva = entrada.execucao === 'executada'
    ? 'A comparação é descritiva: mostra o que foi observado no período, não que a medida tenha produzido o resultado.'
    : 'Este registro é uma observação descritiva do período. A ausência de execução pode ter as mesmas causas que afetaram o indicador, então não funciona como comparação controlada.';

  return {
    ...base,
    classificacao,
    comparabilidade,
    narrativa:
      `${abertura}, o indicador agregado de ${def.label.toLowerCase()} ${recorte} ${movimento} `
      + `entre as coletas de ${dataPt(entrada.baseline.data)} e ${dataPt(entrada.followup.data)} `
      + `(${base.n_baseline} e ${base.n_followup} respondentes). ${ressalva}`,
  };
}

export const RESULTADO_LABEL: Record<Classificacao, string> = {
  favoravel: 'Indicador andou no sentido desejado',
  estavel: 'Indicador estável',
  desfavoravel: 'Indicador andou no sentido oposto',
  inconclusivo: 'Sem comparação possível',
};
