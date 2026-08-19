export type RhBriefingSeverity = 'critico' | 'atencao' | 'oportunidade' | 'positivo' | 'informativo';
export type RhBriefingDirection = 'melhorou' | 'piorou' | 'estavel';

type Trend = {
  id: string;
  label: string;
  atual: number;
  anterior: number;
  delta: number;
  direcao: RhBriefingDirection;
  favoravel_quando: 'sobe' | 'cai';
  periodo_atual: unknown;
  periodo_anterior: unknown;
  n_atual: number;
  n_anterior: number;
};

type SuggestedMeasure = {
  setor?: string;
  fator: string;
  risco_descricao: string;
  medida: string;
  nivel_controle: 'fonte' | 'organizacional' | 'individual';
  metrica_sucesso: string;
  abordagem_lideranca: string;
};

type Priority = {
  id: string;
  severidade: RhBriefingSeverity;
  titulo: string;
  descricao: string;
  evidencias: string[];
  acao?: { label: string; target: string };
  medida_sugerida?: SuggestedMeasure;
};

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const arredonda = (value: number) => Math.round(value * 10) / 10;

function trend(params: {
  id: string;
  label: string;
  atual: unknown;
  anterior: unknown;
  favoravelQuando: 'sobe' | 'cai';
  periodoAtual: unknown;
  periodoAnterior: unknown;
  nAtual: unknown;
  nAnterior: unknown;
  limiar?: number;
}): Trend | null {
  const atual = num(params.atual);
  const anterior = num(params.anterior);
  if (atual === null || anterior === null) return null;
  const delta = arredonda(atual - anterior);
  const limiar = params.limiar ?? 5;
  const estavel = Math.abs(delta) < limiar;
  const movimentoFavoravel = params.favoravelQuando === 'sobe' ? delta > 0 : delta < 0;
  return {
    id: params.id,
    label: params.label,
    atual: arredonda(atual),
    anterior: arredonda(anterior),
    delta,
    direcao: estavel ? 'estavel' : movimentoFavoravel ? 'melhorou' : 'piorou',
    favoravel_quando: params.favoravelQuando,
    periodo_atual: params.periodoAtual,
    periodo_anterior: params.periodoAnterior,
    n_atual: num(params.nAtual) ?? 0,
    n_anterior: num(params.nAnterior) ?? 0,
  };
}

function measureFor(metric: string): SuggestedMeasure | undefined {
  if (metric === 'jss_demanda') return {
    fator: 'demanda',
    risco_descricao: 'A demanda média agregada piorou em relação à medição anterior; a causa precisa ser validada com as equipes e lideranças.',
    medida: 'Revisar prioridades, volume, cobertura dos turnos e interrupções do trabalho; pactuar ajustes coletivos e registrar responsáveis e prazo.',
    nivel_controle: 'fonte',
    metrica_sucesso: 'Reduzir a demanda média no próximo JSS e concluir os ajustes pactuados no prazo.',
    abordagem_lideranca: 'Pergunte quais entregas competem entre si, onde surgem urgências recorrentes e o que pode ser interrompido, redistribuído ou simplificado.',
  };
  if (metric === 'jss_controle') return {
    fator: 'controle',
    risco_descricao: 'O controle médio sobre o trabalho caiu em relação à medição anterior; a causa precisa ser validada antes de formalizar a medida.',
    medida: 'Revisar autonomia, clareza de decisão, participação no planejamento e possibilidade de organizar a sequência do trabalho.',
    nivel_controle: 'organizacional',
    metrica_sucesso: 'Elevar o indicador de controle no próximo JSS e registrar os acordos implantados.',
    abordagem_lideranca: 'Mapeie decisões que podem ser delegadas e situações em que regras conflitantes impedem a equipe de organizar o próprio trabalho.',
  };
  if (metric === 'jss_apoio') return {
    fator: 'apoio',
    risco_descricao: 'O apoio médio percebido caiu em relação à medição anterior; a leitura é coletiva e não identifica pessoas.',
    medida: 'Definir rotina de alinhamento, canal de escalonamento, passagem de turno e disponibilidade mínima da liderança para remover bloqueios.',
    nivel_controle: 'organizacional',
    metrica_sucesso: 'Elevar o indicador de apoio no próximo JSS e verificar a execução da rotina acordada.',
    abordagem_lideranca: 'Pergunte quando a equipe precisa de ajuda, quanto tempo leva para obtê-la e quais bloqueios ficam sem responsável.',
  };
  return undefined;
}

