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
import {
  descreverOrganizacaoSetor, type OrganizacaoEmpresa, type OrganizacaoSetor,
} from './organizacao-trabalho.ts';
import {
  NOME_ESTACAO, NOME_MES, type ComparabilidadeSazonal, type ContextoTemporal,
} from './contexto-temporal.ts';

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
  /** Organização declarada do setor, em uma linha, para o modelo citar. */
  contexto_setor?: string | null;
  /** Confundidores a nomear ANTES de interpretar: sazonalidade, calor,
   *  evento da empresa no período. Enriquecem a hipótese; não a criam. */
  ressalvas?: string[];
  /** Outros dados da própria empresa (afastamentos por capítulo F,
   *  ambulatório por ansiedade/estresse) apontando na mesma direção que a
   *  pesquisa. Fortalecem a prioridade de investigar; não provam causa. */
  convergencias?: string[];
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

/**
 * Absenteísmo e ambulatório dos últimos 90 dias, por setor, já com o piso
 * de anonimato aplicado pelo banco. `null` = módulo ausente ou sem leitura;
 * lista vazia = módulo em uso, nenhum setor acima do piso.
 */
export type SinaisDerivados = {
  periodo: { inicio: string; fim: string } | null;
  absenteismo: {
    setor: string; episodios: number; dias: number;
    episodios_f: number; dias_f: number; dias_por_colaborador: number | null;
  }[] | null;
  ambulatorio: {
    setor: string; atendimentos: number; ansiedade: number; por_colaborador: number | null;
  }[] | null;
};

export type ContextoOrganizacao = {
  /** Organização declarada por setor, indexada pelo nome do setor. */
  setores: Record<string, OrganizacaoSetor>;
  empresa: OrganizacaoEmpresa | null;
  temporal: ContextoTemporal | null;
  /** Comparabilidade sazonal das tendências, por indicador. */
  comparabilidade: Partial<Record<IndicadorId, ComparabilidadeSazonal>>;
  sinais?: SinaisDerivados;
};

