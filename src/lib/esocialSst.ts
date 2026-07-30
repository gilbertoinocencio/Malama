// =====================================================
// Malama — Parser canônico de eventos SST do eSocial
//
// POR QUE O eSOCIAL É O SCHEMA CANÔNICO
// Toda empresa brasileira já declara estes eventos ao governo. Ler o formato
// que já existe torna a ingestão neutra de fornecedor: TOTVS SIGAMDT, clínica
// de medicina do trabalho, Senior ou SAP mudam o TRANSPORTE, não o conteúdo.
// Um parser, todos os originadores.
//
// EVENTOS RECONHECIDOS
//   S-2230  evtAfastTemp   afastamento temporário — tem CID e dias
//   S-2210  evtCAT         comunicação de acidente de trabalho
//   S-2220  evtMonit       monitoramento da saúde (ASO, exames)
//   S-2240  evtExpRisco    condições ambientais / agentes nocivos
//
// Nesta versão só o S-2230 tem destino no banco: é o único que alimenta um
// eixo já existente (absenteísmo por capítulo de CID, migration 20260731).
// Os outros três são reconhecidos e CONTADOS — aparecem no resumo como
// "sem destino" para ninguém achar que foram importados. O parser já os lê
// para que dar destino a eles depois não exija reescrever esta camada.
//
// ─────────────────────────────────────────────────────────────────
// ESTRATÉGIA DE EXTRAÇÃO: BUSCA POR NOME, NÃO POR CAMINHO
//
// O layout do eSocial mudou entre versões (S-1.0, S-1.1, S-1.2) e a
// profundidade de aninhamento varia. Caminho rígido quebra em silêncio numa
// versão diferente e devolve zero evento sem dizer por quê.
//
// Aqui a extração busca o elemento pelo nome local em qualquer profundidade
// dentro do evento, ignorando namespace. É mais tolerante e, quando um campo
// não é encontrado, o registro é descartado com motivo explícito em vez de
// entrar incompleto.
// ─────────────────────────────────────────────────────────────────

/** Tipos de evento SST que este parser reconhece. */
export type TipoEventoSst = 'S-2230' | 'S-2210' | 'S-2220' | 'S-2240';

/**
 * Afastamento normalizado.
 *
 * `cid` e `codMotivo` existem para o operador CONFERIR na tela antes de
 * confirmar. Nenhum dos dois é enviado ao servidor — ver `paraIngestao()`.
 */
export interface AfastamentoCanonico {
  cpf: string;
  /** ISO YYYY-MM-DD. */
  dataInicio: string;
  /** Capítulo do CID-10: uma letra. É só isto que o banco guarda. */
  capitulo: string;
  dias: number;
  /** CID completo. Fica no navegador, para conferência humana. */
  cid: string;
  /** Código do motivo de afastamento (Tabela 18). Ver nota abaixo. */
  codMotivo: string | null;
}

export interface ContagemPorTipo {
  tipo: TipoEventoSst;
  rotulo: string;
  quantidade: number;
}

export interface Descarte {
  motivo: string;
  quantidade: number;
}

export interface ResultadoParse {
  afastamentos: AfastamentoCanonico[];
  /** Total de eventos SST encontrados no arquivo, de qualquer tipo. */
  eventosLidos: number;
  /** Reconhecidos, sem destino nesta versão. */
  semDestino: ContagemPorTipo[];
  /** Não aproveitáveis, com o motivo. */
  descartes: Descarte[];
  /** Preenchido quando o arquivo não é XML válido ou não tem evento SST. */
  erro?: string;
}

const EVENTOS: Record<string, { tipo: TipoEventoSst; rotulo: string }> = {
  evtafasttemp: { tipo: 'S-2230', rotulo: 'Afastamento temporário' },
  evtcat:       { tipo: 'S-2210', rotulo: 'Comunicação de acidente de trabalho' },
  evtmonit:     { tipo: 'S-2220', rotulo: 'Monitoramento da saúde do trabalhador' },
  evtexprisco:  { tipo: 'S-2240', rotulo: 'Condições ambientais / agentes nocivos' },
};

// ─── Utilidades de leitura de XML ────────────────────────────────

