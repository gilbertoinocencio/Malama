// =====================================================
// Malama — Organização do trabalho (empresa e setor)
//
// Fonte única dos enums, rótulos de tela e tipos usados pelo onboarding,
// pelo cadastro de setores e pelo resumo na área da empresa. O servidor
// valida os mesmos valores (migration 20260912 e
// supabase/functions/_shared/organizacao-trabalho.ts) — um valor fora
// daqui é recusado na RPC.
//
// São perguntas DESCRITIVAS: descrevem como o trabalho é organizado, não
// avaliam risco. É o que permite ao copiloto transformar "JSS alta na
// Cozinha" em hipótese com contexto (escala, pico, contato com público)
// em vez de "a Cozinha está ruim".
// =====================================================

export const EVENTOS_12M = {
  demissoes_coletivas: 'Demissões em grupo',
  troca_gestao: 'Troca de dono, diretoria ou gestão',
  sistema_novo: 'Sistema ou processo novo',
  expansao_rapida: 'Crescimento rápido de equipe ou unidades',
  incidente_grave: 'Acidente ou incidente grave',
  fusao_aquisicao: 'Fusão ou aquisição',
  reestruturacao: 'Reestruturação de áreas',
  nenhum: 'Nada relevante',
} as const;

export const LIDERANCA_FORMAL = {
  todos_setores: 'Todos os setores têm líder formal',
  maioria: 'A maioria tem',
  poucos: 'Poucos têm',
  nenhum: 'Não há líderes formais por setor',
} as const;

export const PESSOAS_POR_LIDER = {
  ate_8: 'Até 8',
  de_9_a_15: '9 a 15',
  de_16_a_30: '16 a 30',
  mais_de_30: 'Mais de 30',
  varia: 'Varia muito',
} as const;

export const VINCULOS = {
  clt: 'CLT',
  temporario: 'Temporário',
  terceirizado: 'Terceirizado',
  pj: 'PJ',
  estagiario: 'Estagiário',
  aprendiz: 'Aprendiz',
} as const;

export const HORA_EXTRA = {
  nao: 'Não é rotina',
  alguns_setores: 'Rotina em alguns setores',
  rotina: 'Rotina na empresa toda',
} as const;

export const ESCALAS = {
  comercial: 'Horário comercial',
  '6x1': '6x1',
  '5x2': '5x2',
  '12x36': '12x36',
  revezamento: 'Turnos em revezamento',
  flexivel: 'Flexível',
  outra: 'Outra',
} as const;

export const REMUNERACAO_VARIAVEL = {
  nao: 'Não',
  alguns_setores: 'Em alguns setores',
  maioria: 'Na maioria',
} as const;

export const SST_EXISTENTE = {
  sesmt_proprio: 'SESMT próprio',
  sesmt_terceirizado: 'SESMT terceirizado',
  cipa: 'CIPA',
  pgr_vigente: 'PGR vigente',
  medicina_trabalho: 'Medicina do trabalho / PCMSO',
  psicologo: 'Psicólogo ou apoio psicológico',
  canal_denuncia: 'Canal de denúncia',
  nenhum: 'Nenhum destes ainda',
} as const;

export const CONTATO_PUBLICO = {
  nenhum: 'Sem contato com público',
  indireto: 'Indireto (telefone, chat)',
  presencial: 'Presencial (balcão, atendimento)',
  exposicao_agressao: 'Presencial com exposição a agressão',
} as const;

export const RITMO_DITADO_POR = {
  cliente: 'Cliente ou fila',
  maquina_sistema: 'Máquina ou sistema',
  meta: 'Meta',
  lideranca: 'Liderança',
  propria_equipe: 'A própria equipe',
} as const;

export const CONDICOES_FISICAS = {
  em_pe: 'Trabalho em pé',
  esforco_fisico: 'Esforço físico',
  calor: 'Calor',
  frio: 'Frio',
  ruido: 'Ruído',
  repetitivo: 'Movimento repetitivo',
  dirige: 'Dirige veículo',
} as const;

export const ESCALA_PREVISIVEL = {
  sim: 'Sim, com antecedência',
  parcial: 'Em parte',
  nao: 'Muda em cima da hora',
} as const;

export const MESES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