function priorityFromTrend(item: Trend): Priority | null {
  if (item.direcao !== 'piorou') return null;
  const sentido = item.delta > 0 ? `subiu ${Math.abs(item.delta)}` : `caiu ${Math.abs(item.delta)}`;
  const medida = measureFor(item.id);
  return {
    id: `tendencia_${item.id}`,
    severidade: 'atencao',
    titulo: `${item.label} piorou`,
    descricao: `O indicador ${sentido} pontos entre as duas últimas coletas comparáveis. Trate como sinal para investigação coletiva, não como diagnóstico ou prova de causalidade.`,
    evidencias: [
      `Atual: ${item.atual} (${item.n_atual} respondentes)`,
      `Anterior: ${item.anterior} (${item.n_anterior} respondentes)`,
    ],
    acao: medida
      ? { label: 'Preparar medida de controle', target: '/rh/plano-acao' }
      : { label: 'Analisar resultados', target: '/rh/saude-mental' },
    ...(medida ? { medida_sugerida: medida } : {}),
  };
}

function routeAllowed(target: string, allowedRoutes: string[]) {
  return allowedRoutes.some(route => target === route || target.startsWith(`${route}?`) || target.startsWith(`${route}#`));
}

export function buildRhBriefing(reading: any, cycle: any, allowedRoutes: string[]) {
  const currentWho5 = reading?.ultimos_relatorios?.who5;
  const previousWho5 = reading?.relatorios_anteriores?.who5;
  const currentJss = reading?.ultimos_relatorios?.jss;
  const previousJss = reading?.relatorios_anteriores?.jss;
  const trends: Trend[] = [
    trend({
      id: 'who5_score', label: 'Bem-estar WHO-5',
      atual: currentWho5?.geral?.score_medio, anterior: previousWho5?.geral?.score_medio,
      favoravelQuando: 'sobe', periodoAtual: currentWho5?.periodo, periodoAnterior: previousWho5?.periodo,
      nAtual: currentWho5?.geral?.n_respondentes, nAnterior: previousWho5?.geral?.n_respondentes,
    }),
    trend({
      id: 'jss_demanda', label: 'Demanda JSS',
      atual: currentJss?.geral?.demanda_medio, anterior: previousJss?.geral?.demanda_medio,
      favoravelQuando: 'cai', periodoAtual: currentJss?.periodo, periodoAnterior: previousJss?.periodo,
      nAtual: currentJss?.geral?.n_respondentes, nAnterior: previousJss?.geral?.n_respondentes,
    }),
    trend({
      id: 'jss_controle', label: 'Controle JSS',
      atual: currentJss?.geral?.controle_medio, anterior: previousJss?.geral?.controle_medio,
      favoravelQuando: 'sobe', periodoAtual: currentJss?.periodo, periodoAnterior: previousJss?.periodo,
      nAtual: currentJss?.geral?.n_respondentes, nAnterior: previousJss?.geral?.n_respondentes,
    }),
    trend({
      id: 'jss_apoio', label: 'Apoio JSS',
      atual: currentJss?.geral?.apoio_medio, anterior: previousJss?.geral?.apoio_medio,
      favoravelQuando: 'sobe', periodoAtual: currentJss?.periodo, periodoAnterior: previousJss?.periodo,
      nAtual: currentJss?.geral?.n_respondentes, nAnterior: previousJss?.geral?.n_respondentes,
    }),
  ].filter((item): item is Trend => item !== null);

  const priorities: Priority[] = [];
  const overdue = Number(cycle?.plano_de_acao?.medidas_atrasadas ?? 0);
  if (overdue > 0) priorities.push({
    id: 'medidas_atrasadas', severidade: 'critico',
    titulo: `${overdue} medida(s) de controle atrasada(s)`,
    descricao: 'Prazo vencido sem atualização reduz a rastreabilidade do ciclo. Verifique execução, impedimentos e evidências antes de apenas trocar a data.',
    evidencias: [`${overdue} medida(s) fora do prazo`],
    acao: { label: 'Revisar medidas', target: '/rh/plano-acao?visao=acoes' },
  });

  const noSource = Array.isArray(cycle?.plano_de_acao?.setores_sem_acao_na_fonte)
    ? cycle.plano_de_acao.setores_sem_acao_na_fonte.filter(Boolean) : [];
  if (noSource.length > 0) priorities.push({
    id: 'lacuna_fonte', severidade: 'atencao',
    titulo: 'Há setores sem controle na fonte ou organizacional',
    descricao: 'Antes de concentrar a resposta no indivíduo, revise o desenho, a organização e as condições do trabalho.',
    evidencias: [noSource.slice(0, 5).join(', '), noSource.length > 5 ? `e mais ${noSource.length - 5} setor(es)` : ''].filter(Boolean),
    acao: { label: 'Completar plano', target: '/rh/plano-acao?visao=acoes' },
  });

  const pendingLeadership = Number(cycle?.lideranca?.marcos_pendentes ?? 0);
  if (pendingLeadership > 0) priorities.push({
    id: 'lideranca_pendente', severidade: 'atencao',
    titulo: `${pendingLeadership} marco(s) de liderança pendente(s)`,
    descricao: 'Transforme a leitura em conversa objetiva: fato agregado, hipótese a validar, combinado, responsável, prazo e evidência.',
    evidencias: [`${pendingLeadership} acompanhamento(s) aguardando verificação`],
    acao: { label: 'Apoiar lideranças', target: '/rh/plano-acao?visao=lideranca' },
  });

  priorities.push(...trends.map(priorityFromTrend).filter((item): item is Priority => item !== null));

  const campaigns = Array.isArray(reading?.campanhas_abertas) ? reading.campanhas_abertas : [];
  const now = Date.now();
  const campaignsPastHalf = campaigns.filter((campaign: any) => {
    const invited = Number(campaign?.convidados ?? 0);
    const start = Date.parse(`${campaign?.inicio}T12:00:00Z`);
    const end = Date.parse(`${campaign?.fim}T12:00:00Z`);
    return invited > 0 && Number.isFinite(start) && Number.isFinite(end) && now >= start + (end - start) / 2;
  });
  const lowEngagementSectors = campaignsPastHalf.flatMap((campaign: any) =>
    (Array.isArray(campaign?.setores) ? campaign.setores : [])
      .filter((sector: any) => sector?.agrupado !== true && Number(sector?.taxa ?? 0) < 30)
      .map((sector: any) => ({ ...sector, instrumento: campaign.instrumento })));
  if (lowEngagementSectors.length > 0) priorities.push({
    id: 'setores_baixo_engajamento', severidade: 'oportunidade',
    titulo: `${lowEngagementSectors.length} setor(es) com baixo engajamento na pesquisa`,
    descricao: 'Reforce finalidade, anonimato e canais de acesso com comunicação coletiva por setor. Baixa adesão pode indicar receio ou barreira de acesso; não conclua desinteresse e não cobre pessoas nominalmente.',
    evidencias: lowEngagementSectors.slice(0, 5).map((sector: any) =>
      `${sector.instrumento} · ${sector.setor}: ${sector.respondentes}/${sector.convidados} (${sector.taxa}%)`),
    acao: { label: 'Ver adesão por setor', target: '/rh/saude-mental#campanhas' },
  });

  const lowAdherence = campaignsPastHalf.filter((campaign: any) =>
    Number(campaign?.respondentes ?? 0) / Number(campaign?.convidados ?? 1) < 0.3);
  if (lowAdherence.length > 0 && lowEngagementSectors.length === 0) priorities.push({
    id: 'baixa_adesao', severidade: 'oportunidade',
    titulo: 'Campanha aberta com baixa adesão',
    descricao: 'Reforce a comunicação coletiva sobre finalidade, anonimato e tempo de resposta. Não faça cobrança individual.',
    evidencias: lowAdherence.slice(0, 3).map((campaign: any) => `${campaign.instrumento}: ${campaign.respondentes}/${campaign.convidados} respostas`),
    acao: { label: 'Ver campanhas', target: '/rh/saude-mental#campanhas' },
  });

  const hasCurrentReport = !!currentWho5 || !!currentJss;
  if (!hasCurrentReport) priorities.push({
    id: 'sem_linha_base', severidade: 'informativo',
    titulo: 'Ainda não há linha de base encerrada',
    descricao: 'Conclua uma primeira coleta para o copiloto comparar tendências sem expor respostas individuais.',
    evidencias: ['Nenhum relatório agregado WHO-5 ou JSS disponível'],
    acao: { label: 'Preparar medição', target: '/rh/saude-mental#campanhas' },
  });

  const suppressed: string[] = [];
  if (currentWho5?.geral?.dados_suprimidos) suppressed.push('WHO-5 atual');
  if (previousWho5?.geral?.dados_suprimidos) suppressed.push('WHO-5 anterior');
  if (currentJss?.geral?.dados_suprimidos) suppressed.push('JSS atual');
  if (previousJss?.geral?.dados_suprimidos) suppressed.push('JSS anterior');

  const severityOrder: Record<RhBriefingSeverity, number> = {
    critico: 0, atencao: 1, oportunidade: 2, informativo: 3, positivo: 4,
  };
  const filteredPriorities = priorities
    .map(item => item.acao && !routeAllowed(item.acao.target, allowedRoutes) ? { ...item, acao: undefined } : item)
    .sort((a, b) => severityOrder[a.severidade] - severityOrder[b.severidade]);
  const positives = trends.filter(item => item.direcao === 'melhorou').map(item =>
    `${item.label} melhorou ${Math.abs(item.delta)} pontos entre as duas últimas coletas comparáveis.`);
  if (overdue === 0 && Number(cycle?.plano_de_acao?.medidas_abertas ?? 0) > 0) {
    positives.push('Não há medidas abertas fora do prazo neste momento.');
  }
  const worsening = trends.filter(item => item.direcao === 'piorou').length;

  return {
    gerado_em: new Date().toISOString(),
    situacao: filteredPriorities.some(item => item.severidade === 'critico') ? 'critico'
      : filteredPriorities.some(item => item.severidade === 'atencao') ? 'atencao'
      : 'estavel',
    resumo: worsening > 0
      ? `${worsening} indicador(es) pioraram de forma relevante nas coletas comparáveis.`
      : trends.length > 0
        ? 'Os indicadores comparáveis não mostram piora relevante no momento.'
        : 'Ainda não há duas coletas agregadas comparáveis; o briefing prioriza o andamento do ciclo.',
    prioridades: filteredPriorities.slice(0, 6),
    tendencias: trends,
    positivos: positives.slice(0, 4),
    qualidade_dados: {
      comparacoes_disponiveis: trends.length,
      dados_suprimidos: suppressed,
      nota: 'Comparações usam somente relatórios agregados acima do piso de anonimato. Mudanças no número de respondentes devem ser consideradas na interpretação.',
    },
  };
}
