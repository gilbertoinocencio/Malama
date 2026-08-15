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
  });

  test('conduz dashboard, cadência e conversa com a liderança', async ({ page }) => {
    await expect(page.getByText('Seu próximo passo')).toBeVisible();
    await expect(page.getByText('Preparação do painel')).toBeVisible();

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
});
