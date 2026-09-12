// =====================================================
// Malama — Fechamento de ciclo (determinístico)
//
// Toda campanha encerrada ganha um recap de três blocos, sempre na mesma
// ordem, porque é a ordem em que o RH deve ler:
//
//   1. O que mudou — indicadores e setores contra o ciclo anterior do MESMO
//      instrumento, com a comparabilidade sazonal nomeada ANTES da seta.
//   2. O que foi feito no meio — medidas concluídas/abertas entre os dois
//      ciclos e o resultado observado das que tinham linha de base.
//   3. Próximo passo — é a jornada quem diz; aqui só fica o resumo.
//
// Calculado UMA vez na Edge Function a partir das mesmas leituras agregadas
// do briefing (k-anônimo já aplicado). Tela, PDF e copiloto leem este mesmo
// objeto — nenhum deles recalcula nada.
//
// Sem nota, sem pontuação, sem ranking de setor: é uma fase concluída, não
// um placar (ver memória jornada-rh-fonte-unica).
// =====================================================

import type { ComparabilidadeSazonal, ContextoTemporal } from './contexto-temporal.ts';
import { NOME_MES } from './contexto-temporal.ts';
import { CONFIG_APRENDIZADO, INDICADORES, type IndicadorId } from './psicossocial-logica.ts';

/** Depois disso o ciclo é história, não fechamento: o recap some da tela. */
export const JANELA_RECAP_DIAS = 120;
/** Até aqui a jornada cobra a leitura; depois vira só um card no histórico. */
export const JANELA_PENDENTE_DIAS = 45;

export type Direcao = 'melhorou' | 'piorou' | 'estavel' | 'sem_par';

export type CampanhaDoFechamento = {
  id: string;
  instrumento: 'who5' | 'jss';
  instrumento_nome: string;
  janela_inicio: string | null;
  janela_fim: string | null;
  encerrada_em: string | null;
  n_convidados: number;
  n_respondentes: number;
  leitura_registrada_em: string | null;
};

export type FechamentoCiclo = {
  campanha: CampanhaDoFechamento;
  anterior: Omit<CampanhaDoFechamento, 'leitura_registrada_em'> | null;
  dias_desde_encerramento: number;
  /** Dentro da janela de leitura e ainda sem "Entendi, fechar ciclo". */
  pendente: boolean;
  comparabilidade: ComparabilidadeSazonal;
  comparabilidade_texto: string;
  indicadores: {
    id: IndicadorId; label: string;
    atual: number | null; anterior: number | null; delta: number | null;
    direcao: Direcao; favoravel_quando: 'sobe' | 'cai';
    n_atual: number; n_anterior: number;
  }[];
  /** Um número por setor: bem-estar (WHO-5) ou índice de exposição (JSS). */
  setores: {
    setor: string; atual: number | null; anterior: number | null;
    delta: number | null; direcao: Direcao; suprimido: boolean;
  }[];
  setores_suprimidos: number;
  medidas_no_intervalo: {
    id: string; setor: string | null; medida: string; nivel_controle: string;
    status: string; concluida_em: string | null;
  }[];
  resultados: {
    plano_acao_id: string; setor: string | null; indicador: string; medida?: string;
    execucao?: string; classificacao: string; comparabilidade: string; narrativa: string;
  }[];
  proximo_pico: string | null;
  resumo: string;
};

const LIMIAR = CONFIG_APRENDIZADO.LIMIAR_VARIACAO_RELEVANTE;

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const arred = (v: number) => Math.round(v * 10) / 10;

function direcao(atual: number | null, anterior: number | null, favoravel: 'sobe' | 'cai'): Direcao {
  if (atual === null || anterior === null) return 'sem_par';
  const delta = atual - anterior;
  if (Math.abs(delta) < LIMIAR) return 'estavel';
  return (favoravel === 'sobe' ? delta > 0 : delta < 0) ? 'melhorou' : 'piorou';
}

const dataPt = (iso: unknown): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : 'data não informada';
};

const mesAno = (iso: unknown): string => {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso ?? ''));
  return m ? `${NOME_MES[Number(m[2]) - 1]} de ${m[1]}` : 'ciclo anterior';
};

export const COMPARABILIDADE_TEXTO: Record<ComparabilidadeSazonal, string> = {
  mesma_epoca: 'mesma época do ano — comparação direta',
  estacoes_diferentes: 'estações diferentes — parte da variação pode ser sazonal',
  pico_vs_fora_de_pico: 'um ciclo em pico do setor e outro fora — comparar com cautela',
  indeterminada: 'época não determinada — sem ressalva sazonal',
};

