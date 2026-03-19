import fs from 'fs';
import path from 'path';

const dir = 'c:/Users/DELL/Desktop/projetos/Nura/src/components/onboarding-stitch';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

let totalFixed = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Count HTML comments
  const matches = content.match(/<!--[\s\S]*?-->/g);
  if (matches && matches.length > 0) {
    // Replace <!-- ... --> with {/* ... */}
    content = content.replace(/<!--\s*([\s\S]*?)\s*-->/g, '{/* $1 */}');
    
    // Also fix fixed headers that the auto-conversion missed
    content = content.replace(
      /className="([^"]*?)fixed top-0([^"]*?)"/g,
      'className="$1shrink-0$2"'
    );
    
    // Fix the main tag to have overflow-y-auto if it has min-h-screen
    content = content.replace(
      /className="([^"]*?)min-h-screen([^"]*?)"/g,
      'className="$1flex-1 overflow-y-auto$2"'
    );
    
    // Fix pt-32 to pt-6
    content = content.replace(/\bpt-32\b/g, 'pt-6');
    content = content.replace(/\bpb-40\b/g, 'pb-8');
    
    // Fix fixed footers
    content = content.replace(
      /className="fixed bottom-0 left-0 w-full([^"]*)"/g,
      'className="shrink-0 w-full$1"'
    );

    // Fix fixed decorative elements - remove pointer-events-none decorations
    content = content.replace(
      /<div className="fixed[^"]*pointer-events-none[^"]*">\s*[\s\S]*?<\/div>\s*<\/div>/g,
      ''
    );
    content = content.replace(
      /<div className="fixed[^"]*pointer-events-none[^"]*">\s*<span[^>]*>[^<]*<\/span>\s*<\/div>/g,
      ''
    );

    // Make sure onNext is wired to main CTA buttons
    content = content.replace(
      /<button className="([^"]*?)">([\s\S]*?(?:Continuar|Entendi|Começar|Avançar)[\s\S]*?)<\/button>/g,
      (match) => {
        if (match.includes('onClick')) return match;
        return match.replace('<button', '<button onClick={onNext}');
      }
    );

    // Make sure onBack is wired to close/back buttons
    content = content.replace(
      /<span className="material-symbols-outlined[^"]*"[^>]*>close<\/span>/g,
      '<span className="material-symbols-outlined text-teal-900">arrow_back</span>'
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${matches.length} HTML comments in ${file}`);
    totalFixed += matches.length;
  } else {
    console.log(`✓ ${file} - OK`);
  }
});

console.log(`\n📊 Total HTML comments fixed: ${totalFixed}`);
