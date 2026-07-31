// =====================================================
// Malama — Registro de instrumentos psicossociais (NR-1)
//
// FONTE ÚNICA da redação, das opções de resposta e da chave de correção
// de cada instrumento. Nada aqui é "melhorável": alterar o texto de um
// item de instrumento validado invalida o escore e, com ele, o valor do
// relatório agregado num questionamento (fiscal, perito, jurídico).
//
// Escore é sempre determinístico, calculado aqui — nunca por IA.
// =====================================================

export type PsychosocialDimensao = 'bemestar' | 'demanda' | 'controle' | 'apoio';

export type ItemAlinhamento =
  // Responder no TOPO da escala (primeira opção) indica MAIS do construto
  // da dimensão. Ex.: "trabalhar com muita rapidez" = mais demanda.
  | 'positivo'
  // Responder no topo indica MENOS. Ex.: "tem tempo suficiente" = menos
  // demanda; "repetir as mesmas tarefas" = menos controle.
  | 'negativo';

export type InstrumentItem = {
  /** Chave estável gravada em answers (JSONB). Nunca renomear. */
  key: string;
  texto: string;
  dimensao: PsychosocialDimensao;
  alinhamento: ItemAlinhamento;
};

export type EscalaVisual =
  // Carinhas (triste → alegre). SÓ é válido quando TODOS os itens do bloco
  // têm o mesmo alinhamento — ou seja, quando o topo da escala significa a
  // mesma coisa em todos eles. Num bloco de alinhamento misto a carinha
  // contradiz metade dos itens e enviesa a resposta.
  | 'valencia'
  // Bolinhas preenchidas = quantidade, sem juízo de valor ("muito" ↔ "nada").
  // Obrigatório quando o bloco mistura itens positivos e negativos.
  | 'magnitude';

export type InstrumentBlock = {
  /** Enunciado do bloco, quando o instrumento tem um. */
  intro?: string;
  /**
   * Opções na ordem impressa no instrumento, com o valor original.
   *
   * ORDEM É CONTRATO: a primeira opção é sempre o TOPO da escala — é o que
   * `ItemAlinhamento` já assume na chave de correção, e é o que a ilustração
   * de `escalaVisual` usa para saber qual ponta é "mais". Reordenar aqui
   * inverte o desenho na tela sem inverter o escore.
   */
  options: readonly { value: number; label: string }[];
  /**
   * Como as opções são ilustradas para quem lê pouco — ver `EscalaVisual`.
   * Declarado por bloco, e não na tela, porque saber se a carinha mente é
   * propriedade da chave de correção do instrumento, não de layout.
   */
  escalaVisual: EscalaVisual;
  items: readonly InstrumentItem[];
};

export type InstrumentScore = {
  /** Soma dos pontos alinhados ao construto. Faixa depende do instrumento. */
  rawScore: number;
  /** Índice normalizado 0–100 (ver scoreSignificado de cada instrumento). */
  score: number;
  /** Índices por dimensão, quando o instrumento é multidimensional. */
  subscores: Record<string, number> | null;
};

export type InstrumentDef = {
  code: string;
  nome: string;
  eixo: 'bemestar' | 'exposicao';
  cadenciaMeses: number;
  fonte: string;
  /** O que o score 0–100 significa — vai para a UI e para o relatório. */
  scoreSignificado: string;
  blocks: readonly InstrumentBlock[];
  score: (answers: Record<string, number>) => InstrumentScore;
};

/** Normaliza uma soma para 0–100 dado o mínimo e o máximo possíveis. */
function normalizar(soma: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.round(((soma - min) / (max - min)) * 100);
}

/** Achata os itens de todos os blocos, na ordem de aplicação. */
export function itensDe(def: InstrumentDef): InstrumentItem[] {
  return def.blocks.flatMap(b => [...b.items]);
}

