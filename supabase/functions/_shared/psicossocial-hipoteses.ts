// =====================================================
// Malama — Motor de hipóteses psicossociais
//
// Transforma o que os agregados JÁ mostram em hipóteses explícitas, com o
// motivo de terem sido levantadas, as perguntas que validam cada uma e os
// caminhos possíveis na fonte/organização do trabalho.
//
// A REGRA QUE GOVERNA ESTE ARQUIVO
// Hipótese não é causa. O texto descreve compatibilidade ("o padrão
// observado é compatível com situações de sobrecarga") e nunca atribuição
// ("a causa é falta de gente"). Toda hipótese carrega perguntas de
// validação porque quem decide se ela procede é a empresa conversando com
// as equipes — não o Malama, e muito menos um modelo de linguagem.
//
// De onde saem as hipóteses, e só daqui:
//   1. tendência entre duas coletas comparáveis (já calculada pelo briefing);
//   2. setor classificado como risco ocupacional pela matriz (já calculado
//      no banco, com mediana da própria empresa e piso de anonimato).
// Não há terceira fonte nesta etapa. Em especial, não há limiar absoluto
// inventado aqui: os cortes que existem são os do instrumento e os da
// matriz, que já passaram por revisão.
// =====================================================

import {
  CONFIG_APRENDIZADO, INDICADORES, LOGICA_VERSAO,
  forcaDaEvidencia, numeroOuNull,
  type ForcaEvidencia, type IndicadorId, type NivelControle,
  type OrigemRecomendacao, type PlanoFator,
} from './psicossocial-logica.ts';

export type CaminhoPossivel = {
  medida: string;
  nivel_controle: NivelControle;
};

export type EvidenciaAgregada = {
  descricao: string;
  valor: number | null;
  n: number | null;
  periodo: string | null;
};

export type Hipotese = {
  /** Preenchido depois que o banco grava; usado no deep link da medida. */
  id?: string;
  setor: string | null;
  campanha_baseline_id: string;
  instrumento: 'who5' | 'jss';
  indicador: IndicadorId;
  fator: PlanoFator;
  descricao: string;
  por_que_foi_sugerida: string;
  evidencias: EvidenciaAgregada[];
  perguntas_validacao: string[];
  caminhos_possiveis: CaminhoPossivel[];
  forca_evidencia: ForcaEvidencia;
  origem: OrigemRecomendacao;
  logica_versao: string;
  metricas_baseline: { valor: number | null; n: number | null; periodo_fim: string | null };
};

// =====================================================
// Catálogo por indicador
//
// Redação em vocabulário de tela (carga, cobrança, autonomia, apoio), não
// nos termos técnicos da escala. Os caminhos seguem a hierarquia de
// controle da NR-1: fonte e organização antes de cuidado individual.
// =====================================================

type EntradaCatalogo = {
  /** O que o padrão é compatível com — nunca o que ele prova. */
  padraoCompativelCom: string;
  perguntas: string[];
  caminhos: CaminhoPossivel[];
};

