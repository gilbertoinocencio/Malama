const fs = require('fs');
const path = require('path');
const glob = require('glob');

const dir = path.join(__dirname, 'src', 'components', 'onboarding-v2');

// Encontrar todos os arquivos *Step.tsx
const files = fs.readdirSync(dir).filter(f => f.endsWith('Step.tsx'));

console.log(`🔍 Found ${files.length} step files to process\n`);

files.forEach(filename => {
  const filePath = path.join(dir, filename);
  let content = fs.readFileSync(filePath, 'utf8');

  // Padrão para remover o div do mascote
  const mascotPattern = /<div className="w-16 h-16 bg-blue-100 dark:bg-blue-900\/30 rounded-full flex items-center justify-center flex-shrink-0">\s*<span className="text-3xl">🦝<\/span>\s*<\/div>/g;

  // Padrão alternativo (algumas variações)
  const mascotPattern2 = /<div className="w-\d+ h-\d+ bg-blue-\d+[^>]*>\s*<span[^>]*>🦝<\/span>\s*<\/div>/g;

  const originalContent = content;

  // Remover mascote
  content = content.replace(mascotPattern, '');
  content = content.replace(mascotPattern2, '');

  // Também remover o gap-4 do flex container que tinha o mascote
  content = content.replace(/flex items-start gap-4/g, 'flex items-start');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ ${filename} - mascote removido`);
  } else {
    console.log(`- ${filename} - sem alterações`);
  }
});

console.log('\n✅ Processo concluído!');
