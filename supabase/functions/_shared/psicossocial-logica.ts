// =====================================================
// Malama — Memória do ciclo psicossocial: configuração e vocabulário
//
// FONTE ÚNICA dos limiares usados pelos motores de hipótese e de resultado
// observado. Nenhum número mágico espalhado pelo código: se um limiar
// precisar mudar, muda aqui e a versão da lógica sobe junto.
//
// O QUE ESTE MÓDULO NÃO FAZ
// Não calcula escore de instrumento (isso é psychosocialInstruments.ts,
// determinístico e imutável) e não pede nada a modelo de linguagem. Tudo
// aqui é aritmética e comparação — o LLM só redige texto por cima do que
// já foi calculado.
// =====================================================

/**
 * Versão da lógica que produziu um registro. Gravada em toda hipótese e
 * todo resultado observado, porque sem isso uma mudança de regra reescreve
 * silenciosamente a leitura do passado e a pergunta "por que o Malama
 * sugeriu isso em março?" fica sem resposta.
 *
 * Subir quando mudar qualquer limiar abaixo ou a definição de qualquer
 * categoria — não quando só mudar texto de tela.
 */
export const LOGICA_VERSAO = '2026-09-08.1';

export const CONFIG_APRENDIZADO = {
  /**
   * Variação, em pontos do índice 0–100, a partir da qual o movimento
   * deixa de ser ruído. Mesmo valor que o briefing já usa para dizer
   * "melhorou/piorou" — mudar aqui sem mudar lá criaria duas verdades na
   * mesma tela.
   */
  LIMIAR_VARIACAO_RELEVANTE: 5,

  /**
   * Piso de respondentes por recorte. Espelha o k_min = 5 aplicado dentro
   * do banco pelas RPCs de relatório. Na prática o banco já suprime antes
   * de chegar aqui; a checagem é redundante de propósito, para o motor
   * nunca classificar em cima de um número pequeno que tenha vazado por
   * algum caminho novo.
   */
  MIN_RESPONDENTES: 5,

  /**
   * Intervalo mínimo entre a linha de base e a reavaliação. A cadência
   * mais curta em uso é mensal (WHO-5), então 25 dias aceita dois ciclos
   * mensais consecutivos e recusa duas coletas coladas dentro do mesmo
   * mês, que não são reavaliação de nada.
   */
  MIN_INTERVALO_DIAS: 25,

  /**
   * Variação relativa máxima no número de respondentes entre as duas
   * coletas. Acima disso não se está comparando o mesmo retrato: metade do
   * setor entrando ou saindo da amostra move a média sozinha, sem que nada
   * tenha mudado no trabalho.
   */
  MAX_VARIACAO_PARTICIPACAO: 0.5,

  /** Ciclos com o mesmo sinal para o padrão deixar de ser "inicial". */
  CICLOS_PADRAO_RECORRENTE: 2,
  /** Ciclos com o mesmo sinal para o padrão ser tratado como consistente. */
  CICLOS_PADRAO_CONSISTENTE: 3,

  /**
   * ETAPA 2 — aprendizado entre empresas. Mínimo de casos desidentificados
   * antes de qualquer estatística multiempresa poder ser apresentada.
   *
   * Declarado aqui, e não inventado depois na hora de montar a tela, para
   * que o número seja uma decisão documentada e não um detalhe de
   * implementação. NADA consome esta constante nesta etapa: a inteligência
   * cross-tenant ainda não existe, só os snapshots que a viabilizam.
   */
  MIN_CASOS_PADRAO_ENTRE_EMPRESAS: 20,
} as const;

// =====================================================
// Indicadores agregados
//
// São os mesmos ids que o briefing já usa nas tendências. A direção
// favorável vem do instrumento e NÃO deve ser alterada sem evidência na
// escala: WHO-5, controle e apoio melhoram quando sobem; demanda melhora
// quando cai (ver psychosocialInstruments.ts).
// =====================================================

export type IndicadorId = 'who5_score' | 'jss_demanda' | 'jss_controle' | 'jss_apoio';
export type FavoravelQuando = 'sobe' | 'cai';
export type PlanoFator =
  'demanda' | 'controle' | 'apoio' | 'assedio' | 'jornada' | 'reconhecimento' | 'outro';
export type NivelControle = 'fonte' | 'organizacional' | 'individual';

export type IndicadorDef = {
  id: IndicadorId;
  /** Rótulo de tela, no vocabulário do produto (não o termo técnico). */
  label: string;
  instrumento: 'who5' | 'jss';
  favoravelQuando: FavoravelQuando;
  /** Fator do plano de ação correspondente — mesmo enum do banco. */
  fator: PlanoFator;
};

