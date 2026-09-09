// =====================================================
// Motor de resultado observado — comparação entre ciclos
//
// Roda no runner que o projeto já usa (Playwright), sem browser e sem
// banco: são funções puras.
//   npx playwright test --config playwright.unit.config.ts
// =====================================================

import { test, expect } from '@playwright/test';
import {
  calcularResultadoObservado, execucaoDaMedida,
  type EntradaResultado,
} from '../../supabase/functions/_shared/psicossocial-resultado.ts';
import { CONFIG_APRENDIZADO } from '../../supabase/functions/_shared/psicossocial-logica.ts';

/** Par de coletas confortavelmente comparável; cada teste muda uma peça. */
const entradaBase = (over: Partial<EntradaResultado> = {}): EntradaResultado => ({
  planoAcaoId: 'plano-1',
  campanhaFollowupId: 'campanha-2',
  indicador: 'jss_demanda',
  setor: 'Cozinha',
  baseline: { valor: 70, n: 20, data: '2026-03-31' },
  followup: { valor: 58, n: 22, data: '2026-06-30' },
  execucao: 'executada',
  ...over,
});

// ── 3. Direção correta das métricas ──────────────────
// WHO-5, controle e apoio melhoram quando SOBEM; demanda melhora quando CAI.
// Estas regras vêm dos instrumentos e não podem ser alteradas sem evidência
// na escala — este teste existe para que uma "simplificação" futura não as
// unifique por engano.
test.describe('direção favorável de cada indicador', () => {
  test('demanda que cai é favorável e demanda que sobe é desfavorável', () => {
    const caiu = calcularResultadoObservado(entradaBase());
    expect(caiu.favoravel_quando).toBe('cai');
    expect(caiu.classificacao).toBe('favoravel');

    const subiu = calcularResultadoObservado(entradaBase({
      baseline: { valor: 58, n: 20, data: '2026-03-31' },
      followup: { valor: 70, n: 22, data: '2026-06-30' },
    }));
    expect(subiu.classificacao).toBe('desfavoravel');
  });

  test('WHO-5, controle e apoio que sobem são favoráveis', () => {
    for (const indicador of ['who5_score', 'jss_controle', 'jss_apoio'] as const) {
      const resultado = calcularResultadoObservado(entradaBase({
        indicador,
        baseline: { valor: 45, n: 20, data: '2026-03-31' },
        followup: { valor: 60, n: 22, data: '2026-06-30' },
      }));
      expect(resultado.favoravel_quando, indicador).toBe('sobe');
      expect(resultado.classificacao, indicador).toBe('favoravel');
    }
  });

  test('variação abaixo do limiar de relevância é estável, não melhora', () => {
    const resultado = calcularResultadoObservado(entradaBase({
      followup: { valor: 70 - (CONFIG_APRENDIZADO.LIMIAR_VARIACAO_RELEVANTE - 1), n: 22, data: '2026-06-30' },
    }));
    expect(resultado.classificacao).toBe('estavel');
  });
});

