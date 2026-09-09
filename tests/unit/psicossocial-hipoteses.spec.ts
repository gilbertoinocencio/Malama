// =====================================================
// Motor de hipóteses — o que vale investigar
//
//   npx playwright test --config playwright.unit.config.ts
// =====================================================

import { test, expect } from '@playwright/test';
import {
  gerarHipoteses, ciclosComSinal,
  type ContextoHipoteses, type RecorrenciaItem,
} from '../../supabase/functions/_shared/psicossocial-hipoteses.ts';
import { calcularTendencias } from '../../supabase/functions/_shared/rh-briefing.ts';

// Leitura agregada como o rh-agent a monta. Note o que NÃO existe aqui:
// nenhum user_id, nome, resposta individual ou vínculo com colaborador —
// o motor não tem como usar dado individual porque nunca o recebe.
const leituraPadrao = () => ({
  campanhas_encerradas: {
    who5: { id: 'campanha-who5-2', janela_fim: '2026-06-30' },
    jss: { id: 'campanha-jss-2', janela_fim: '2026-06-30' },
  },
  ultimos_relatorios: {
    who5: {
      periodo: { inicio: '2026-06-01', fim: '2026-06-30' },
      geral: { n_respondentes: 30, score_medio: 52, faixa_reduzido: 11, faixa_risco: 3 },
      setores: [{ setor: 'Cozinha', n_respondentes: 9, score_medio: 40 }],
    },
    jss: {
      periodo: { inicio: '2026-04-01', fim: '2026-06-30' },
      geral: { n_respondentes: 30, indice_medio: 60, demanda_medio: 70, controle_medio: 45, apoio_medio: 55 },
      setores: [{ setor: 'Cozinha', n_respondentes: 9, indice: 72, demanda: 82, controle: 38, apoio: 50 }],
    },
    matriz: {
      periodo: { inicio: '2026-01-01', fim: '2026-06-30' },
      comparaveis: 4,
      setores: [
        { setor: 'Cozinha', quadrante: 'risco_ocupacional',
          bemestar: { score_medio: 40 }, exposicao: { indice: 72, demanda: 82, controle: 38, apoio: 50 } },
        { setor: 'Salão', quadrante: 'estavel',
          bemestar: { score_medio: 68 }, exposicao: { indice: 48, demanda: 55, controle: 60, apoio: 70 } },
      ],
    },
  },
  relatorios_anteriores: {
    who5: { geral: { n_respondentes: 28, score_medio: 60 } },
    jss: { geral: { n_respondentes: 28, demanda_medio: 60, controle_medio: 45, apoio_medio: 55 } },
  },
});

const contexto = (over: Partial<ContextoHipoteses> = {}): ContextoHipoteses => {
  const leitura = over.leitura ?? leituraPadrao();
  return {
    leitura,
    tendencias: calcularTendencias(leitura),
    campanhaPorInstrumento: {
      who5: leitura?.campanhas_encerradas?.who5?.id ?? null,
      jss: leitura?.campanhas_encerradas?.jss?.id ?? null,
    },
    recorrencia: [],
    ...over,
  };
};

