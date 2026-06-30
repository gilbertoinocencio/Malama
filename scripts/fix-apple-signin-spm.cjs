/**
 * Ajuste de compatibilidade SPM para o Sign in with Apple no Capacitor 8.
 *
 * O plugin @capacitor-community/apple-sign-in (v7.1.0, última publicada) fixa
 * `capacitor-swift-pm` em `from: "7.0.0"` (ou seja, >=7.0.0 <8.0.0). O restante
 * do app está no Capacitor 8, então a resolução de pacotes Swift falha com:
 *   'apple-sign-in' depends on 'capacitor-swift-pm' 7.0.0..<8.0.0
 *   and 'haptics' depends on 'capacitor-swift-pm' 8.0.0..<9.0.0
 *
 * Este script roda no postinstall e relaxa a restrição para 8.x, alinhando com
 * o resto do projeto. O código Swift do plugin (wrapper de ASAuthorizationController)
 * é compatível com a API do Capacitor 8.
 *
 * Não há versão 8 desse plugin publicada — por isso o ajuste é feito aqui.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(
  __dirname,
  '..',
  'node_modules',
  '@capacitor-community',
  'apple-sign-in',
  'Package.swift'
);

try {
  if (!fs.existsSync(file)) {
    console.log('[fix-apple-signin-spm] Package.swift não encontrado (plugin ausente) — ignorando.');
    process.exit(0);
  }
  const original = fs.readFileSync(file, 'utf8');
  const patched = original.replace('from: "7.0.0"', 'from: "8.0.0"');
  if (patched !== original) {
    fs.writeFileSync(file, patched);
    console.log('[fix-apple-signin-spm] Package.swift ajustado para capacitor-swift-pm 8.x.');
  } else {
    console.log('[fix-apple-signin-spm] nada a ajustar (já em 8.x ou conteúdo mudou).');
  }
} catch (err) {
  console.warn('[fix-apple-signin-spm] aviso:', err.message);
}