export type Evento12m = keyof typeof EVENTOS_12M;
export type LiderancaFormal = keyof typeof LIDERANCA_FORMAL;
export type PessoasPorLider = keyof typeof PESSOAS_POR_LIDER;
export type Vinculo = keyof typeof VINCULOS;
export type HoraExtra = keyof typeof HORA_EXTRA;
export type Escala = keyof typeof ESCALAS;
export type RemuneracaoVariavel = keyof typeof REMUNERACAO_VARIAVEL;
export type SstExistente = keyof typeof SST_EXISTENTE;
export type ContatoPublico = keyof typeof CONTATO_PUBLICO;
export type RitmoDitadoPor = keyof typeof RITMO_DITADO_POR;
export type CondicaoFisica = keyof typeof CONDICOES_FISICAS;
export type EscalaPrevisivel = keyof typeof ESCALA_PREVISIVEL;

export type OrganizacaoEmpresa = {
  eventos_12m?: Evento12m[];
  eventos_12m_detalhe?: string | null;
  lideranca_formal?: LiderancaFormal | null;
  pessoas_por_lider?: PessoasPorLider | null;
  troca_lideranca_12m?: boolean | null;
  vinculos?: Vinculo[];
  vinculo_predominante?: Vinculo | null;
  hora_extra?: HoraExtra | null;
  banco_de_horas?: boolean | null;
  escala_predominante?: Escala | null;
  remuneracao_variavel?: RemuneracaoVariavel | null;
  remuneracao_variavel_setores?: string[];
  sst_existente?: SstExistente[];
};

export type OrganizacaoSetor = {
  contato_publico?: ContatoPublico | null;
  ritmo_ditado_por?: RitmoDitadoPor[];
  condicoes_fisicas?: CondicaoFisica[];
  escala?: Escala | null;
  escala_previsivel?: EscalaPrevisivel | null;
  pico_meses?: number[];
  pico_descricao?: string | null;
  lider_formal?: boolean | null;
  meta_individual?: boolean | null;
};

export const ORGANIZACAO_EMPRESA_VAZIA: OrganizacaoEmpresa = {
  eventos_12m: [], eventos_12m_detalhe: null, lideranca_formal: null, pessoas_por_lider: null,
  troca_lideranca_12m: null, vinculos: [], vinculo_predominante: null, hora_extra: null,
  banco_de_horas: null, escala_predominante: null, remuneracao_variavel: null,
  remuneracao_variavel_setores: [], sst_existente: [],
};

export const ORGANIZACAO_SETOR_VAZIA: OrganizacaoSetor = {
  contato_publico: null, ritmo_ditado_por: [], condicoes_fisicas: [], escala: null,
  escala_previsivel: null, pico_meses: [], pico_descricao: null, lider_formal: null,
  meta_individual: null,
};

/** Quantos campos da organização da empresa foram respondidos. */
export function organizacaoEmpresaPreenchida(o: OrganizacaoEmpresa | null | undefined): number {
  if (!o) return 0;
  let n = 0;
  if (o.eventos_12m?.length) n++;
  if (o.lideranca_formal) n++;
  if (o.vinculos?.length) n++;
  if (o.hora_extra) n++;
  if (o.remuneracao_variavel) n++;
  if (o.sst_existente?.length) n++;
  return n;
}

export function organizacaoSetorPreenchida(o: OrganizacaoSetor | null | undefined): boolean {
  if (!o) return false;
  return !!(o.contato_publico || o.ritmo_ditado_por?.length || o.condicoes_fisicas?.length
    || o.escala || o.escala_previsivel || o.pico_meses?.length || o.pico_descricao
    || o.lider_formal != null || o.meta_individual != null);
}

/** Uma linha para a lista de setores. */
export function resumoOrganizacaoSetor(o: OrganizacaoSetor | null | undefined): string {
  if (!o) return '';
  const partes: string[] = [];
  if (o.escala) partes.push(ESCALAS[o.escala]);
  if (o.contato_publico && o.contato_publico !== 'nenhum') partes.push(CONTATO_PUBLICO[o.contato_publico].toLowerCase());
  if (o.condicoes_fisicas?.length) partes.push(o.condicoes_fisicas.map(c => CONDICOES_FISICAS[c].toLowerCase()).join(', '));
  if (o.pico_meses?.length) partes.push(`pico ${o.pico_meses.map(m => MESES[m - 1]).join('/')}`);
  if (o.lider_formal === false) partes.push('sem líder formal');
  return partes.join(' · ');
}
