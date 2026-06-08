// =====================================================
// Malama — Exportar /empresas como PDF
// Uso: node scripts/export-empresas-pdf.mjs
//
// Pré-requisito: npm run dev rodando em localhost:5173
// =====================================================

import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'exports');
// Aceita porta via argumento: node export-empresas-pdf.mjs 3002
const PORT = process.argv[2] ?? '3002';
const URL = `http://localhost:${PORT}/empresas`;

// Nome do arquivo com data
const date = new Date().toISOString().slice(0, 10);
const OUT_FILE = join(OUT_DIR, `malama-empresas-${date}.pdf`);

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  console.log('🚀 Iniciando exportação da landing /empresas...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Viewport largo para o layout desktop
  await page.setViewportSize({ width: 1440, height: 900 });

  console.log(`📄 Abrindo ${URL}...`);
  await page.goto(URL, { waitUntil: 'networkidle' });

  // Aguarda logo e fontes carregarem
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Força todas as seções animadas a aparecerem (dispensa scroll manual)
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      [style*="opacity: 0"], [style*="opacity:0"] {
        opacity: 1 !important;
      }
      /* Garante fundos coloridos no print */
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    `,
  });

  // Injeta CSS específico para impressão: oculta header fixo e garante quebras de página limpas
  await page.addStyleTag({
    content: `
      header { display: none !important; }
      section { page-break-inside: avoid; break-inside: avoid; }
      @page { margin: 0; }
    `,
  });

  // Aguarda imagens (logo)
  await page.waitForTimeout(1500);

  console.log('📑 Gerando PDF...');
  await page.pdf({
    path: OUT_FILE,
    format: 'A4',
    printBackground: true,   // preserva fundos coloridos
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    scale: 0.72,              // escala para caber o layout desktop em A4
  });

  await browser.close();

  console.log(`✅ PDF gerado com sucesso!`);
  console.log(`📁 Salvo em: ${OUT_FILE}`);
})();