const CATALOGO: Record<IndicadorId, EntradaCatalogo> = {
  jss_demanda: {
    padraoCompativelCom:
      'situações de sobrecarga: volume, ritmo e prazos acima do que a equipe consegue absorver no tempo disponível',
    perguntas: [
      'Quais entregas competem entre si numa semana comum?',
      'Onde aparecem as urgências que desorganizam o planejado?',
      'O dimensionamento e a cobertura de turnos acompanham o volume atual?',
      'O que poderia ser interrompido, redistribuído ou simplificado sem perda de resultado?',
    ],
    caminhos: [
      { medida: 'Revisar volume, prioridades e prazos com a equipe, definindo o que pode esperar.', nivel_controle: 'fonte' },
      { medida: 'Revisar dimensionamento e cobertura de turnos nos períodos de pico.', nivel_controle: 'fonte' },
      { medida: 'Reduzir interrupções e retrabalho mapeando as fontes recorrentes com quem executa.', nivel_controle: 'organizacional' },
    ],
  },
  jss_controle: {
    padraoCompativelCom:
      'baixa margem de decisão sobre o próprio trabalho: pouca escolha sobre como e em que ordem executar',
    perguntas: [
      'Quais decisões do dia a dia poderiam ser tomadas por quem executa?',
      'Existem regras ou orientações conflitantes vindas de fontes diferentes?',
      'A equipe é ouvida antes de mudanças de rotina, meta ou escala?',
      'Está claro quem decide, quem executa e qual é o critério de conclusão?',
    ],
    caminhos: [
      { medida: 'Definir o resultado esperado e deixar a equipe escolher o modo de execução.', nivel_controle: 'organizacional' },
      { medida: 'Registrar quem decide e quem executa nas tarefas principais, eliminando ordens conflitantes.', nivel_controle: 'fonte' },
      { medida: 'Ouvir impactos e sugestões da equipe antes de alterar rotina, meta ou escala.', nivel_controle: 'organizacional' },
    ],
  },
  jss_apoio: {
    padraoCompativelCom:
      'apoio insuficiente no fluxo de trabalho: dificuldade de obter ajuda, escalonamento lento ou bloqueios sem responsável',
    perguntas: [
      'Em que momentos a equipe precisa de ajuda e quanto tempo leva para obtê-la?',
      'Quais bloqueios ficam sem responsável definido?',
      'A passagem de turno transfere o que a próxima equipe precisa saber?',
      'A liderança tem disponibilidade previsível para remover impedimentos?',
    ],
    caminhos: [
      { medida: 'Definir rotina de alinhamento e canal de escalonamento com responsável e prazo de resposta.', nivel_controle: 'organizacional' },
      { medida: 'Estruturar a passagem de turno com o que precisa ser transferido.', nivel_controle: 'organizacional' },
      { medida: 'Construir com a equipe acordos de convivência e revisá-los periodicamente.', nivel_controle: 'organizacional' },
    ],
  },
  who5_score: {
    padraoCompativelCom:
      'desgaste acumulado no grupo — é um indicador de bem-estar, não um diagnóstico clínico e não um fator do trabalho por si só',
    perguntas: [
      'O que mudou no período para este grupo (volume, escala, liderança, quadro)?',
      'A equipe sabe a quem recorrer quando precisa de apoio?',
      'Há expectativas ou metas que já não são realistas para o momento atual?',
    ],
    caminhos: [
      { medida: 'Verificar carga, escala e expectativas do período antes de tratar o sinal como questão individual.', nivel_controle: 'fonte' },
      { medida: 'Alinhar com a equipe expectativas realistas para as próximas semanas.', nivel_controle: 'organizacional' },
      { medida: 'Reforçar a comunicação sobre os canais de apoio já disponíveis na empresa.', nivel_controle: 'individual' },
    ],
  },
};

// =====================================================
// Recorrência entre ciclos
// =====================================================

export type RecorrenciaItem = {
  setor: string | null;
  indicador: string;
  /** Campanhas em que este mesmo sinal já foi registrado. */
  campanhas: string[];
};

/**
 * Em quantos ciclos DISTINTOS este sinal já apareceu neste recorte,
 * contando o ciclo atual. É o insumo de `forcaDaEvidencia` — e é a primeira
 * coisa que a memória do ciclo passa a permitir: sem histórico gravado,
 * todo sinal seria eternamente "inicial".
 */
export function ciclosComSinal(
  recorrencia: RecorrenciaItem[],
  setor: string | null,
  indicador: IndicadorId,
  campanhaAtual: string,
): number {
  const item = recorrencia.find(r =>
    (r.setor ?? null) === (setor ?? null) && r.indicador === indicador);
  const campanhas = new Set(item?.campanhas ?? []);
  campanhas.add(campanhaAtual);
  return campanhas.size;
}

// =====================================================
// Motor
// =====================================================

type Tendencia = {
  id: string;
  label: string;
  atual: number;
  anterior: number;
  delta: number;
  direcao: 'melhorou' | 'piorou' | 'estavel';
  n_atual: number;
  n_anterior: number;
  periodo_atual?: { inicio?: string; fim?: string } | null;
};

export type ContextoHipoteses = {
  /** Tendências já calculadas pelo briefing (fonte 1). */
  tendencias: Tendencia[];
  /** Relatórios agregados do ciclo atual, como o rh-agent já os monta. */
  leitura: any;
  /** Campanha encerrada mais recente por instrumento. */
  campanhaPorInstrumento: { who5?: string | null; jss?: string | null };
  recorrencia: RecorrenciaItem[];
};