// ── 5. Comparação de ciclos vira hipótese ────────────
test.describe('origem das hipóteses', () => {
  test('indicador que piorou entre coletas vira hipótese da empresa', () => {
    const hipoteses = gerarHipoteses(contexto());
    const demanda = hipoteses.find(h => h.setor === null && h.indicador === 'jss_demanda');
    expect(demanda).toBeTruthy();
    expect(demanda!.origem).toBe('tendencia_interna');
    expect(demanda!.campanha_baseline_id).toBe('campanha-jss-2');
    expect(demanda!.por_que_foi_sugerida).toContain('60 → 70');
  });

  test('setor em risco ocupacional vira hipótese do componente com maior afastamento', () => {
    // Cozinha: demanda 82 vs 70 (gap 12), controle 38 vs 45 (gap 7),
    // apoio 50 vs 55 (gap 5) → demanda vence deterministicamente.
    const hipoteses = gerarHipoteses(contexto());
    const cozinha = hipoteses.find(h => h.setor === 'Cozinha');
    expect(cozinha).toBeTruthy();
    expect(cozinha!.indicador).toBe('jss_demanda');
    expect(cozinha!.origem).toBe('regra_deterministica');
  });

  test('setor fora do quadrante de risco não gera hipótese', () => {
    expect(gerarHipoteses(contexto()).some(h => h.setor === 'Salão')).toBe(false);
  });

  test('indicador estável não gera hipótese', () => {
    // Controle e apoio não se moveram entre as coletas do fixture.
    const geraisEstaveis = gerarHipoteses(contexto())
      .filter(h => h.setor === null && ['jss_controle', 'jss_apoio'].includes(h.indicador));
    expect(geraisEstaveis).toHaveLength(0);
  });

  test('mesma entrada produz sempre a mesma saída', () => {
    // Determinismo é o que permite o upsert idempotente por ciclo.
    expect(JSON.stringify(gerarHipoteses(contexto())))
      .toBe(JSON.stringify(gerarHipoteses(contexto())));
  });
});

// ── 7 e 8. Recomendação com e sem histórico ──────────
test.describe('força da evidência acompanha o histórico disponível', () => {
  const forcaDe = (recorrencia: RecorrenciaItem[]) =>
    gerarHipoteses(contexto({ recorrencia }))
      .find(h => h.setor === null && h.indicador === 'jss_demanda')!.forca_evidencia;

  test('sem histórico anterior, o sinal é apenas inicial', () => {
    expect(forcaDe([])).toBe('sinal_inicial');
  });

  test('com um ciclo anterior registrado, vira padrão recorrente', () => {
    expect(forcaDe([{ setor: null, indicador: 'jss_demanda', campanhas: ['campanha-jss-1'] }]))
      .toBe('padrao_recorrente');
  });

  test('com dois ciclos anteriores, vira padrão consistente', () => {
    expect(forcaDe([{ setor: null, indicador: 'jss_demanda', campanhas: ['campanha-jss-1', 'campanha-jss-0'] }]))
      .toBe('padrao_consistente');
  });

  test('o ciclo atual não é contado duas vezes', () => {
    // O upsert é idempotente: reprocessar o mesmo ciclo não pode promover
    // um sinal inicial a padrão recorrente.
    expect(forcaDe([{ setor: null, indicador: 'jss_demanda', campanhas: ['campanha-jss-2'] }]))
      .toBe('sinal_inicial');
    expect(ciclosComSinal(
      [{ setor: null, indicador: 'jss_demanda', campanhas: ['campanha-jss-2'] }],
      null, 'jss_demanda', 'campanha-jss-2')).toBe(1);
  });

  test('a recorrência de um setor não contamina outro recorte', () => {
    const historicoDeOutroSetor: RecorrenciaItem[] = [
      { setor: 'Salão', indicador: 'jss_demanda', campanhas: ['campanha-jss-1', 'campanha-jss-0'] },
    ];
    expect(forcaDe(historicoDeOutroSetor)).toBe('sinal_inicial');
  });

  test('recorte abaixo do piso é evidência insuficiente, por mais que se repita', () => {
    const leitura = leituraPadrao();
    leitura.relatorios_anteriores.jss.geral.n_respondentes = 3;
    const hipotese = gerarHipoteses(contexto({
      leitura,
      recorrencia: [{ setor: null, indicador: 'jss_demanda', campanhas: ['c1', 'c0'] }],
    })).find(h => h.setor === null && h.indicador === 'jss_demanda');
    expect(hipotese!.forca_evidencia).toBe('evidencia_insuficiente');
  });
});