export const INDICADORES: Record<IndicadorId, IndicadorDef> = {
  who5_score: {
    id: 'who5_score', label: 'Bem-estar (WHO-5)', instrumento: 'who5',
    favoravelQuando: 'sobe',
    // WHO-5 mede desfecho, não fator do trabalho. Os caminhos que o produto
    // já oferece para um sinal de bem-estar são de apoio e reconhecimento
    // (SUGESTOES.bemEstar em planoSugestoes.ts); manter 'apoio' aqui é o
    // que faz hipótese e medida escolhida falarem a mesma língua.
    fator: 'apoio',
  },
  jss_demanda: {
    id: 'jss_demanda', label: 'Cobrança e ritmo de trabalho', instrumento: 'jss',
    favoravelQuando: 'cai', fator: 'demanda',
  },
  jss_controle: {
    id: 'jss_controle', label: 'Autonomia para organizar o trabalho', instrumento: 'jss',
    favoravelQuando: 'sobe', fator: 'controle',
  },
  jss_apoio: {
    id: 'jss_apoio', label: 'Apoio de colegas e liderança', instrumento: 'jss',
    favoravelQuando: 'sobe', fator: 'apoio',
  },
};

export const INDICADOR_IDS = Object.keys(INDICADORES) as IndicadorId[];

export function ehIndicadorConhecido(valor: unknown): valor is IndicadorId {
  return typeof valor === 'string' && valor in INDICADORES;
}

// =====================================================
// Força da evidência
//
// Categoria, nunca porcentagem. Não existe método defensável para atribuir
// uma probabilidade a "este fator explica este resultado" com os dados que
// o Malama tem — e um número inventado viraria justamente a parte mais
// citada do relatório.
//
// Definição determinística, contando CICLOS em que o mesmo sinal apareceu
// no mesmo recorte (o ciclo atual mais os anteriores já registrados):
// =====================================================

export type ForcaEvidencia =
  /** Recorte suprimido ou abaixo do piso: não dá para afirmar nem o sinal. */
  | 'evidencia_insuficiente'
  /** Sinal visto em um ciclo. Serve para investigar, não para concluir. */
  | 'sinal_inicial'
  /** Mesmo sinal em 2 ciclos do mesmo recorte. */
  | 'padrao_recorrente'
  /** Mesmo sinal em 3 ou mais ciclos do mesmo recorte. */
  | 'padrao_consistente';

export const FORCA_LABEL: Record<ForcaEvidencia, string> = {
  evidencia_insuficiente: 'Evidência insuficiente',
  sinal_inicial: 'Sinal inicial',
  padrao_recorrente: 'Padrão recorrente',
  padrao_consistente: 'Padrão consistente',
};

/**
 * Força a partir da contagem de ciclos com o mesmo sinal.
 *
 * `dadoConfiavel = false` (recorte suprimido ou n abaixo do piso) sempre
 * vence a contagem: repetir uma leitura que não pode ser publicada não a
 * transforma em padrão.
 */
export function forcaDaEvidencia(ciclosComSinal: number, dadoConfiavel: boolean): ForcaEvidencia {
  if (!dadoConfiavel) return 'evidencia_insuficiente';
  if (ciclosComSinal >= CONFIG_APRENDIZADO.CICLOS_PADRAO_CONSISTENTE) return 'padrao_consistente';
  if (ciclosComSinal >= CONFIG_APRENDIZADO.CICLOS_PADRAO_RECORRENTE) return 'padrao_recorrente';
  return 'sinal_inicial';
}

export type OrigemRecomendacao =
  /** Regra fixa em código, sem comparação temporal. */
  | 'regra_deterministica'
  /** Comparação entre coletas da própria empresa. */
  | 'tendencia_interna'
  /** Ciclos anteriores registrados desta mesma empresa. */
  | 'historico_empresa'
  /** Casos desidentificados de várias empresas — ETAPA 2, nada produz ainda. */
  | 'historico_agregado'
  /** Texto formulado por modelo de linguagem sobre dados já calculados. */
  | 'llm';

// =====================================================
// Utilitários numéricos compartilhados
// =====================================================

export const numeroOuNull = (valor: unknown): number | null =>
  typeof valor === 'number' && Number.isFinite(valor) ? valor : null;

export const arredonda1 = (valor: number): number => Math.round(valor * 10) / 10;

/** Dias inteiros entre duas datas ISO (YYYY-MM-DD). NaN vira null. */
export function diasEntre(inicio: unknown, fim: unknown): number | null {
  const a = Date.parse(`${String(inicio).slice(0, 10)}T12:00:00Z`);
  const b = Date.parse(`${String(fim).slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}