/** Primeiro descendente com este nome local, em qualquer namespace. */
function texto(raiz: Element, nome: string): string | null {
  const el = raiz.getElementsByTagNameNS('*', nome)[0];
  const v = el?.textContent?.trim();
  return v ? v : null;
}

/** Todos os descendentes com este nome local. */
function todos(raiz: Element, nome: string): Element[] {
  return Array.from(raiz.getElementsByTagNameNS('*', nome));
}

function somenteDigitos(v: string | null): string {
  return (v ?? '').replace(/\D/g, '');
}

/** Dias entre duas datas ISO, contando as duas pontas. */
function diasEntre(inicioIso: string, fimIso: string): number | null {
  const ini = Date.parse(`${inicioIso}T00:00:00Z`);
  const fim = Date.parse(`${fimIso}T00:00:00Z`);
  if (Number.isNaN(ini) || Number.isNaN(fim) || fim < ini) return null;
  return Math.round((fim - ini) / 86_400_000) + 1;
}

function dataIsoValida(v: string | null): string | null {
  if (!v) return null;
  // O eSocial usa YYYY-MM-DD; alguns exportadores anexam hora.
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  return Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) ? null : iso;
}

// ─── Extração do S-2230 ──────────────────────────────────────────

interface ExtracaoAfastamento {
  registro?: AfastamentoCanonico;
  descarte?: string;
}

function extrairAfastamento(ev: Element): ExtracaoAfastamento {
  const cpf = somenteDigitos(texto(ev, 'cpfTrab'));
  if (cpf.length !== 11) {
    return { descarte: 'CPF do trabalhador ausente ou inválido' };
  }

  const dataInicio = dataIsoValida(texto(ev, 'dtIniAfast'));
  if (!dataInicio) {
    // Evento de FIM de afastamento isolado (só dtTermAfast) cai aqui. É
    // legítimo no eSocial: a empresa envia início e fim em eventos
    // separados. Sem o início não há o que contabilizar.
    return { descarte: 'Evento sem data de início (provável fim de afastamento isolado)' };
  }

  const atestados = todos(ev, 'infoAtestado');
  if (atestados.length === 0) {
    // Licença-maternidade, serviço militar e afins não têm atestado com CID.
    // São afastamento, mas não indicam risco de saúde — fora do eixo.
    return { descarte: 'Afastamento sem atestado/CID (não se aplica ao eixo de capítulo)' };
  }

  const cid = (texto(atestados[0], 'codCID') ?? '').toUpperCase().trim();
  const capitulo = cid.charAt(0);
  if (!/^[A-Z]$/.test(capitulo)) {
    return { descarte: 'CID ausente ou fora do padrão CID-10' };
  }

  // Dias: soma dos atestados quando declarado (prorrogação vem como
  // atestado adicional). Sem declaração, calcula pelo término.
  let dias = 0;
  for (const at of atestados) {
    const n = Number.parseInt(somenteDigitos(texto(at, 'qtdDiasAfast')) || '0', 10);
    if (Number.isFinite(n)) dias += n;
  }

  if (dias <= 0) {
    const fim = dataIsoValida(texto(ev, 'dtTermAfast'));
    const calculado = fim ? diasEntre(dataInicio, fim) : null;
    if (!calculado) {
      // Afastamento em aberto: entra quando o fim for declarado.
      return { descarte: 'Duração não declarada e sem data de término (afastamento em aberto)' };
    }
    dias = calculado;
  }

  if (dias > 365) {
    return { descarte: 'Duração acima de 365 dias — conferir na origem' };
  }

  return {
    registro: {
      cpf,
      dataInicio,
      capitulo,
      dias,
      cid,
      // NOTA DELIBERADA: o código de motivo é carregado como texto cru e não
      // é traduzido para "ocupacional / não ocupacional". Essa tradução
      // depende da Tabela 18 do layout vigente, e errá-la produziria
      // afirmação de nexo causal — que é determinação legal, não inferência
      // de parser. Confirmar a tabela antes de dar semântica a este campo.
      codMotivo: texto(ev, 'codMotAfast'),
    },
  };
}

