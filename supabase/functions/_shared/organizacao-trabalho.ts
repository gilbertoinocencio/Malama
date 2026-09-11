// =====================================================
// Malama — Organização do trabalho: enums e sanitização (lado servidor)
//
// Espelho de src/lib/organizacaoTrabalho.ts (o runtime é outro, não dá para
// importar). Tudo que o copiloto recebe sobre organização passa por aqui:
// valor fora do enum é descartado, texto é cortado. É o que garante que um
// campo de perfil não vire instrução para o modelo.
// =====================================================

export const EVENTOS_12M = [
  'demissoes_coletivas', 'troca_gestao', 'sistema_novo', 'expansao_rapida',
  'incidente_grave', 'fusao_aquisicao', 'reestruturacao', 'nenhum',
] as const;
export const LIDERANCA_FORMAL = ['todos_setores', 'maioria', 'poucos', 'nenhum'] as const;
export const PESSOAS_POR_LIDER = ['ate_8', 'de_9_a_15', 'de_16_a_30', 'mais_de_30', 'varia'] as const;
export const VINCULOS = ['clt', 'temporario', 'terceirizado', 'pj', 'estagiario', 'aprendiz'] as const;
export const HORA_EXTRA = ['nao', 'alguns_setores', 'rotina'] as const;
export const ESCALAS = ['comercial', '6x1', '5x2', '12x36', 'revezamento', 'flexivel', 'outra'] as const;
export const REMUNERACAO_VARIAVEL = ['nao', 'alguns_setores', 'maioria'] as const;
export const SST_EXISTENTE = [
  'sesmt_proprio', 'sesmt_terceirizado', 'cipa', 'pgr_vigente',
  'medicina_trabalho', 'psicologo', 'canal_denuncia', 'nenhum',
] as const;
export const CONTATO_PUBLICO = ['nenhum', 'indireto', 'presencial', 'exposicao_agressao'] as const;
export const RITMO_DITADO_POR = ['cliente', 'maquina_sistema', 'meta', 'lideranca', 'propria_equipe'] as const;
export const CONDICOES_FISICAS = ['em_pe', 'esforco_fisico', 'calor', 'frio', 'ruido', 'repetitivo', 'dirige'] as const;
export const ESCALA_PREVISIVEL = ['sim', 'parcial', 'nao'] as const;

export type OrganizacaoEmpresa = {
  eventos_12m: string[];
  eventos_12m_detalhe: string | null;
  lideranca_formal: string | null;
  pessoas_por_lider: string | null;
  troca_lideranca_12m: boolean | null;
  vinculos: string[];
  vinculo_predominante: string | null;
  hora_extra: string | null;
  banco_de_horas: boolean | null;
  escala_predominante: string | null;
  remuneracao_variavel: string | null;
  remuneracao_variavel_setores: string[];
  sst_existente: string[];
};

export type OrganizacaoSetor = {
  contato_publico: string | null;
  ritmo_ditado_por: string[];
  condicoes_fisicas: string[];
  escala: string | null;
  escala_previsivel: string | null;
  pico_meses: number[];
  pico_descricao: string | null;
  lider_formal: boolean | null;
  meta_individual: boolean | null;
};

const umDe = (v: unknown, enumeracao: readonly string[]): string | null =>
  typeof v === 'string' && enumeracao.includes(v) ? v : null;
const variosDe = (v: unknown, enumeracao: readonly string[], max = 12): string[] =>
  Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && enumeracao.includes(x)))].slice(0, max) as string[] : [];
const booleano = (v: unknown): boolean | null => typeof v === 'boolean' ? v : null;
const textoCurto = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
const nomes = (v: unknown, max: number): string[] =>
  Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).map(x => (x as string).trim().slice(0, 60)).slice(0, max) : [];

