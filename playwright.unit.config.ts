import { defineConfig } from '@playwright/test';

// Testes de LÓGICA PURA (sem browser, sem servidor, sem banco).
//
// Rodam no runner que o projeto já usa — nenhum framework de teste novo foi
// adicionado ao package.json só por causa destes casos.
//
//   npx playwright test --config playwright.unit.config.ts
export default defineConfig({
  testDir: './tests/unit',
  fullyParallel: true,
  reporter: 'list',
  // Sem `projects` com browser e sem `webServer`: estes specs não abrem
  // página nenhuma, então subir o preview seria só lentidão.
});