function evidenciaDaTendencia(t: Tendencia): EvidenciaAgregada[] {
  return [
    { descricao: 'Coleta atual', valor: t.atual, n: t.n_atual, periodo: t.periodo_atual?.fim ?? null },
    { descricao: 'Coleta anterior', valor: t.anterior, n: t.n_anterior, periodo: null },
  ];
}

/**
 * Fonte 1 — indicador que piorou entre as duas últimas coletas comparáveis.
 * A tendência já vem calculada e já respeita o limiar de relevância; aqui
 * ela só vira hipótese com pergunta e caminho.
 */
function hipotesesDeTendencia(ctx: ContextoHipoteses): Hipotese[] {
  const hipoteses: Hipotese[] = [];
  for (const tendencia of ctx.tendencias) {
    if (tendencia.direcao !== 'piorou') continue;
    const indicador = tendencia.id as IndicadorId;
    const def = INDICADORES[indicador];
    if (!def) continue;
    const campanha = ctx.campanhaPorInstrumento[def.instrumento];
    if (!campanha) continue;

    const catalogo = CATALOGO[indicador];
    const dadoConfiavel = tendencia.n_atual >= CONFIG_APRENDIZADO.MIN_RESPONDENTES
      && tendencia.n_anterior >= CONFIG_APRENDIZADO.MIN_RESPONDENTES;
    const variacao = Math.abs(tendencia.delta);

    hipoteses.push({
      setor: null,
      campanha_baseline_id: campanha,
      instrumento: def.instrumento,
      indicador,
      fator: def.fator,
      descricao:
        `O padrão observado em ${def.label.toLowerCase()} na empresa é compatível com ${catalogo.padraoCompativelCom}. `
        + 'Vale investigar com as equipes antes de definir a medida.',
      por_que_foi_sugerida:
        `O indicador agregado variou ${variacao} pontos entre as duas últimas coletas comparáveis `
        + `(${tendencia.anterior} → ${tendencia.atual}), no sentido desfavorável para este indicador. `
        + 'A variação é um sinal para investigação coletiva, não uma relação de causa.',
      evidencias: evidenciaDaTendencia(tendencia),
      perguntas_validacao: catalogo.perguntas,
      caminhos_possiveis: catalogo.caminhos,
      forca_evidencia: forcaDaEvidencia(
        ciclosComSinal(ctx.recorrencia, null, indicador, campanha), dadoConfiavel),
      origem: 'tendencia_interna',
      logica_versao: LOGICA_VERSAO,
      metricas_baseline: {
        valor: tendencia.atual, n: tendencia.n_atual,
        periodo_fim: tendencia.periodo_atual?.fim ?? null,
      },
    });
  }
  return hipoteses;
}

/**
 * Fonte 2 — setor classificado como risco ocupacional pela matriz.
 *
 * O indicador escolhido é o componente da JSS com o MAIOR afastamento
 * desfavorável em relação ao agregado da própria empresa. É uma regra
 * determinística e auditável: não inventa limiar novo, usa a média da
 * empresa que a matriz já calcula, e a mesma entrada sempre produz a mesma
 * hipótese. Setor sem componente pior que o agregado não gera hipótese.
 */