// ── 5. Comparação de ciclos ──────────────────────────
test.describe('comparação entre a linha de base e o ciclo seguinte', () => {
  test('calcula delta, intervalo e preserva os dois números', () => {
    const resultado = calcularResultadoObservado(entradaBase());
    expect(resultado.valor_baseline).toBe(70);
    expect(resultado.valor_followup).toBe(58);
    expect(resultado.delta).toBe(-12);
    expect(resultado.intervalo_dias).toBe(91);
    expect(resultado.comparabilidade).toBe('comparavel');
  });

  test('grava a versão da lógica que produziu o registro', () => {
    // Sem isso, mudar uma regra reescreveria a leitura do passado sem rastro.
    expect(calcularResultadoObservado(entradaBase()).logica_versao).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

// ── 6. Inconclusivo quando os dados não são comparáveis ──
test.describe('resultado inconclusivo', () => {
  test('intervalo curto demais entre as coletas', () => {
    const resultado = calcularResultadoObservado(entradaBase({
      followup: { valor: 40, n: 22, data: '2026-04-05' },
    }));
    expect(resultado.comparabilidade).toBe('intervalo_insuficiente');
    expect(resultado.classificacao).toBe('inconclusivo');
  });

  test('participação divergente demais entre as coletas', () => {
    // 20 → 45 respondentes: a média deixa de retratar o mesmo grupo, mesmo
    // com o delta parecendo excelente.
    const resultado = calcularResultadoObservado(entradaBase({
      followup: { valor: 30, n: 45, data: '2026-06-30' },
    }));
    expect(resultado.comparabilidade).toBe('participacao_divergente');
    expect(resultado.classificacao).toBe('inconclusivo');
  });

  test('medida sem linha de base não produz comparação', () => {
    const resultado = calcularResultadoObservado(entradaBase({
      baseline: { valor: null, n: null, data: null },
    }));
    expect(resultado.comparabilidade).toBe('sem_linha_de_base');
    expect(resultado.classificacao).toBe('inconclusivo');
  });

  test('delta favorável não sobrepõe a falta de comparabilidade', () => {
    // A ordem das checagens importa: comparabilidade primeiro. É exatamente
    // no caso "delta ótimo, dado ruim" que a leitura enganaria.
    const resultado = calcularResultadoObservado(entradaBase({
      followup: { valor: 10, n: 22, data: '2026-04-02' },
    }));
    expect(resultado.delta).toBe(-60);
    expect(resultado.classificacao).toBe('inconclusivo');
  });
});

// ── 9. Piso de anonimato ─────────────────────────────
test.describe('piso de anonimato', () => {
  test('recorte suprimido pelo banco vira inconclusivo, nunca estimativa', () => {
    const resultado = calcularResultadoObservado(entradaBase({
      followup: { valor: null, n: null, data: '2026-06-30' },
    }));
    expect(resultado.comparabilidade).toBe('dado_suprimido');
    expect(resultado.classificacao).toBe('inconclusivo');
    expect(resultado.valor_followup).toBeNull();
  });

  test('amostra abaixo do piso não é classificada', () => {
    const resultado = calcularResultadoObservado(entradaBase({
      followup: { valor: 58, n: CONFIG_APRENDIZADO.MIN_RESPONDENTES - 1, data: '2026-06-30' },
    }));
    expect(resultado.comparabilidade).toBe('amostra_insuficiente');
    expect(resultado.classificacao).toBe('inconclusivo');
  });

  test('o piso do motor acompanha o k_min aplicado dentro do banco', () => {
    expect(CONFIG_APRENDIZADO.MIN_RESPONDENTES).toBe(5);
  });
});

// ── 4. Nunca afirmar causalidade ─────────────────────
test.describe('linguagem: correlação não vira causalidade', () => {
  const PROIBIDO = [
    /efic[áa]cia/i, /\bcausou\b/i, /\bcausa\b/i, /devido a/i, /gra[çc]as a/i,
    /por causa/i, /\breduziu o risco\b/i, /\bimpacto da medida\b/i,
    /\bcomprova\b/i, /\bprova que\b/i, /grupo de controle/i,
  ];

  test('nenhuma narrativa atribui o movimento à medida', () => {
    const cenarios: EntradaResultado[] = [
      entradaBase(),
      entradaBase({ execucao: 'nao_executada' }),
      entradaBase({ execucao: 'em_andamento' }),
      entradaBase({ execucao: 'cancelada' }),
      entradaBase({ followup: { valor: 90, n: 22, data: '2026-06-30' } }),
      entradaBase({ baseline: { valor: null, n: null, data: null } }),
    ];
    for (const cenario of cenarios) {
      const { narrativa } = calcularResultadoObservado(cenario);
      for (const proibido of PROIBIDO) {
        expect(narrativa, `"${narrativa}" casou com ${proibido}`).not.toMatch(proibido);
      }
    }
  });

  test('resultado favorável é redigido como movimento do indicador', () => {
    const { narrativa } = calcularResultadoObservado(entradaBase());
    expect(narrativa).toContain('Após a implantação da medida');
    expect(narrativa).toContain('passou de 70 para 58');
    // A ressalva não é decorativa: é ela que impede a frase de ser lida
    // como atribuição de efeito.
    expect(narrativa).toContain('não que a medida tenha produzido o resultado');
  });

  test('medida não executada é observação descritiva, não contrafactual', () => {
    const { narrativa } = calcularResultadoObservado(entradaBase({ execucao: 'nao_executada' }));
    expect(narrativa).toContain('Sem registro de execução da medida');
    expect(narrativa).toContain('não funciona como comparação controlada');
  });
});

test.describe('estado de execução derivado do quadro', () => {
  test('só conclui como executada com data de conclusão', () => {
    expect(execucaoDaMedida('concluida', '2026-05-10')).toBe('executada');
    expect(execucaoDaMedida('concluida', null)).toBe('nao_executada');
    expect(execucaoDaMedida('em_andamento', null)).toBe('em_andamento');
    expect(execucaoDaMedida('planejada', null)).toBe('nao_executada');
    expect(execucaoDaMedida('cancelada', null)).toBe('cancelada');
  });
});