// ─── Entrada principal ───────────────────────────────────────────

/**
 * Lê um arquivo XML do eSocial — evento único ou lote — e devolve os
 * afastamentos normalizados junto do que foi reconhecido e do que foi
 * descartado.
 *
 * Nunca lança: erro de formato volta em `erro` para a tela mostrar.
 */
export function parseEsocialSst(xml: string): ResultadoParse {
  const vazio: ResultadoParse = {
    afastamentos: [], eventosLidos: 0, semDestino: [], descartes: [],
  };

  if (!xml || !xml.trim()) {
    return { ...vazio, erro: 'Arquivo vazio.' };
  }

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, 'text/xml');
  } catch {
    return { ...vazio, erro: 'Não foi possível ler o arquivo como XML.' };
  }

  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { ...vazio, erro: 'XML inválido. Confira se o arquivo não está truncado.' };
  }

  // Um lote traz vários <evento> irmãos; um evento único traz um só. Em
  // ambos os casos o que interessa é todo elemento cujo nome comece por
  // "evt" e esteja no mapa — isso cobre as duas formas sem tratar envelope.
  const elementos = Array.from(doc.getElementsByTagName('*'));
  const eventos = elementos.filter(el => EVENTOS[el.localName.toLowerCase()]);

  if (eventos.length === 0) {
    return {
      ...vazio,
      erro: 'Nenhum evento SST encontrado. Esperado S-2230, S-2210, S-2220 ou S-2240.',
    };
  }

  const afastamentos: AfastamentoCanonico[] = [];
  const semDestino = new Map<TipoEventoSst, ContagemPorTipo>();
  const descartes = new Map<string, number>();

  for (const ev of eventos) {
    const meta = EVENTOS[ev.localName.toLowerCase()];

    if (meta.tipo !== 'S-2230') {
      const atual = semDestino.get(meta.tipo);
      if (atual) atual.quantidade += 1;
      else semDestino.set(meta.tipo, { tipo: meta.tipo, rotulo: meta.rotulo, quantidade: 1 });
      continue;
    }

    const { registro, descarte } = extrairAfastamento(ev);
    if (registro) afastamentos.push(registro);
    else if (descarte) descartes.set(descarte, (descartes.get(descarte) ?? 0) + 1);
  }

  return {
    afastamentos,
    eventosLidos: eventos.length,
    semDestino: [...semDestino.values()].sort((a, b) => b.quantidade - a.quantidade),
    descartes: [...descartes.entries()]
      .map(([motivo, quantidade]) => ({ motivo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade),
  };
}

/**
 * Payload que vai para a RPC.
 *
 * Reduz cada registro a CPF, data, capítulo e dias. O CID completo e o
 * código de motivo ficam no navegador: o servidor não precisa deles, e o que
 * não é enviado não pode ser gravado por descuido depois.
 */
export function paraIngestao(afastamentos: AfastamentoCanonico[]) {
  return afastamentos.map(a => ({
    cpf: a.cpf,
    data_inicio: a.dataInicio,
    capitulo: a.capitulo,
    dias: a.dias,
  }));
}

/** Resumo por capítulo para o operador conferir antes de confirmar. */
export function resumoPorCapitulo(afastamentos: AfastamentoCanonico[]) {
  const mapa = new Map<string, { capitulo: string; eventos: number; dias: number }>();
  for (const a of afastamentos) {
    const atual = mapa.get(a.capitulo);
    if (atual) { atual.eventos += 1; atual.dias += a.dias; }
    else mapa.set(a.capitulo, { capitulo: a.capitulo, eventos: 1, dias: a.dias });
  }
  return [...mapa.values()].sort((x, y) => y.dias - x.dias);
}

/** SHA-256 do conteúdo, para o servidor detectar reenvio do mesmo arquivo. */
export async function hashArquivo(conteudo: string): Promise<string | null> {
  try {
    const bytes = new TextEncoder().encode(conteudo);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // Sem Web Crypto a ingestão continua: a deduplicação por evento
    // (HMAC no banco) já impede contagem dobrada. Perde-se só o aviso
    // amigável de "este arquivo já foi importado".
    return null;
  }
}