function hipotesesDaMatriz(ctx: ContextoHipoteses): Hipotese[] {
  const matriz = ctx.leitura?.ultimos_relatorios?.matriz;
  const jssGeral = ctx.leitura?.ultimos_relatorios?.jss?.geral;
  const campanha = ctx.campanhaPorInstrumento.jss;
  if (!matriz || !campanha || !jssGeral || jssGeral.dados_suprimidos) return [];

  const referencia: Partial<Record<IndicadorId, number>> = {
    jss_demanda: numeroOuNull(jssGeral.demanda_medio) ?? undefined,
    jss_controle: numeroOuNull(jssGeral.controle_medio) ?? undefined,
    jss_apoio: numeroOuNull(jssGeral.apoio_medio) ?? undefined,
  };
  const setoresJss: any[] = Array.isArray(ctx.leitura?.ultimos_relatorios?.jss?.setores)
    ? ctx.leitura.ultimos_relatorios.jss.setores : [];

  const hipoteses: Hipotese[] = [];
  for (const setor of Array.isArray(matriz.setores) ? matriz.setores : []) {
    if (setor?.quadrante !== 'risco_ocupacional') continue;
    const exposicao = setor?.exposicao;
    if (!exposicao) continue;

    // Afastamento desfavorável de cada componente em relação à empresa.
    const candidatos: { indicador: IndicadorId; valor: number; gap: number }[] = [];
    const avaliar = (indicador: IndicadorId, valor: unknown) => {
      const v = numeroOuNull(valor);
      const ref = referencia[indicador];
      if (v === null || ref === undefined) return;
      const gap = INDICADORES[indicador].favoravelQuando === 'cai' ? v - ref : ref - v;
      if (gap > 0) candidatos.push({ indicador, valor: v, gap });
    };
    avaliar('jss_demanda', exposicao.demanda);
    avaliar('jss_controle', exposicao.controle);
    avaliar('jss_apoio', exposicao.apoio);
    if (candidatos.length === 0) continue;

    candidatos.sort((a, b) => b.gap - a.gap || a.indicador.localeCompare(b.indicador));
    const escolhido = candidatos[0];
    const def = INDICADORES[escolhido.indicador];
    const catalogo = CATALOGO[escolhido.indicador];
    const nSetor = numeroOuNull(
      setoresJss.find((s: any) => s?.setor === setor.setor)?.n_respondentes);
    const dadoConfiavel = nSetor !== null && nSetor >= CONFIG_APRENDIZADO.MIN_RESPONDENTES;

    hipoteses.push({
      setor: setor.setor,
      campanha_baseline_id: campanha,
      instrumento: 'jss',
      indicador: escolhido.indicador,
      fator: def.fator,
      descricao:
        `Em ${setor.setor}, o padrão observado é compatível com ${catalogo.padraoCompativelCom}. `
        + 'A classificação da matriz é relativa à própria empresa e serve para priorizar onde investigar primeiro.',
      por_que_foi_sugerida:
        `O setor aparece no quadrante de risco ocupacional da matriz (mais exposição e menos bem-estar que a mediana da empresa), `
        + `e ${def.label.toLowerCase()} é o componente com maior afastamento desfavorável em relação ao agregado da empresa `
        + `(${escolhido.valor} no setor contra ${referencia[escolhido.indicador]} na empresa).`,
      evidencias: [
        { descricao: `${def.label} no setor`, valor: escolhido.valor, n: nSetor, periodo: matriz?.periodo?.fim ?? null },
        { descricao: `${def.label} na empresa`, valor: referencia[escolhido.indicador] ?? null, n: numeroOuNull(jssGeral.n_respondentes), periodo: matriz?.periodo?.fim ?? null },
      ],
      perguntas_validacao: catalogo.perguntas,
      caminhos_possiveis: catalogo.caminhos,
      forca_evidencia: forcaDaEvidencia(
        ciclosComSinal(ctx.recorrencia, setor.setor, escolhido.indicador, campanha), dadoConfiavel),
      origem: 'regra_deterministica',
      logica_versao: LOGICA_VERSAO,
      metricas_baseline: {
        valor: escolhido.valor, n: nSetor, periodo_fim: matriz?.periodo?.fim ?? null,
      },
    });
  }
  return hipoteses;
}

/**
 * Hipóteses do ciclo atual. Determinístico: mesma entrada, mesma saída,
 * sem chamada de rede e sem modelo de linguagem.
 *
 * Sem dado suficiente devolve lista vazia — dizer "não há base para
 * hipótese" é uma resposta válida e melhor que preencher a tela.
 */
export function gerarHipoteses(ctx: ContextoHipoteses): Hipotese[] {
  const todas = [...hipotesesDeTendencia(ctx), ...hipotesesDaMatriz(ctx)];

  // Uma hipótese por (setor, indicador): tendência geral e matriz podem
  // apontar o mesmo indicador, e duas linhas iguais na tela só confundem.
  const porChave = new Map<string, Hipotese>();
  for (const h of todas) {
    const chave = `${h.setor ?? ''}|${h.indicador}`;
    const anterior = porChave.get(chave);
    if (!anterior) { porChave.set(chave, h); continue; }
    // Mantém a de evidência mais forte; empate fica com a primeira.
    const ordem: ForcaEvidencia[] = [
      'evidencia_insuficiente', 'sinal_inicial', 'padrao_recorrente', 'padrao_consistente',
    ];
    if (ordem.indexOf(h.forca_evidencia) > ordem.indexOf(anterior.forca_evidencia)) {
      porChave.set(chave, h);
    }
  }
  return [...porChave.values()];
}
