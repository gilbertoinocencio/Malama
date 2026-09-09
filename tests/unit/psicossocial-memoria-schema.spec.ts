// =====================================================
// Contrato do schema da memória do ciclo
//
// Estes casos leem a migration como texto. Não substituem um teste contra
// um banco real, e não fingem substituir: eles travam as decisões que, se
// removidas numa edição futura, quebrariam isolamento entre empresas ou
// deixariam dado individual entrar no aprendizado — que são exatamente as
// linhas mais fáceis de apagar sem perceber.
//
//   npx playwright test --config playwright.unit.config.ts
// =====================================================

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(raiz, 'supabase', 'migrations', '20260902_memoria_do_ciclo_psicossocial.sql'), 'utf8');

/** Corpo de uma função da migration, para asserção localizada. */
function corpoDaFuncao(nome: string): string {
  const inicio = migration.indexOf(`FUNCTION public.${nome}(`);
  expect(inicio, `função ${nome} não encontrada na migration`).toBeGreaterThan(-1);
  const fim = migration.indexOf('\n$$;', inicio);
  return migration.slice(inicio, fim > inicio ? fim : undefined);
}

// ── 1. Isolamento entre tenants ──────────────────────
test.describe('isolamento entre empresas', () => {
  test('toda tabela nova tem RLS ligada', () => {
    for (const tabela of ['psicossocial_hipoteses', 'psicossocial_resultados_observados']) {
      expect(migration, tabela).toContain(`ALTER TABLE public.${tabela} ENABLE ROW LEVEL SECURITY`);
    }
  });

  test('a leitura do RH é limitada à própria empresa e ao módulo liberado', () => {
    const policies = migration.match(/CREATE POLICY "rh reads own [^"]+"[\s\S]*?\);/g) ?? [];
    expect(policies.length).toBe(2);
    for (const policy of policies) {
      expect(policy).toContain("rh_tem_permissao('plano_acao')");
      expect(policy).toContain('empresa_id IN (SELECT empresa_id FROM public.rh_usuarios WHERE user_id = auth.uid()');
    }
  });

  test('nenhuma tabela nova aceita escrita direta do cliente', () => {
    // A gravação só acontece por RPC, que revalida o vínculo com a empresa.
    expect(migration).not.toMatch(/CREATE POLICY[^;]*FOR (INSERT|UPDATE|DELETE) TO authenticated[^;]*psicossocial_/);
    expect(migration).toContain('Sem policy de escrita: só a RPC abaixo grava.');
  });

  test('registrar hipótese exige que a campanha seja da empresa do usuário', () => {
    const corpo = corpoDaFuncao('rh_registrar_hipoteses');
    expect(corpo).toContain('FROM public.psychosocial_campaigns c');
    expect(corpo).toContain('AND c.empresa_id = v_empresa');
    // Item de outra empresa é pulado, nunca gravado.
    expect(corpo).toContain('CONTINUE;');
  });

  test('registrar resultado exige medida e campanha da empresa do usuário', () => {
    const corpo = corpoDaFuncao('rh_registrar_resultados_observados');
    expect(corpo).toContain('AND p.empresa_id = v_empresa');
    expect(corpo).toContain('AND c.empresa_id = v_empresa');
  });

  test('a empresa vem sempre do JWT, nunca do payload', () => {
    for (const nome of ['rh_registrar_hipoteses', 'rh_registrar_resultados_observados', 'rh_memoria_ciclo']) {
      const corpo = corpoDaFuncao(nome);
      expect(corpo, nome).toContain('FROM public.rh_usuarios WHERE user_id = auth.uid()');
      expect(corpo, nome).not.toMatch(/p_empresa_id|->> 'empresa_id'/);
    }
  });

  test('funções sensíveis fixam search_path e não ficam abertas ao anon', () => {
    for (const nome of ['rh_registrar_hipoteses', 'rh_registrar_resultados_observados',
                        'rh_memoria_ciclo', 'rh_criar_plano_acao']) {
      expect(corpoDaFuncao(nome), nome).toContain('SET search_path = public');
      expect(migration, nome).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${nome}\\(`));
    }
  });
});

// ── 2. Nenhum dado individual entra na memória ───────
test.describe('a memória do ciclo não toca dado individual', () => {
  test('nenhuma consulta lê tabelas de resposta individual', () => {
    // psychosocial_assessments, a view psychosocial_respostas e as
    // respostas anônimas guardam linha por pessoa/resposta. A memória do
    // ciclo trabalha só com o que as RPCs agregadas já publicaram.
    for (const tabela of ['psychosocial_assessments', 'psychosocial_respostas',
                          'psychosocial_anonymous_responses', 'empresa_colaboradores']) {
      expect(migration, tabela).not.toContain(tabela);
    }
  });

  test('nenhuma coluna nova guarda identificador de pessoa', () => {
    const criacoes = migration.match(/CREATE TABLE IF NOT EXISTS public\.psicossocial_[\s\S]*?\n\);/g) ?? [];
    expect(criacoes.length).toBe(2);
    for (const criacao of criacoes) {
      for (const proibido of ['user_id', 'cpf', 'colaborador', 'auth.users']) {
        expect(criacao, proibido).not.toContain(proibido);
      }
    }
  });

  test('o contexto desidentificado não carrega identidade da empresa nem do setor', () => {
    const corpo = migration.slice(
      migration.indexOf('FUNCTION public.psicossocial_contexto_desidentificado'),
      migration.indexOf('-- 2. HIPÓTESES'));
    // Segmento e ramo de atividade sim; nome, CNPJ e nome de setor não.
    expect(corpo).toContain("'segmento'");
    expect(corpo).toContain("'cnae_divisao'");
    expect(corpo).not.toMatch(/'(nome|cnpj|razao_social|setor)',/);
    // Porte entra em faixa: efetivo exato de setor pequeno é quase-identificador.
    expect(corpo).toContain("'porte_setor'");
    expect(corpo).toContain("'ate_9'");
  });
});

// ── 4 e o vínculo inequívoco ─────────────────────────
test.describe('vínculo com o ciclo é inequívoco ou inexistente', () => {
  test('a campanha de base é resolvida a partir da hipótese, no servidor', () => {
    const corpo = corpoDaFuncao('rh_criar_plano_acao__base');
    expect(corpo).toContain('FROM public.psicossocial_hipoteses h');
    expect(corpo).toContain('AND h.empresa_id = v_empresa');
    // Hipótese inexistente ou de outra empresa: a medida nasce SEM vínculo,
    // em vez de ser recusada ou vinculada por aproximação.
    expect(corpo).toContain('p_hipotese_id := NULL;');
    // O cliente não escolhe a campanha: não existe parâmetro para isso.
    expect(corpo).not.toContain('p_campanha_baseline_id');
  });

  test('só medidas com linha de base entram no motor de aprendizado', () => {
    const corpo = corpoDaFuncao('rh_memoria_ciclo');
    expect(corpo).toContain('AND p.campanha_baseline_id IS NOT NULL');
  });

  test('resultado só é gravado para medida com linha de base', () => {
    expect(corpoDaFuncao('rh_registrar_resultados_observados'))
      .toContain('AND p.campanha_baseline_id IS NOT NULL');
  });
});

// ── Vocabulário: nada de causalidade no schema ───────
test.describe('vocabulário do schema', () => {
  test('a migration não introduz o conceito de eficácia', () => {
    // "Eficácia da intervenção" afirmaria relação causal — é justamente o
    // que este desenho evita. O nome correto é resultado observado.
    //
    // A asserção olha o CÓDIGO, não os comentários: a própria migration
    // documenta a proibição citando a palavra, e o comentário que explica a
    // decisão não pode derrubar o teste que a protege.
    const codigo = migration.replace(/--[^\n]*/g, '').toLowerCase();
    expect(codigo).not.toMatch(/efic[áa]cia|efetividade|impacto_da_medida/);
    expect(codigo).toContain('psicossocial_resultados_observados');
  });

  test('a classificação de resultado usa as quatro categorias neutras', () => {
    expect(migration).toContain(
      "CHECK (classificacao IN ('favoravel', 'estavel', 'desfavoravel', 'inconclusivo'))");
  });

  test('a força da evidência é categoria, nunca percentual', () => {
    expect(migration).toContain(
      "CHECK (forca_evidencia IN ('evidencia_insuficiente', 'sinal_inicial',");
    expect(migration).not.toMatch(/confianca\s+(NUMERIC|INT|REAL|FLOAT)/i);
  });
});

// ── 10. Compatibilidade com empresa somente Compliance ──
test.describe('empresa somente Compliance', () => {
  test('nada na memória depende de colaborador cadastrado', () => {
    // No modo somente Compliance não há colaborador: as respostas chegam
    // por link anônimo de setor. Se a memória do ciclo dependesse de
    // empresa_colaboradores, o produto de aquisição ficaria sem a feature.
    expect(migration).not.toContain('empresa_colaboradores');
    const corpo = corpoDaFuncao('rh_memoria_ciclo');
    expect(corpo).toContain('FROM public.empresa_planos_acao p');
    expect(corpo).toContain('JOIN public.psychosocial_campaigns c');
  });

  test('o recorte da memória é sempre setor ou empresa, nunca pessoa', () => {
    for (const tabela of ['psicossocial_hipoteses', 'psicossocial_resultados_observados']) {
      const inicio = migration.indexOf(`CREATE TABLE IF NOT EXISTS public.${tabela}`);
      const criacao = migration.slice(inicio, migration.indexOf('\n);', inicio));
      expect(criacao, tabela).toContain('setor                TEXT');
    }
  });
});