export type ContextoHipoteses = {
  /** Tendências já calculadas pelo briefing (fonte 1). */
  tendencias: Tendencia[];
  /** Relatórios agregados do ciclo atual, como o rh-agent já os monta. */
  leitura: any;
  /** Campanha encerrada mais recente por instrumento. */
  campanhaPorInstrumento: { who5?: string | null; jss?: string | null };
  recorrencia: RecorrenciaItem[];
  /** Contexto declaratório e temporal. Opcional: sem ele, as hipóteses
   *  saem exatamente como antes. NUNCA gera hipótese nova — só enriquece. */
  organizacao?: ContextoOrganizacao;
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

// =====================================================
// Enriquecimento por organização do trabalho e tempo
//
// Terceira coisa que este arquivo NÃO faz: criar hipótese a partir de
// contexto. Contato com público, calor ou escala imprevisível não são
// sinais — são o que torna um sinal que JÁ apareceu (tendência ou matriz)
// legível. Aqui só se acrescenta: ressalvas a nomear antes de interpretar,
// perguntas que o contexto torna pertinentes e caminhos na mesma
// hierarquia de controle. Tudo determinístico e auditável.
// =====================================================

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function juntarUnico<T>(base: T[], extras: T[], chave: (t: T) => string): T[] {
  const vistos = new Set(base.map(chave));
  const saida = [...base];
  for (const e of extras) {
    const k = chave(e);
    if (!vistos.has(k)) { vistos.add(k); saida.push(e); }
  }
  return saida;
}

function enriquecerComContexto(h: Hipotese, org: ContextoOrganizacao): Hipotese {
  const setor = h.setor ? org.setores[h.setor] ?? null : null;
  const temporal = org.temporal;
  const campanha = temporal?.campanhas.find(c => c.id === h.campanha_baseline_id) ?? null;
  const ressalvas: string[] = [];
  const perguntas: string[] = [];
  const caminhos: CaminhoPossivel[] = [];

  // ── Tempo ──────────────────────────────────────────────────────────
  if (campanha) {
    const setoresEmPico = h.setor
      ? campanha.setores_em_pico_declarado.filter(s => s === h.setor)
      : campanha.setores_em_pico_declarado;
    if (setoresEmPico.length > 0) {
      ressalvas.push(
        `A coleta (${campanha.janela.inicio ?? '?'} a ${campanha.janela.fim ?? '?'}) caiu em período de pico declarado`
        + (h.setor ? ` para ${h.setor}` : ` para ${setoresEmPico.join(', ')}`)
        + '. A comparação honesta é com a mesma época de outro ano; comparar com uma coleta fora do pico mede o calendário, não a mudança.');
    } else if (campanha.em_pico_setorial) {
      const rotulos = temporal!.calendario_setorial
        .filter(c => c.meses.some(m => campanha.janela.inicio && campanha.janela.fim
          && mesesEntre(campanha.janela.inicio, campanha.janela.fim).includes(m)))
        .map(c => c.rotulo);
      ressalvas.push(
        `A coleta caiu em período que costuma ser de pico no setor econômico da empresa`
        + (rotulos.length ? ` (${rotulos.join('; ')})` : '')
        + '. Confirmar com a empresa se o pico se aplica e comparar com a mesma época.');
    }
    if (campanha.calor_provavel && setor?.condicoes_fisicas.includes('calor')) {
      ressalvas.push(
        `Coleta no ${campanha.estacao ? NOME_ESTACAO[campanha.estacao] : 'período quente'} em setor que declarou calor. `
        + 'Parte do que a escala capta como carga pode ser exposição térmica — agente físico com norma própria (NR-15), '
        + 'que vai ao PGR como tal e se resolve com engenharia e pausas, não com conversa de liderança.');
      caminhos.push(
        { medida: 'Avaliar a exposição térmica do setor como agente físico e implantar medida de engenharia (exaustão, ventilação, barreira de calor) antes do próximo período quente.', nivel_controle: 'fonte' },
        { medida: 'Pausas de recuperação térmica e hidratação organizadas na escala, não deixadas ao improviso.', nivel_controle: 'organizacional' },
      );
    }
  }
  const comparabilidade = org.comparabilidade[h.indicador];
  if (h.origem === 'tendencia_interna' && comparabilidade && comparabilidade !== 'mesma_epoca' && comparabilidade !== 'indeterminada') {
    ressalvas.push(comparabilidade === 'pico_vs_fora_de_pico'
      ? 'As duas coletas comparadas caem uma em pico e outra fora dele. A variação pode ser calendário, não mudança no trabalho — nomear isso antes de chamar de piora.'
      : 'As duas coletas comparadas caem em estações diferentes. Vale considerar o calendário antes de ler a variação como mudança no trabalho.');
  }
  if (temporal?.proximo_pico && (h.indicador === 'jss_demanda' || h.indicador === 'who5_score')) {
    const p = temporal.proximo_pico;
    const quando = p.em_meses === 0 ? 'este mês' : p.em_meses === 1 ? 'no mês que vem' : `em ${p.em_meses} meses`;
    caminhos.push({
      medida: `Dimensionar cobertura e prioridades para o próximo pico (${NOME_MES[p.mes - 1]}, ${quando}) com antecedência, em vez de reagir dentro dele.`,
      nivel_controle: 'fonte',
    });
  }

  // ── Convergência com absenteísmo e ambulatório ─────────────────────
  // Só o recorte que fala de saúde mental: capítulo F do CID e a categoria
  // ansiedade/estresse do ambulatório. Dado presente e positivo vira
  // convergência; zero ou ausente não vira nada — a empresa pode não ter
  // lançado, e "sem registro" não é evidência de nada.
  const convergencias: string[] = [];
  const sinais = org.sinais;
  if (sinais?.periodo) {
    const mesmoSetor = (nome: string) => h.setor !== null && nome.trim().toLowerCase() === h.setor.trim().toLowerCase();
    const janela = `${sinais.periodo.inicio} a ${sinais.periodo.fim}`;
    if (h.setor) {
      const abs = sinais.absenteismo?.find(a => mesmoSetor(a.setor));
      if (abs && abs.episodios_f > 0) {
        convergencias.push(
          `Absenteísmo: ${abs.episodios_f} afastamento(s) por transtornos mentais e comportamentais (capítulo F) em ${h.setor}, ${abs.dias_f} dia(s), no período ${janela}. Converge com o sinal da pesquisa — outro dado da empresa na mesma direção, não prova de causa no trabalho.`);
      }
      const amb = sinais.ambulatorio?.find(a => mesmoSetor(a.setor));
      if (amb && amb.ansiedade > 0) {
        convergencias.push(
          `Ambulatório: ${amb.ansiedade} atendimento(s) por ansiedade/estresse em ${h.setor} (de ${amb.atendimentos} no total) no período ${janela}. Converge com o sinal da pesquisa.`);
      }
    } else {
      const totalF = (sinais.absenteismo ?? []).reduce((acc, a) => acc + a.episodios_f, 0);
      const setoresF = (sinais.absenteismo ?? []).filter(a => a.episodios_f > 0).map(a => a.setor);
      if (totalF > 0) {
        convergencias.push(
          `Absenteísmo: ${totalF} afastamento(s) por capítulo F na empresa no período ${janela}` +
          (setoresF.length ? ` (${setoresF.join(', ')})` : '') +
          '. Converge com a tendência geral — não prova causa no trabalho.');
      }
      const totalAns = (sinais.ambulatorio ?? []).reduce((acc, a) => acc + a.ansiedade, 0);
      const setoresAns = (sinais.ambulatorio ?? []).filter(a => a.ansiedade > 0).map(a => a.setor);
      if (totalAns > 0) {
        convergencias.push(
          `Ambulatório: ${totalAns} atendimento(s) por ansiedade/estresse na empresa no período ${janela}` +
          (setoresAns.length ? ` (${setoresAns.join(', ')})` : '') + '. Converge com a tendência geral.');
      }
    }
  }

  // ── Empresa: eventos dos últimos 12 meses ──────────────────────────
  const eventos = org.empresa?.eventos_12m ?? [];
  const eventosRelevantes = eventos.filter(e => e !== 'nenhum');
  if (eventosRelevantes.length > 0) {
    const rotulo: Record<string, string> = {
      demissoes_coletivas: 'demissões em grupo', troca_gestao: 'troca de gestão', sistema_novo: 'sistema ou processo novo',
      expansao_rapida: 'crescimento rápido', incidente_grave: 'incidente grave', fusao_aquisicao: 'fusão ou aquisição',
      reestruturacao: 'reestruturação',
    };
    ressalvas.push(
      `A empresa declarou nos últimos 12 meses: ${eventosRelevantes.map(e => rotulo[e] ?? e).join(', ')}. `
      + 'Um evento da empresa inteira pode aparecer como sinal de um setor; validar se o padrão é do setor ou do período.');
    perguntas.push('O que mudou na empresa como um todo neste período, e isso chegou de forma diferente a este setor?');
  }

  // ── Setor: perguntas e caminhos que o contexto torna pertinentes ───
  if (setor) {
    if (setor.contato_publico === 'exposicao_agressao' && (h.indicador === 'jss_apoio' || h.indicador === 'who5_score')) {
      perguntas.push('Com que frequência a equipe enfrenta agressão ou ameaça de clientes/público, e o que acontece depois de uma ocorrência?');
      caminhos.push(
        { medida: 'Protocolo de ocorrência com público: quem aciona, quem assume, o que a pessoa faz em seguida, e apoio pós-ocorrência.', nivel_controle: 'organizacional' },
        { medida: 'Reduzir a exposição na fonte: barreira física, dupla no atendimento nos horários críticos, canal de escalonamento imediato.', nivel_controle: 'fonte' },
      );
    }
    if (setor.lider_formal === false && (h.indicador === 'jss_apoio' || h.indicador === 'jss_controle')) {
      perguntas.push('Sem líder formal, a quem a equipe recorre quando trava — e essa pessoa tem tempo e autoridade para resolver?');
      caminhos.push({ medida: 'Definir uma referência formal para o setor, com disponibilidade previsível e poder de decisão sobre o dia a dia.', nivel_controle: 'organizacional' });
    }
    if (setor.meta_individual === true && h.indicador === 'jss_demanda') {
      perguntas.push('Como a meta individual é definida e cobrada, e o que acontece com quem não a atinge num mês de pico?');
      caminhos.push({ medida: 'Revisar metas com a equipe considerando sazonalidade e cobertura real, e separar meta de equipe de cobrança individual.', nivel_controle: 'fonte' });
    }
    if (setor.escala_previsivel && setor.escala_previsivel !== 'sim' && (h.indicador === 'jss_demanda' || h.indicador === 'jss_controle')) {
      perguntas.push('Com quanta antecedência a escala é conhecida, e quem decide as trocas de última hora?');
      caminhos.push({ medida: 'Publicar a escala com antecedência definida e regra clara para trocas.', nivel_controle: 'organizacional' });
    }
    if (setor.ritmo_ditado_por.includes('maquina_sistema') && h.indicador === 'jss_controle') {
      perguntas.push('Onde a máquina ou o sistema impõe o ritmo, existe margem para a pessoa regular pausas e ordem das tarefas?');
    }
    if (setor.condicoes_fisicas.includes('em_pe') || setor.condicoes_fisicas.includes('esforco_fisico')) {
      if (h.indicador === 'who5_score' || h.indicador === 'jss_demanda') {
        perguntas.push('Há pausas e rodízio para quem trabalha em pé ou com esforço físico, ou a recuperação fica para depois do turno?');
      }
    }
  }

  const contextoSetor = setor ? descreverOrganizacaoSetor(setor) : null;
  const semMudanca = ressalvas.length === 0 && perguntas.length === 0 && caminhos.length === 0
    && convergencias.length === 0 && !contextoSetor;
  if (semMudanca) return h;

  return {
    ...h,
    contexto_setor: contextoSetor,
    ressalvas: ressalvas.length ? ressalvas : undefined,
    convergencias: convergencias.length ? convergencias : undefined,
    perguntas_validacao: juntarUnico(h.perguntas_validacao, perguntas, p => p),
    caminhos_possiveis: juntarUnico(h.caminhos_possiveis, caminhos, c => c.medida),
  };
}

function mesesEntre(inicio: string, fim: string): number[] {
  const a = new Date(`${inicio}T00:00:00Z`);
  const b = new Date(`${fim}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return [];
  const meses = new Set<number>();
  const cursor = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1));
  let guarda = 0;
  while (cursor <= b && guarda++ < 24) {
    meses.add(cursor.getUTCMonth() + 1);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return [...meses];
}

/** Usado pelo prompt/UI para mostrar meses de pico de forma legível. */
export function formatarMeses(meses: number[]): string {
  return meses.map(m => MESES_CURTOS[m - 1]).filter(Boolean).join('/');
}

/**
 * Hipóteses do ciclo atual. Determinístico: mesma entrada, mesma saída,
 * sem chamada de rede e sem modelo de linguagem.
 *
 * Sem dado suficiente devolve lista vazia — dizer "não há base para
 * hipótese" é uma resposta válida e melhor que preencher a tela.
 */
export function gerarHipoteses(ctx: ContextoHipoteses): Hipotese[] {
  const geradas = [...hipotesesDeTendencia(ctx), ...hipotesesDaMatriz(ctx)];
  const todas = ctx.organizacao
    ? geradas.map(h => enriquecerComContexto(h, ctx.organizacao!))
    : geradas;

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
