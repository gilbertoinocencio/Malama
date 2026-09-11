// =====================================================
// Malama — Contexto temporal do ciclo psicossocial
//
// O copiloto sempre soube a DATA de cada campanha; o que faltava era saber
// o que aquela data significa para aquela empresa. Quatro calendários se
// sobrepõem: clima (estação, por região), calendário do setor econômico
// (divisão CNAE), pico declarado por setor e eventos da própria empresa.
//
// Tudo aqui é determinístico e serve para NOMEAR confundidores, nunca para
// dispensar medida: sazonalidade explica "por que agora", e um pico que
// se repete todo ano é exatamente o risco previsível que a NR-1 pede que
// se controle.
// =====================================================

import type { OrganizacaoSetor } from './organizacao-trabalho.ts';

export type Estacao = 'verao' | 'outono' | 'inverno' | 'primavera';
export type Regiao = 'norte' | 'nordeste' | 'centro_oeste' | 'sudeste' | 'sul';

export type CalendarioSetorial = { meses: number[]; rotulo: string };

export type JanelaCampanha = {
  id: string | null;
  instrumento: string | null;
  inicio: string | null;
  fim: string | null;
};

export type ContextoTemporal = {
  hoje: string;
  mes_atual: number;
  estacao_atual: Estacao;
  regiao: Regiao | null;
  uf: string | null;
  clima_nota: string | null;
  /** Meses de pico do setor econômico (calendário por divisão CNAE). */
  meses_de_pico_setorial: number[];
  calendario_setorial: CalendarioSetorial[];
  /** Setores com pico declarado, por mês. */
  setores_com_pico: { setor: string; meses: number[]; descricao: string | null }[];
  campanhas: {
    id: string | null;
    instrumento: string | null;
    janela: { inicio: string | null; fim: string | null };
    estacao: Estacao | null;
    em_pico_setorial: boolean;
    setores_em_pico_declarado: string[];
    calor_provavel: boolean;
  }[];
  /** Próximo mês de pico (setorial ou declarado) a partir de hoje. */
  proximo_pico: { mes: number; em_meses: number; origem: 'setorial' | 'declarado'; setores: string[] } | null;
};

/** Hemisfério sul, por mês civil — suficiente para o que o copiloto faz. */
export function estacaoDoMes(mes: number): Estacao {
  if (mes === 12 || mes <= 2) return 'verao';
  if (mes <= 5) return 'outono';
  if (mes <= 8) return 'inverno';
  return 'primavera';
}

const REGIAO_POR_UF: Record<string, Regiao> = {
  AC: 'norte', AM: 'norte', AP: 'norte', PA: 'norte', RO: 'norte', RR: 'norte', TO: 'norte',
  AL: 'nordeste', BA: 'nordeste', CE: 'nordeste', MA: 'nordeste', PB: 'nordeste', PE: 'nordeste',
  PI: 'nordeste', RN: 'nordeste', SE: 'nordeste',
  DF: 'centro_oeste', GO: 'centro_oeste', MT: 'centro_oeste', MS: 'centro_oeste',
  ES: 'sudeste', MG: 'sudeste', RJ: 'sudeste', SP: 'sudeste',
  PR: 'sul', RS: 'sul', SC: 'sul',
};

const CLIMA_NOTA: Record<Regiao, string> = {
  norte: 'Clima equatorial: calor o ano todo; o que muda é chuva (dez–mai) e seca (jun–nov). "Estação" ali é chuva/seca, não verão/inverno.',
  nordeste: 'Calor na maior parte do ano; litoral com chuvas no outono/inverno, interior seco. Verão intensifica calor em ambientes fechados.',
  centro_oeste: 'Seca marcada de maio a setembro (ar seco, calor no fim da seca) e chuvas no verão.',
  sudeste: 'Verão quente e chuvoso (dez–mar), inverno ameno e seco; ondas de calor em jan–fev pesam em cozinhas, galpões e trabalho externo.',
  sul: 'Estações bem marcadas: verão quente, inverno frio de verdade (jun–ago). Frio e umidade pesam em trabalho externo e em pé.',
};

export function regiaoDaUf(uf: string | null | undefined): Regiao | null {
  if (!uf) return null;
  return REGIAO_POR_UF[uf.toUpperCase()] ?? null;
}

/** Meses civis cobertos por uma janela (inclusive). */
function mesesDaJanela(inicio: string | null, fim: string | null): number[] {
  const a = inicio ? new Date(`${inicio}T00:00:00Z`) : null;
  const b = fim ? new Date(`${fim}T00:00:00Z`) : null;
  if (!a || !b || Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return [];
  const meses = new Set<number>();
  const cursor = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1));
  let guarda = 0;
  while (cursor <= b && guarda++ < 24) {
    meses.add(cursor.getUTCMonth() + 1);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return [...meses];
}

/** Estação predominante de uma janela: a do mês central. */
function estacaoDaJanela(inicio: string | null, fim: string | null): Estacao | null {
  const a = inicio ? Date.parse(`${inicio}T00:00:00Z`) : NaN;
  const b = fim ? Date.parse(`${fim}T00:00:00Z`) : NaN;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const meio = new Date((a + b) / 2);
  return estacaoDoMes(meio.getUTCMonth() + 1);
}