function campanhaSegura(c: any, instrumento: 'who5' | 'jss', nome: string): CampanhaDoFechamento | null {
  if (!c?.id) return null;
  return {
    id: String(c.id),
    instrumento,
    instrumento_nome: nome,
    janela_inicio: c.janela_inicio ?? null,
    janela_fim: c.janela_fim ?? null,
    encerrada_em: c.encerrada_em ?? null,
    n_convidados: num(c.n_convidados) ?? 0,
    n_respondentes: num(c.n_respondentes) ?? 0,
    leitura_registrada_em: c.leitura_registrada_em ?? null,
  };
}

/**
 * Escolhe a campanha encerrada mais recente (qualquer instrumento) e monta o
 * recap. Devolve null quando não há ciclo encerrado dentro da janela.
 */
export function calcularFechamentoCiclo(entrada: {
  leitura: any;
  comparabilidade: Partial<Record<IndicadorId, ComparabilidadeSazonal>>;
  temporal: ContextoTemporal | null;
  reavaliacoes: FechamentoCiclo['resultados'];
  hoje?: Date;
}): FechamentoCiclo | null {
  const { leitura, temporal } = entrada;
  const hoje = entrada.hoje ?? new Date();
  const enc = leitura?.campanhas_encerradas ?? {};
  const candidatas = [
    campanhaSegura(enc.who5, 'who5', 'Bem-estar (WHO-5)'),
    campanhaSegura(enc.jss, 'jss', 'Carga de trabalho (JSS)'),
  ].filter((c): c is CampanhaDoFechamento => c !== null);
  if (candidatas.length === 0) return null;

  const marco = (c: CampanhaDoFechamento) => Date.parse(String(c.encerrada_em ?? `${c.janela_fim}T12:00:00Z`));
  candidatas.sort((a, b) => marco(b) - marco(a));
  const campanha = candidatas[0];
  const quando = marco(campanha);
  if (!Number.isFinite(quando)) return null;
  const dias = Math.max(0, Math.floor((hoje.getTime() - quando) / 86_400_000));
  if (dias > JANELA_RECAP_DIAS) return null;

  const instr = campanha.instrumento;
  const anteriorBruta = enc[`${instr}_anterior`];
  const anterior = campanhaSegura(anteriorBruta, instr, campanha.instrumento_nome);
  const relAtual = leitura?.ultimos_relatorios?.[instr];
  const relAnterior = leitura?.relatorios_anteriores?.[instr];

  // Indicadores do instrumento, com o mesmo limiar do briefing.
  const ids: IndicadorId[] = instr === 'who5' ? ['who5_score'] : ['jss_demanda', 'jss_controle', 'jss_apoio'];
  const campo: Record<IndicadorId, string> = {
    who5_score: 'score_medio', jss_demanda: 'demanda_medio', jss_controle: 'controle_medio', jss_apoio: 'apoio_medio',
  };
  const indicadores = ids.map(id => {
    const def = INDICADORES[id];
    const atual = num(relAtual?.geral?.[campo[id]]);
    const ant = num(relAnterior?.geral?.[campo[id]]);
    return {
      id, label: def.label, atual, anterior: ant,
      delta: atual !== null && ant !== null ? arred(atual - ant) : null,
      direcao: direcao(atual, ant, def.favoravelQuando),
      favoravel_quando: def.favoravelQuando,
      n_atual: num(relAtual?.geral?.n_respondentes) ?? 0,
      n_anterior: num(relAnterior?.geral?.n_respondentes) ?? 0,
    };
  });

  // Um número por setor. WHO-5: bem-estar (sobe = melhor). JSS: índice de
  // exposição (cai = melhor). Setor sem par no anterior fica 'sem_par'.
  const campoSetor = instr === 'who5' ? 'score_medio' : 'indice';
  const favSetor: 'sobe' | 'cai' = instr === 'who5' ? 'sobe' : 'cai';
  const anteriorPorSetor = new Map<string, number | null>(
    (Array.isArray(relAnterior?.setores) ? relAnterior.setores : [])
      .map((s: any) => [String(s?.setor ?? ''), num(s?.[campoSetor])]));
  const setores = (Array.isArray(relAtual?.setores) ? relAtual.setores : [])
    .slice(0, 30)
    .map((s: any) => {
      const setor = String(s?.setor ?? '');
      const atual = num(s?.[campoSetor]);
      const ant = anteriorPorSetor.get(setor) ?? null;
      return {
        setor, atual, anterior: ant,
        delta: atual !== null && ant !== null ? arred(atual - ant) : null,
        direcao: direcao(atual, ant, favSetor),
        suprimido: atual === null,
      };
    })
    .filter((s: { setor: string }) => s.setor);

  // O que foi feito no meio: concluídas no intervalo ou abertas com linha
  // de base no ciclo anterior. Sem anterior, tudo que nasceu até o fim
  // desta janela — o RH vê o que já estava em curso na primeira medição.
  const todas: any[] = Array.isArray(leitura?.plano_de_acao?.medidas_do_ciclo)
    ? leitura.plano_de_acao.medidas_do_ciclo : [];
  const fimAnterior = anterior?.janela_fim ?? null;
  const fimAtual = campanha.janela_fim ?? null;
  const dentro = (d: string | null) => {
    if (!d) return false;
    if (fimAtual && d > fimAtual) return false;
    if (fimAnterior && d <= fimAnterior) return false;
    return true;
  };
  const medidas = todas
    .filter(m => m?.status !== 'cancelada')
    .filter(m =>
      (anterior && m?.campanha_baseline_id === anterior.id)
      || dentro(m?.concluida_em ?? null)
      || dentro(m?.created_at ?? null))
    .slice(0, 30)
    .map(m => ({
      id: String(m.id), setor: m.setor ?? null, medida: String(m.medida ?? ''),
      nivel_controle: String(m.nivel_controle ?? ''), status: String(m.status ?? ''),
      concluida_em: m.concluida_em ?? null,
    }));

  const resultados = entrada.reavaliacoes.filter(r =>
    (r as any).campanha_followup_id ? (r as any).campanha_followup_id === campanha.id : true);

  const comparabilidade = anterior
    ? (ids.map(id => entrada.comparabilidade[id]).find(Boolean) ?? 'indeterminada')
    : 'indeterminada';

  const proximoPico = temporal?.proximo_pico
    ? `${NOME_MES[temporal.proximo_pico.mes - 1]}${temporal.proximo_pico.setores.length > 0 ? ` (${temporal.proximo_pico.setores.slice(0, 3).join(', ')})` : ''}`
    : null;

  const concluidas = medidas.filter(m => m.status === 'concluida').length;
  const abertas = medidas.length - concluidas;
  const contagem = (dir: Direcao) => indicadores.filter(i => i.direcao === dir).length;
  const partes: string[] = [
    `${campanha.instrumento_nome} encerrado em ${dataPt(campanha.encerrada_em ?? campanha.janela_fim)} com ${campanha.n_respondentes} de ${campanha.n_convidados} respostas.`,
  ];
  if (!anterior) {
    partes.push('É o primeiro ciclo deste instrumento: ainda não há par para comparar, e ele vira a linha de base do próximo.');
  } else if (indicadores.every(i => i.direcao === 'sem_par')) {
    partes.push(`Contra ${mesAno(anterior.janela_fim)} não dá para comparar: um dos ciclos ficou abaixo do piso de anonimato.`);
  } else {
    const m = contagem('melhorou'), p = contagem('piorou'), e = contagem('estavel');
    const pedacos = [
      m > 0 ? `${m} melhorou` : null, p > 0 ? `${p} piorou` : null, e > 0 ? `${e} sem variação relevante` : null,
    ].filter(Boolean).join(', ');
    partes.push(`Contra ${mesAno(anterior.janela_fim)}: ${pedacos} (${COMPARABILIDADE_TEXTO[comparabilidade]}).`);
  }
  if (medidas.length > 0) {
    partes.push(`No intervalo, ${concluidas} medida(s) concluída(s)${abertas > 0 ? ` e ${abertas} ainda aberta(s)` : ''}.`);
  } else {
    partes.push('Nenhuma medida registrada no intervalo.');
  }

  return {
    campanha,
    anterior: anterior ? (({ leitura_registrada_em: _l, ...resto }) => resto)(anterior) : null,
    dias_desde_encerramento: dias,
    pendente: !campanha.leitura_registrada_em && dias <= JANELA_PENDENTE_DIAS,
    comparabilidade,
    comparabilidade_texto: COMPARABILIDADE_TEXTO[comparabilidade],
    indicadores,
    setores,
    setores_suprimidos: num(relAtual?.setores_suprimidos) ?? 0,
    medidas_no_intervalo: medidas,
    resultados,
    proximo_pico: proximoPico,
    resumo: partes.join(' '),
  };
}
