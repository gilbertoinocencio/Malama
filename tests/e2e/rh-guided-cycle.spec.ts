import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const appUrl = process.env.RH_E2E_APP_URL ?? 'http://127.0.0.1:4173';
const email = process.env.RH_E2E_EMAIL ?? 'nalu@n.com';
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe('Portal do RH — jornada guiada', () => {
  test.skip(!supabaseUrl || !anonKey || !serviceRole, 'Credenciais de teste do Supabase não configuradas.');

  test.beforeEach(async ({ page }) => {
    const admin = createClient(supabaseUrl!, serviceRole!, { auth: { persistSession: false } });
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${appUrl}/rh/dashboard` },
    });
    const token = data.properties?.hashed_token;
    if (error || !token) throw error ?? new Error('Token de acesso não gerado.');

    const auth = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } });
    const { data: sessao, error: erroSessao } = await auth.auth.verifyOtp({ token_hash: token, type: 'magiclink' });
    if (erroSessao || !sessao.session) throw erroSessao ?? new Error('Sessão de teste não criada.');

    const projectRef = new URL(supabaseUrl!).hostname.split('.')[0];
    await page.goto(appUrl);
    await page.evaluate(({ chave, valor }) => localStorage.setItem(chave, valor), {
      chave: `sb-${projectRef}-auth-token`,
      valor: JSON.stringify(sessao.session),
    });
    await page.goto(`${appUrl}/rh/dashboard`);
    await page.waitForLoadState('networkidle');

    // A apresentação de primeiro acesso é uma sobreposição, e cada teste roda
    // num contexto novo (localStorage limpo) — ou seja, ela SEMPRE aparece
    // aqui. Estes testes descrevem o painel de quem já usa, então fechamos a
    // apresentação como o usuário faria; o clique também grava a marca de
    // "já vista", e ela não volta nas navegações seguintes do mesmo teste.
    const apresentacao = page.getByRole('dialog', { name: /A NR-1 não pede um documento/i });
    if (await apresentacao.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Fechar apresentação' }).click();
      await expect(apresentacao).toBeHidden();
    }
  });

  test('conduz dashboard, cadência e conversa com a liderança', async ({ page }) => {
    await expect(page.getByText('Seu próximo passo')).toBeVisible();

    // O trilho substituiu o checklist de preparação, que sumia ao completar
    // e deixava o RH sem noção de onde estava no ciclo. A etapa marcada como
    // atual sai de `proximoPasso().etapa`, então esta asserção também protege
    // o acoplamento entre o card e o trilho.
    const trilho = page.locator('section[aria-labelledby="trilho-titulo"]');
    await expect(trilho).toBeVisible();
    await expect(trilho.locator('[aria-current="step"]')).toHaveCount(1);
    await expect(trilho.getByText(/\d+ de \d+ etapas cumpridas/)).toBeVisible();

    await page.goto(`${appUrl}/rh/saude-mental`);
    await expect(page.getByRole('heading', { name: 'Ciclo de cuidado da empresa' })).toBeVisible();
    await expect(page.getByText('WHO-5 mensal')).toBeVisible();
    await expect(page.getByText('JSS trimestral')).toBeVisible();
    await expect(page.getByText(/não aguardam esse calendário/i)).toBeVisible();

    await page.goto(`${appUrl}/rh/saude-mental?nova=1&instrumento=jss`);
    await expect(page.locator('select').first()).toHaveValue('jss');
    await expect(page.getByRole('option', { name: /sugerido a cada 3 meses/i })).toBeAttached();

    await page.goto(`${appUrl}/rh/plano-acao?visao=lideranca&nova=1&setor=Compras`);
    await expect(page.getByRole('heading', { name: 'Iniciar jornada de liderança' })).toBeVisible();
    await expect(page.locator('select').first()).toHaveValue('Compras');
    await expect(page.getByLabel('O que precisa melhorar')).not.toHaveValue('');
  });

  test('mantém a orientação legível no celular', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${appUrl}/rh/saude-mental`);
    await expect(page.getByText('WHO-5 mensal')).toBeVisible();
    await expect(page.getByText('JSS trimestral')).toBeVisible();
    const larguraOk = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(larguraOk).toBeTruthy();
  });

  test('mostra prazo, alerta e verificação dos marcos de liderança', async ({ page }) => {
    await page.goto(`${appUrl}/rh/dashboard`);
    await expect(page.getByText(/marco\(s\) de liderança pedem acompanhamento/i)).toBeVisible();

    await page.goto(`${appUrl}/rh/plano-acao?visao=lideranca`);
    await expect(page.getByText(/Depois de verificar o combinado/i)).toBeVisible();
    const cartao = page.getByRole('button').filter({ hasText: /RH:/ }).first();
    await expect(cartao).toBeVisible();
    await cartao.click();
    await expect(page.getByText(/Prazo combinado com a liderança/i)).toBeVisible();

    const verificar = page.getByRole('button', { name: /Verificar combinado/i });
    if (await verificar.isVisible()) {
      await verificar.click();
      await expect(page.getByRole('heading', { name: /Verificar combinado/i })).toBeVisible();
      await expect(page.getByText('Combinado realizado')).toBeVisible();
      await expect(page.getByText('Realizado em parte')).toBeVisible();
      await expect(page.getByLabel('Registro da conversa')).toBeVisible();
      await page.getByRole('button', { name: 'Cancelar' }).click();
    } else {
      await expect(page.getByText(/pronto para avançar/i)).toBeVisible();
    }
  });
});