// ── 7. Sem base, não inventa ─────────────────────────
test.describe('ausência de dados devolve lista vazia', () => {
  test('sem coleta anterior e sem matriz, nenhuma hipótese', () => {
    const leitura: any = leituraPadrao();
    leitura.relatorios_anteriores = { who5: null, jss: null };
    leitura.ultimos_relatorios.matriz = null;
    expect(gerarHipoteses(contexto({ leitura }))).toHaveLength(0);
  });

  test('sem campanha encerrada não há a que vincular a hipótese', () => {
    const leitura: any = leituraPadrao();
    leitura.campanhas_encerradas = { who5: null, jss: null };
    expect(gerarHipoteses(contexto({ leitura }))).toHaveLength(0);
  });

  test('agregado geral suprimido não gera hipótese de setor', () => {
    const leitura: any = leituraPadrao();
    leitura.ultimos_relatorios.jss.geral = { dados_suprimidos: true, n_respondentes: 3 };
    expect(gerarHipoteses(contexto({ leitura })).some(h => h.setor !== null)).toBe(false);
  });
});

// ── 2. Nenhum dado individual no motor ───────────────
test.describe('o motor só enxerga agregado', () => {
  test('a saída não contém identificador de pessoa', () => {
    const serializado = JSON.stringify(gerarHipoteses(contexto()));
    for (const proibido of ['user_id', 'cpf', 'email', 'colaborador', 'answers', 'raw_score']) {
      expect(serializado.toLowerCase()).not.toContain(proibido);
    }
  });

  test('as evidências citadas são sempre agregados com n', () => {
    for (const hipotese of gerarHipoteses(contexto())) {
      expect(hipotese.evidencias.length).toBeGreaterThan(0);
      for (const evidencia of hipotese.evidencias) {
        expect(evidencia).toHaveProperty('n');
        expect(typeof evidencia.descricao).toBe('string');
      }
    }
  });
});

// ── 4. Hipótese não afirma causa ─────────────────────
test.describe('linguagem das hipóteses', () => {
  test('descreve compatibilidade, nunca atribuição de causa', () => {
    const PROIBIDO = [
      /\ba causa (é|e|foi)\b/i, /\bcausa disso\b/i, /\bcausou\b/i, /efic[áa]cia/i,
      /\bcomprova\b/i, /\bprova que\b/i, /\bdiagn[óo]stico de\b/i, /\bdevido a\b/i,
    ];
    for (const hipotese of gerarHipoteses(contexto())) {
      const texto = `${hipotese.descricao} ${hipotese.por_que_foi_sugerida}`;
      for (const proibido of PROIBIDO) {
        expect(texto, `"${texto}" casou com ${proibido}`).not.toMatch(proibido);
      }
      expect(texto).toMatch(/compat[íi]vel com/i);
    }
  });

  test('toda hipótese traz perguntas de validação e caminhos possíveis', () => {
    for (const hipotese of gerarHipoteses(contexto())) {
      expect(hipotese.perguntas_validacao.length).toBeGreaterThan(0);
      expect(hipotese.caminhos_possiveis.length).toBeGreaterThan(0);
    }
  });

  test('prioriza fonte e organização antes de cuidado individual', () => {
    // Hierarquia de controle da NR-1: individual sozinho não encerra risco
    // de fonte, então não pode ser o primeiro caminho oferecido.
    for (const hipotese of gerarHipoteses(contexto())) {
      expect(hipotese.caminhos_possiveis[0].nivel_controle).not.toBe('individual');
    }
  });
});

// ── 10. Empresa somente Compliance ───────────────────
test.describe('empresa somente Compliance', () => {
  test('funciona com agregados vindos de links anônimos por setor', () => {
    // Nesse modo não há colaborador cadastrado: as respostas chegam por
    // link anônimo e o único recorte é o setor. O motor não pede nada além
    // disso — se pedisse, o modo Compliance ficaria sem inteligência.
    const leitura: any = leituraPadrao();
    delete leitura.ultimos_relatorios.who5;
    leitura.relatorios_anteriores.who5 = null;

    const hipoteses = gerarHipoteses(contexto({ leitura }));
    expect(hipoteses.length).toBeGreaterThan(0);
    expect(hipoteses.every(h => h.instrumento === 'jss')).toBe(true);
    expect(hipoteses.some(h => h.setor === 'Cozinha')).toBe(true);
  });
});