/** Opções do bloco a que o item pertence. */
export function opcoesDoItem(def: InstrumentDef, key: string) {
  const bloco = def.blocks.find(b => b.items.some(i => i.key === key));
  return bloco?.options ?? [];
}

// =====================================================
// WHO-5 — Índice de Bem-Estar (OMS, 1998)
//
// Domínio público; redação da versão brasileira validada.
// Escore: cada item 0–5; bruto = soma (0–25); índice = bruto × 4 (0–100).
// Score < 50 indica bem-estar reduzido; <= 28 sugere rastreio aprofundado.
// =====================================================

export const WHO5_INTRO =
  'Nas últimas duas semanas, com que frequência você se sentiu assim?';

export const WHO5_QUESTIONS: readonly string[] = [
  'Eu me senti alegre e de bom humor',
  'Eu me senti calmo(a) e relaxado(a)',
  'Eu me senti ativo(a) e com energia',
  'Acordei me sentindo revigorado(a) e descansado(a)',
  'Meu dia a dia tem sido preenchido com coisas que me interessam',
] as const;

// Valor do item = índice na escala oficial (0 = pior, 5 = melhor)
export const WHO5_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 5, label: 'O tempo todo' },
  { value: 4, label: 'A maior parte do tempo' },
  { value: 3, label: 'Mais da metade do tempo' },
  { value: 2, label: 'Menos da metade do tempo' },
  { value: 1, label: 'Algumas vezes' },
  { value: 0, label: 'Em nenhum momento' },
] as const;

export const WHO5: InstrumentDef = {
  code: 'who5',
  nome: 'Índice de Bem-Estar WHO-5',
  eixo: 'bemestar',
  cadenciaMeses: 1,
  fonte: 'WHO Regional Office for Europe, 1998. Versão brasileira validada.',
  scoreSignificado: 'Maior = melhor bem-estar. Abaixo de 50 indica bem-estar reduzido.',
  blocks: [{
    intro: WHO5_INTRO,
    options: WHO5_OPTIONS,
    escalaVisual: 'valencia',
    items: WHO5_QUESTIONS.map((texto, i) => ({
      key: `q${i + 1}`,
      texto,
      dimensao: 'bemestar' as const,
      alinhamento: 'positivo' as const,
    })),
  }],
  score(answers) {
    const valores = WHO5_QUESTIONS.map((_, i) => answers[`q${i + 1}`]);
    if (valores.some(v => !Number.isInteger(v) || v < 0 || v > 5)) {
      throw new Error('Resposta WHO-5 fora da escala 0–5');
    }
    const rawScore = valores.reduce((s, v) => s + v, 0);
    return { rawScore, score: rawScore * 4, subscores: null };
  },
};

// =====================================================
// JSS — Job Stress Scale, versão resumida (demanda-controle-apoio)
//
// Alves MGM, Chor D, Faerstein E, Lopes CS, Werneck GL. Versão resumida
// da "job stress scale": adaptação para o português. Rev Saúde Pública
// 2004;38(2):164-71. Tabela 3. Adaptação cedida por Töres Theorell.
//
// Redação transcrita do artigo, com a única alteração de atualizar o
// trema pela reforma ortográfica ("freqüência" → "frequência"). Mudança
// ortográfica, não semântica.
//
// CHAVE DE CORREÇÃO — atenção, é onde se erra:
// As opções vêm numeradas 1–4 de "Frequentemente" a "Nunca ou quase
// nunca", ou seja, o valor bruto anda AO CONTRÁRIO do construto na
// maioria dos itens. Somar 1–4 direto inverteria os quadrantes de
// Karasek. Por isso cada item declara seu alinhamento e a conversão é:
//
//   alinhamento 'positivo' → pontos = 5 - resposta   (topo da escala = mais construto)
//   alinhamento 'negativo' → pontos = resposta       (topo da escala = menos construto)
//
// O artigo é um estudo de equivalência transcultural e não publica a
// chave; as duas inversões (item d em demanda, item i em controle) são
// as do modelo demanda-controle de Karasek/Theorell e são logicamente
// forçadas pela redação.
// =====================================================