export function organizacaoEmpresaSegura(value: unknown): OrganizacaoEmpresa | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  const org: OrganizacaoEmpresa = {
    eventos_12m: variosDe(o.eventos_12m, EVENTOS_12M),
    eventos_12m_detalhe: textoCurto(o.eventos_12m_detalhe, 500),
    lideranca_formal: umDe(o.lideranca_formal, LIDERANCA_FORMAL),
    pessoas_por_lider: umDe(o.pessoas_por_lider, PESSOAS_POR_LIDER),
    troca_lideranca_12m: booleano(o.troca_lideranca_12m),
    vinculos: variosDe(o.vinculos, VINCULOS),
    vinculo_predominante: umDe(o.vinculo_predominante, VINCULOS),
    hora_extra: umDe(o.hora_extra, HORA_EXTRA),
    banco_de_horas: booleano(o.banco_de_horas),
    escala_predominante: umDe(o.escala_predominante, ESCALAS),
    remuneracao_variavel: umDe(o.remuneracao_variavel, REMUNERACAO_VARIAVEL),
    remuneracao_variavel_setores: nomes(o.remuneracao_variavel_setores, 50),
    sst_existente: variosDe(o.sst_existente, SST_EXISTENTE),
  };
  const vazia = !org.eventos_12m.length && !org.lideranca_formal && !org.vinculos.length
    && !org.hora_extra && !org.escala_predominante && !org.remuneracao_variavel && !org.sst_existente.length;
  return vazia ? null : org;
}

export function organizacaoSetorSegura(value: unknown): OrganizacaoSetor | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  const org: OrganizacaoSetor = {
    contato_publico: umDe(o.contato_publico, CONTATO_PUBLICO),
    ritmo_ditado_por: variosDe(o.ritmo_ditado_por, RITMO_DITADO_POR),
    condicoes_fisicas: variosDe(o.condicoes_fisicas, CONDICOES_FISICAS),
    escala: umDe(o.escala, ESCALAS),
    escala_previsivel: umDe(o.escala_previsivel, ESCALA_PREVISIVEL),
    pico_meses: Array.isArray(o.pico_meses)
      ? ([...new Set(o.pico_meses.filter(m => Number.isInteger(m) && (m as number) >= 1 && (m as number) <= 12))] as number[])
          .sort((a, b) => a - b)
      : [],
    pico_descricao: textoCurto(o.pico_descricao, 200),
    lider_formal: booleano(o.lider_formal),
    meta_individual: booleano(o.meta_individual),
  };
  const vazia = !org.contato_publico && !org.ritmo_ditado_por.length && !org.condicoes_fisicas.length
    && !org.escala && !org.escala_previsivel && !org.pico_meses.length && !org.pico_descricao
    && org.lider_formal === null && org.meta_individual === null;
  return vazia ? null : org;
}

/** Rótulos curtos para o modelo citar sem inventar vocabulário. */
const ROTULO: Record<string, string> = {
  nenhum: 'sem contato com público', indireto: 'contato indireto com público (telefone/chat)',
  presencial: 'atendimento presencial ao público', exposicao_agressao: 'atendimento presencial com exposição a agressão',
  cliente: 'ritmo ditado pelo cliente', maquina_sistema: 'ritmo ditado por máquina/sistema', meta: 'ritmo ditado por meta',
  lideranca: 'ritmo ditado pela liderança', propria_equipe: 'ritmo definido pela própria equipe',
  em_pe: 'trabalho em pé', esforco_fisico: 'esforço físico', calor: 'calor', frio: 'frio', ruido: 'ruído',
  repetitivo: 'movimento repetitivo', dirige: 'dirige veículo',
  comercial: 'horário comercial', revezamento: 'turnos em revezamento', flexivel: 'escala flexível', outra: 'outra escala',
  sim: 'escala previsível', parcial: 'escala parcialmente previsível', nao: 'escala muda em cima da hora',
};
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function descreverOrganizacaoSetor(o: OrganizacaoSetor): string {
  const partes: string[] = [];
  if (o.escala) partes.push(ROTULO[o.escala] ?? `escala ${o.escala}`);
  if (o.escala_previsivel) partes.push(ROTULO[o.escala_previsivel]);
  if (o.contato_publico) partes.push(ROTULO[o.contato_publico]);
  if (o.ritmo_ditado_por.length) partes.push(o.ritmo_ditado_por.map(r => ROTULO[r]).join('; '));
  if (o.condicoes_fisicas.length) partes.push(`condições físicas: ${o.condicoes_fisicas.map(c => ROTULO[c]).join(', ')}`);
  if (o.pico_meses.length) partes.push(`pico em ${o.pico_meses.map(m => MESES[m - 1]).join('/')}`);
  if (o.pico_descricao) partes.push(`pico declarado: ${o.pico_descricao}`);
  if (o.lider_formal === false) partes.push('sem líder formal');
  if (o.lider_formal === true) partes.push('com líder formal');
  if (o.meta_individual === true) partes.push('meta individual');
  return partes.join(' · ');
}
