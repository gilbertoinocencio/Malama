// =====================================================
// Fichas de módulo (PDF) — material comercial B2B
//
// Gera as folhas A4 de uma página que vão anexadas ao e-mail para
// empresa cliente. Uma ficha por módulo, de propósito: metabólico e
// saúde mental são conversas comerciais diferentes, com compradores
// diferentes dentro da empresa.
//
//   node docs/materiais/_fonte/gerar-fichas.mjs
//
// Saída: docs/materiais/*.pdf (+ preview-*.png para conferir o layout).
// Precisa de rede na primeira execução — as fontes da marca (Outfit e
// Cormorant Garamond) vêm do Google Fonts. Sem rede o Chromium cai em
// Georgia/sans padrão e a folha sai fora da identidade.
// =====================================================

import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.resolve(AQUI, '..');

const fichas = [
  { html: 'ficha-metabolico.html', pdf: 'Malama-Modulo-Metabolico.pdf', png: 'preview-metabolico.png' },
  { html: 'ficha-mental.html', pdf: 'Malama-Modulo-Saude-Mental.pdf', png: 'preview-mental.png' },
];

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 794, height: 1123 } });

for (const f of fichas) {
  await pagina.goto(pathToFileURL(path.join(AQUI, f.html)).href, { waitUntil: 'networkidle' });
  await pagina.evaluate(() => document.fonts.ready);

  // 297mm a 96dpi = 1123px. O body tem min-height de uma folha, então
  // qualquer valor acima disso significa que o texto vazou pra página 2 —
  // e a ficha só funciona como uma folha só.
  const altura = await pagina.evaluate(() => document.body.scrollHeight);
  const fonteOk = await pagina.evaluate(() => document.fonts.check('300 33pt "Cormorant Garamond"'));

  await pagina.pdf({ path: path.join(SAIDA, f.pdf), format: 'A4', printBackground: true });
  await pagina.screenshot({ path: path.join(AQUI, f.png), fullPage: true });

  console.log(
    `${f.pdf} — ${altura}px / 1123px ${altura > 1123 ? '❌ VAZOU PARA A PÁGINA 2' : '✓'}` +
    ` · fonte da marca: ${fonteOk ? '✓' : '✗ caiu no fallback'}`,
  );
}

await navegador.close();