const JSS_OPCOES_FREQUENCIA = [
  { value: 1, label: 'Frequentemente' },
  { value: 2, label: 'Às vezes' },
  { value: 3, label: 'Raramente' },
  { value: 4, label: 'Nunca ou quase nunca' },
] as const;

const JSS_OPCOES_CONCORDANCIA = [
  { value: 1, label: 'Concordo totalmente' },
  { value: 2, label: 'Concordo mais que discordo' },
  { value: 3, label: 'Discordo mais que concordo' },
  { value: 4, label: 'Discordo totalmente' },
] as const;

const JSS_ITENS_FREQUENCIA: readonly InstrumentItem[] = [
  // ── Demanda psicológica (5 itens) ──
  { key: 'a', dimensao: 'demanda', alinhamento: 'positivo',
    texto: 'Com que frequência você tem que fazer suas tarefas de trabalho com muita rapidez?' },
  { key: 'b', dimensao: 'demanda', alinhamento: 'positivo',
    texto: 'Com que frequência você tem que trabalhar intensamente (isto é, produzir muito em pouco tempo)?' },
  { key: 'c', dimensao: 'demanda', alinhamento: 'positivo',
    texto: 'Seu trabalho exige demais de você?' },
  // Ter tempo suficiente indica MENOS demanda → invertido.
  { key: 'd', dimensao: 'demanda', alinhamento: 'negativo',
    texto: 'Você tem tempo suficiente para cumprir todas as tarefas de seu trabalho?' },
  { key: 'e', dimensao: 'demanda', alinhamento: 'positivo',
    texto: 'O seu trabalho costuma apresentar exigências contraditórias ou discordantes?' },

  // ── Controle (6 itens) ──
  { key: 'f', dimensao: 'controle', alinhamento: 'positivo',
    texto: 'Você tem possibilidade de aprender coisas novas em seu trabalho?' },
  { key: 'g', dimensao: 'controle', alinhamento: 'positivo',
    texto: 'Seu trabalho exige muita habilidade ou conhecimentos especializados?' },
  { key: 'h', dimensao: 'controle', alinhamento: 'positivo',
    texto: 'Seu trabalho exige que você tome iniciativas?' },
  // Repetição alta indica MENOS controle → invertido.
  { key: 'i', dimensao: 'controle', alinhamento: 'negativo',
    texto: 'No seu trabalho, você tem que repetir muitas vezes as mesmas tarefas?' },
  { key: 'j', dimensao: 'controle', alinhamento: 'positivo',
    texto: 'Você pode escolher COMO fazer o seu trabalho?' },
  { key: 'k', dimensao: 'controle', alinhamento: 'positivo',
    texto: 'Você pode escolher O QUE fazer no seu trabalho?' },
] as const;

const JSS_ITENS_CONCORDANCIA: readonly InstrumentItem[] = [
  // ── Apoio social (6 itens) — todos redigidos no sentido positivo ──
  { key: 'l', dimensao: 'apoio', alinhamento: 'positivo',
    texto: 'Existe um ambiente calmo e agradável onde trabalho.' },
  { key: 'm', dimensao: 'apoio', alinhamento: 'positivo',
    texto: 'No trabalho, nos relacionamos bem uns com os outros.' },
  { key: 'n', dimensao: 'apoio', alinhamento: 'positivo',
    texto: 'Eu posso contar com o apoio dos meus colegas de trabalho.' },
  { key: 'o', dimensao: 'apoio', alinhamento: 'positivo',
    texto: 'Se eu não estiver num bom dia, meus colegas compreendem.' },
  { key: 'p', dimensao: 'apoio', alinhamento: 'positivo',
    texto: 'No trabalho, eu me relaciono bem com meus chefes.' },
  { key: 'q', dimensao: 'apoio', alinhamento: 'positivo',
    texto: 'Eu gosto de trabalhar com meus colegas.' },
] as const;