export function calcularContextoTemporal(entrada: {
  hoje?: Date;
  uf: string | null;
  calendarioSetorial: CalendarioSetorial[];
  setores: { nome: string; organizacao: OrganizacaoSetor | null }[];
  campanhas: JanelaCampanha[];
}): ContextoTemporal {
  const hoje = entrada.hoje ?? new Date();
  const mesAtual = hoje.getUTCMonth() + 1;
  const regiao = regiaoDaUf(entrada.uf);
  const calendario = entrada.calendarioSetorial.filter(c => Array.isArray(c.meses) && c.meses.length > 0);
  const mesesSetoriais = [...new Set(calendario.flatMap(c => c.meses))].sort((x, y) => x - y);

  const setoresComPico = entrada.setores
    .filter(s => s.organizacao?.pico_meses?.length)
    .map(s => ({ setor: s.nome, meses: s.organizacao!.pico_meses, descricao: s.organizacao!.pico_descricao }));

  const setoresComCalor = new Set(entrada.setores
    .filter(s => s.organizacao?.condicoes_fisicas?.includes('calor'))
    .map(s => s.nome));

  const campanhas = entrada.campanhas.map(c => {
    const meses = mesesDaJanela(c.inicio, c.fim);
    const estacao = estacaoDaJanela(c.inicio, c.fim);
    const emPicoSetorial = meses.some(m => mesesSetoriais.includes(m));
    const setoresEmPico = setoresComPico
      .filter(s => s.meses.some(m => meses.includes(m)))
      .map(s => s.setor);
    // Calor "provável": verão (ou região quente o ano todo) E algum setor
    // declarou calor. Não é medição — é o gatilho para o copiloto lembrar
    // que parte do sinal pode ser agente físico.
    const epocaQuente = estacao === 'verao' || regiao === 'norte' || regiao === 'nordeste';
    return {
      id: c.id,
      instrumento: c.instrumento,
      janela: { inicio: c.inicio, fim: c.fim },
      estacao,
      em_pico_setorial: emPicoSetorial,
      setores_em_pico_declarado: setoresEmPico,
      calor_provavel: epocaQuente && setoresComCalor.size > 0,
    };
  });

  // Próximo pico a partir de hoje (inclusive o mês atual).
  let proximo: ContextoTemporal['proximo_pico'] = null;
  for (let delta = 0; delta < 12; delta++) {
    const mes = ((mesAtual - 1 + delta) % 12) + 1;
    const declarados = setoresComPico.filter(s => s.meses.includes(mes)).map(s => s.setor);
    if (declarados.length) { proximo = { mes, em_meses: delta, origem: 'declarado', setores: declarados }; break; }
    if (mesesSetoriais.includes(mes)) { proximo = { mes, em_meses: delta, origem: 'setorial', setores: [] }; break; }
  }

  return {
    hoje: hoje.toISOString().slice(0, 10),
    mes_atual: mesAtual,
    estacao_atual: estacaoDoMes(mesAtual),
    regiao,
    uf: entrada.uf ? entrada.uf.toUpperCase() : null,
    clima_nota: regiao ? CLIMA_NOTA[regiao] : null,
    meses_de_pico_setorial: mesesSetoriais,
    calendario_setorial: calendario,
    setores_com_pico: setoresComPico,
    campanhas,
    proximo_pico: proximo,
  };
}

export type ComparabilidadeSazonal = 'mesma_epoca' | 'estacoes_diferentes' | 'pico_vs_fora_de_pico' | 'indeterminada';

/**
 * Comparar janeiro com agosto numa cozinha é comparar pico com vale. Esta
 * classificação existe para o copiloto NOMEAR isso antes de chamar uma
 * variação de melhora ou piora.
 */
export function classificarComparabilidade(
  temporal: ContextoTemporal,
  atual: { inicio: string | null; fim: string | null },
  anterior: { inicio: string | null; fim: string | null },
): ComparabilidadeSazonal {
  const ea = estacaoDaJanela(atual.inicio, atual.fim);
  const eb = estacaoDaJanela(anterior.inicio, anterior.fim);
  if (!ea || !eb) return 'indeterminada';
  const picos = new Set([
    ...temporal.meses_de_pico_setorial,
    ...temporal.setores_com_pico.flatMap(s => s.meses),
  ]);
  const emPico = (j: { inicio: string | null; fim: string | null }) =>
    mesesDaJanela(j.inicio, j.fim).some(m => picos.has(m));
  if (picos.size > 0 && emPico(atual) !== emPico(anterior)) return 'pico_vs_fora_de_pico';
  if (ea !== eb) return 'estacoes_diferentes';
  return 'mesma_epoca';
}

export const NOME_ESTACAO: Record<Estacao, string> = {
  verao: 'verão', outono: 'outono', inverno: 'inverno', primavera: 'primavera',
};
export const NOME_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
