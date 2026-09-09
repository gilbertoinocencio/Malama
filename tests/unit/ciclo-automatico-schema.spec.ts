// =====================================================
// Contrato do ciclo psicossocial automático
//
// Lê a migração como texto. Não substitui um teste contra banco real — e
// não finge substituir. Ele trava as decisões que, apagadas numa edição
// futura, fariam o motor abrir campanha onde não devia, invalidar cartaz
// impresso ou afrouxar validação que a rota manual aplica.
//
//   npx playwright test --config playwright.unit.config.ts
// =====================================================

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(raiz, 'supabase', 'migrations', '20260903_ciclo_psicossocial_automatico.sql'), 'utf8');

const motor = migration.slice(
  migration.indexOf('FUNCTION public.psicossocial_girar_ciclo'),
  migration.indexOf('-- 4. AGENDAMENTO'));

test.describe('o motor não decide o que é do humano', () => {
  test('nunca cria a PRIMEIRA campanha de um instrumento', () => {
    // Automação continua cadência estabelecida; não decide por uma empresa
    // que ela vai começar a medir.
    expect(motor).toContain("AND c.status = 'encerrada'");
    expect(motor).toMatch(/cad[êe]ncia ESTABELECIDA/i);
  });

  test('herda o recorte da última campanha, não inventa um', () => {
    expect(motor).toContain('setores_anteriores');
    expect(motor).toMatch(/Recorte herdado da [úu]ltima campanha/i);
  });

  test('respeita campanha que o RH cancelou no ciclo corrente', () => {
    // O EXISTS de sobreposição não filtra por status: cancelada conta, e
    // por isso o motor não desfaz a decisão do RH.
    const guarda = motor.slice(motor.indexOf('CONTINUE WHEN EXISTS'));
    expect(guarda).toContain('x.janela_inicio <= v_fim');
    expect(guarda.slice(0, 400)).not.toContain("x.status =");
  });

  test('só abre para empresa ativa e com módulo psicossocial', () => {
    expect(motor).toContain("e.status = 'ativa'");
    expect(motor).toContain('COALESCE(e.modo_compliance, false) OR COALESCE(e.modo_mental, false)');
    // Metabólico sozinho não mede risco psicossocial.
    expect(motor).not.toMatch(/modo_metabolico\s*,\s*false\)\s*\)/);
  });
});

test.describe('automação não afrouxa validação', () => {
  test('exige efetivo informado, como a rota manual', () => {
    expect(motor).toContain('efetivo');
    expect(motor).toMatch(/setor sem efetivo informado/i);
  });

  test('descarta setor arquivado desde o ciclo anterior', () => {
    expect(motor).toContain('AND es.ativo');
    expect(motor).toMatch(/nenhum setor do recorte anterior continua ativo/i);
  });

  test('pendência não vira exceção: registra e segue', () => {
    // Uma empresa mal cadastrada não pode derrubar a virada de ciclo das
    // outras — o cron roda para o banco inteiro numa transação só.
    expect(motor).toContain('v_ignoradas');
    expect(motor).toContain('CONTINUE;');
  });
});

test.describe('roda sem usuário logado', () => {
  test('o motor não usa auth.uid() em decisão nenhuma', () => {
    // Quem chama é o cron. Qualquer auth.uid() aqui devolveria NULL e a
    // função silenciosamente não faria nada.
    expect(motor).not.toContain('auth.uid()');
  });

  test('não fica exposto a cliente', () => {
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.psicossocial_girar_ciclo() FROM PUBLIC, anon, authenticated');
  });

  test('é agendado e a primeira execução acontece na migração', () => {
    expect(migration).toContain("cron.schedule(\n    'psicossocial-girar-ciclo'");
    expect(migration).toContain('SELECT public.psicossocial_girar_ciclo();');
    // Reagendar não duplica o job.
    expect(migration).toContain("cron.unschedule('psicossocial-girar-ciclo')");
  });
});

test.describe('o cartaz da parede sobrevive à virada de ciclo', () => {
  test('o token resolve a campanha ABERTA, não a de origem', () => {
    // Sem isto, abrir campanha nova todo mês mataria todo QR code impresso.
    const resolver = migration.slice(
      migration.indexOf('FUNCTION public.campanha_vigente_do_token'),
      migration.indexOf('CREATE OR REPLACE FUNCTION public.campanha_por_link_setor'));
    expect(resolver).toContain("c.status = 'aberta'");
    expect(resolver).toContain('c.empresa_id = o.empresa_id');
    expect(resolver).toContain('c.instrument = o.instrument');
  });

  test('token não atravessa o recorte da campanha', () => {
    // Campanha que mira só alguns setores não pode ser respondida pelo
    // link de um setor fora do alvo.
    const resolver = migration.slice(
      migration.indexOf('FUNCTION public.campanha_vigente_do_token'),
      migration.indexOf('CREATE OR REPLACE FUNCTION public.campanha_por_link_setor'));
    expect(resolver).toContain('c.setores IS NULL');
    expect(resolver).toContain('unnest(c.setores)');
  });

  test('as duas rotas públicas passam pelo mesmo resolvedor', () => {
    for (const fn of ['campanha_por_link_setor', 'responder_por_link_setor']) {
      const corpo = migration.slice(migration.indexOf(`FUNCTION public.${fn}`));
      expect(corpo.slice(0, 2500), fn).toContain('campanha_vigente_do_token(p_token)');
    }
  });

  test('a janela continua sendo validada na resposta', () => {
    const corpo = migration.slice(migration.indexOf('FUNCTION public.responder_por_link_setor'));
    expect(corpo).toContain('CURRENT_DATE < v_inicio OR CURRENT_DATE > v_fim');
  });

  test('o RH recebe o token estável, não um novo a cada ciclo', () => {
    const lista = migration.slice(
      migration.indexOf('FUNCTION public.rh_campanha_links_setor__base'),
      migration.indexOf('-- Recria o wrapper'));
    // Só cria token para setor que ainda não tem um nesta empresa/instrumento.
    expect(lista).toContain('WHERE NOT EXISTS');
    expect(lista).toContain('c.instrument = v_camp.instrument');
  });
});

test.describe('encerramento', () => {
  test('só encerra o que a janela já fechou', () => {
    expect(motor).toContain("WHERE status = 'aberta'");
    expect(motor).toContain('AND janela_fim < CURRENT_DATE');
  });

  test('a data de encerramento é a do ciclo, não a do cron', () => {
    // encerrada_em ancora o cálculo da próxima medição: usar now() faria o
    // ciclo pertencer ao dia em que o cron passou, não ao mês coletado.
    expect(motor).toContain("encerrada_em = (janela_fim + INTERVAL '1 day' - INTERVAL '1 second')");
  });
});