const JSS_TODOS = [...JSS_ITENS_FREQUENCIA, ...JSS_ITENS_CONCORDANCIA];

/** Pontos alinhados ao construto (1–4, maior = mais do construto). */
function pontosJss(item: InstrumentItem, resposta: number): number {
  return item.alinhamento === 'positivo' ? 5 - resposta : resposta;
}

export const JSS: InstrumentDef = {
  code: 'jss',
  nome: 'Job Stress Scale (demanda-controle-apoio)',
  eixo: 'exposicao',
  cadenciaMeses: 6,
  fonte: 'Alves MGM et al. Rev Saúde Pública 2004;38(2):164-71. Adaptação cedida por Töres Theorell.',
  scoreSignificado:
    'Índice de exposição ocupacional. Maior = mais exposição a risco psicossocial '
    + '(alta demanda combinada com baixo controle e baixo apoio).',
  blocks: [
    { options: JSS_OPCOES_FREQUENCIA, escalaVisual: 'magnitude', items: JSS_ITENS_FREQUENCIA },
    { options: JSS_OPCOES_CONCORDANCIA, escalaVisual: 'valencia', items: JSS_ITENS_CONCORDANCIA },
  ],
  score(answers) {
    for (const item of JSS_TODOS) {
      const v = answers[item.key];
      if (!Number.isInteger(v) || v < 1 || v > 4) {
        throw new Error(`Resposta JSS fora da escala 1–4 no item "${item.key}"`);
      }
    }

    const somaDe = (dim: PsychosocialDimensao) =>
      JSS_TODOS.filter(i => i.dimensao === dim)
        .reduce((s, i) => s + pontosJss(i, answers[i.key]), 0);

    const nDe = (dim: PsychosocialDimensao) =>
      JSS_TODOS.filter(i => i.dimensao === dim).length;

    // Cada item vale 1–4, então a soma de n itens vai de n a 4n.
    const indice = (dim: PsychosocialDimensao) => {
      const n = nDe(dim);
      return normalizar(somaDe(dim), n, 4 * n);
    };

    const demanda  = indice('demanda');   // maior = mais demanda
    const controle = indice('controle');  // maior = mais controle
    const apoio    = indice('apoio');     // maior = mais apoio

    // Índice de exposição: alta demanda, baixo controle e baixo apoio
    // puxam para cima. É o eixo "exposição" da matriz de risco por setor.
    const score = Math.round((demanda + (100 - controle) + (100 - apoio)) / 3);

    return {
      // Soma auditável dos pontos alinhados ao construto (17–68). NÃO é
      // interpretável isoladamente e não anda junto com a exposição:
      // controle e apoio altos aumentam esta soma e diminuem o risco.
      // Para leitura, usar sempre score e subscores.
      rawScore: somaDe('demanda') + somaDe('controle') + somaDe('apoio'),
      score,
      subscores: {
        demanda_bruto:  somaDe('demanda'),
        demanda:        demanda,
        controle_bruto: somaDe('controle'),
        controle:       controle,
        apoio_bruto:    somaDe('apoio'),
        apoio:          apoio,
      },
    };
    // Nota: o quadrante de Karasek (alto desgaste / ativo / passivo /
    // baixo desgaste) depende de um ponto de corte populacional — em
    // geral a mediana do grupo. Por isso NÃO é calculado por indivíduo
    // aqui; entra no relatório agregado, com a mediana da referência.
  },
};

// =====================================================
// Registro
// =====================================================

export const INSTRUMENTOS: Record<string, InstrumentDef> = {
  [WHO5.code]: WHO5,
  [JSS.code]: JSS,
};

export function getInstrumento(code: string): InstrumentDef {
  const def = INSTRUMENTOS[code];
  if (!def) throw new Error(`Instrumento desconhecido: ${code}`);
  return def;
}
