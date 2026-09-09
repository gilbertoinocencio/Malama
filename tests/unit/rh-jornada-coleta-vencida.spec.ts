// =====================================================
// Jornada do RH — coleta com janela vencida
//
// Regressão real vista em produção: uma campanha WHO-5 com janela até
// 31/08 aparecia em 09/09 como "Em andamento", com a frase "Janela aberta
// até 31/08/2026" — futuro do pretérito na mesma linha.
//
// O rótulo errado era o sintoma. O problema é que toda leitura agregada
// (relatório, tendência, hipótese) só considera campanha ENCERRADA: com a
// janela vencida e o status ainda 'aberta', o ciclo fica parado exibindo
// selo verde.
//
// Desde 20260903_ciclo_psicossocial_automatico um cron diário encerra e
// reabre sozinho, então este estado é RARO. Estes testes seguem valendo
// como rede de segurança: se o agendamento falhar, o painel tem que dizer
// a verdade em vez de mentir em verde.
//
//   npx playwright test --config playwright.unit.config.ts
// =====================================================

import { test, expect } from '@playwright/test';
import {
  proximoPasso, ritmoDoCiclo, ritmoInstrumento, type DadosJornada,
} from '../../src/lib/rhJornada';

const HOJE = new Date('2026-09-09T10:00:00');

const campanha = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  instrument: 'who5',
  instrument_nome: 'Índice de Bem-Estar WHO-5',
  eixo: 'bemestar' as const,
  janela_inicio: '2026-08-01',
  janela_fim: '2026-08-31',
  setores: null,
  status: 'aberta' as const,
  encerrada_em: null,
  created_at: '2026-08-01T00:00:00Z',
  n_convidados: 42,
  n_respondentes: 4,
  ...over,
}) as any;

const dados = (over: Partial<DadosJornada> = {}): DadosJornada => ({
  empresaAtiva: true,
  somenteCompliance: false,
  nSetores: 6,
  nSetoresSemEfetivo: 0,
  nColaboradores: 42,
  campanhas: [campanha()],
  ciclos: [],
  planos: [],
  documentos: [],
  pode: {
    colaboradores: true, saudeMental: true, planoAcao: true, empresa: true,
    importar: true, veCampanhas: true, vePlanos: true,
  },
  ...over,
});

test.describe('janela vencida com campanha ainda aberta', () => {
  test('não é tratada como coleta em andamento', () => {
    const r = ritmoInstrumento([campanha()], 'who5', 1, HOJE);
    expect(r.situacao).toBe('aguardando_encerramento');
    expect(r.situacao).not.toBe('em_andamento');
  });

  test('a frase não promete uma janela aberta numa data passada', () => {
    const { detalhe } = ritmoInstrumento([campanha()], 'who5', 1, HOJE);
    expect(detalhe).not.toMatch(/aberta at[ée]/i);
    expect(detalhe).toContain('terminou em 31/08/2026');
    // Diz o que destrava o ciclo, não só que acabou.
    expect(detalhe).toMatch(/libera o relat[óo]rio/i);
  });

  test('janela ainda válida continua em andamento', () => {
    const r = ritmoInstrumento([campanha({ janela_fim: '2026-09-30' })], 'who5', 1, HOJE);
    expect(r.situacao).toBe('em_andamento');
    expect(r.detalhe).toContain('Janela aberta até 30/09/2026');
  });

  test('o último dia da janela ainda conta como aberto', () => {
    const r = ritmoInstrumento([campanha({ janela_fim: '2026-09-09' })], 'who5', 1, HOJE);
    expect(r.situacao).toBe('em_andamento');
  });

  test('a ação oferecida é encerrar, nunca preparar uma nova', () => {
    // Preparar mandaria criar uma segunda campanha do mesmo instrumento,
    // que o banco recusa por sobreposição de janela.
    const linha = ritmoDoCiclo(dados(), HOJE).find(i => i.chave === 'who5')!;
    expect(linha.situacao).toBe('aguardando_encerramento');
    expect(linha.acao).toBe('Encerrar coleta');
    expect(linha.destino).toContain('/rh/saude-mental#campanhas');
    expect(linha.destino).not.toContain('nova=1');
  });
});

test.describe('a data curta que vai para dentro do card', () => {
  // `quando` existe para caber no card da leitura inteligente, onde o
  // `detalhe` completo não caberia. Se ele sumir ou vier longo, a agenda
  // volta a ser um paredão de quatro linhas.
  const quandoDe = (chave: string, d = dados()) =>
    ritmoDoCiclo(d, HOJE).find(i => i.chave === chave)!.quando;

  test('coleta em curso mostra quando fecha', () => {
    const emCurso = dados({ campanhas: [campanha({ janela_fim: '2026-09-30' })] });
    expect(quandoDe('who5', emCurso)).toBe('fecha em 30/09/2026');
  });

  test('coleta vencida mostra quando encerrou, não quando fecha', () => {
    expect(quandoDe('who5')).toBe('encerrou em 31/08/2026');
  });

  test('sem coleta aberta, aponta a próxima janela', () => {
    const encerrada = dados({
      campanhas: [campanha({ status: 'encerrada', encerrada_em: '2026-08-31T23:59:59Z' })],
    });
    expect(quandoDe('who5', encerrada)).toMatch(/^a partir de \d{2}\/\d{2}\/\d{4}$/);
  });

  test('é curta o suficiente para caber no card', () => {
    for (const item of ritmoDoCiclo(dados(), HOJE)) {
      if (item.quando) expect(item.quando.length, item.chave).toBeLessThanOrEqual(28);
    }
  });

  test('medida em aberto mostra o prazo mais próximo', () => {
    const comPlano = dados({
      planos: [
        { status: 'planejada', prazo: '2026-12-01', atrasada: false },
        { status: 'em_andamento', prazo: '2026-10-15', atrasada: false },
      ] as any,
    });
    expect(quandoDe('plano', comPlano)).toBe('prazo em 15/10/2026');
  });
});

test.describe('a jornada conduz para encerrar', () => {
  test('o próximo passo manda encerrar a coleta', () => {
    const passo = proximoPasso(dados(), HOJE);
    expect(passo.titulo).toMatch(/encerre a coleta/i);
    expect(passo.acao).toBe('Encerrar coleta');
    expect(passo.etapa).toBe('medir');
    // NÃO bloqueia a jornada: o cron resolve isso em horas, e travar tudo
    // por algo que se corrige sozinho seria alarme falso.
    expect(passo.bloqueio).toBeFalsy();
  });

  test('passa na frente de medida atrasada', () => {
    // Não contradiz a regra que prioriza medida vencida sobre ABRIR
    // avaliação nova: aqui não se abre nada, fecha-se o que já foi coletado
    // — e é isso que libera a leitura que sustenta a discussão da medida.
    const comAtraso = dados({
      planos: [{ atrasada: true, status: 'planejada' }] as any,
    });
    expect(proximoPasso(comAtraso, HOJE).titulo).toMatch(/encerre a coleta/i);
  });

  test('com a janela ainda aberta, o passo volta a ser acompanhar', () => {
    const emCurso = dados({ campanhas: [campanha({ janela_fim: '2026-09-30' })] });
    expect(proximoPasso(emCurso, HOJE).titulo).not.toMatch(/encerre a coleta/i);
  });

  test('nenhum texto do passo fala de fechamento no futuro', () => {
    const { titulo, descricao } = proximoPasso(dados(), HOJE);
    expect(`${titulo} ${descricao}`).not.toMatch(/fecha em|est[áa] fechando/i);
    expect(descricao).toContain('fechou em 31/08/2026');
  });
});
