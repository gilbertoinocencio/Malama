const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, '../stitch_nura_onboarding/stitch_nura_home_feed_the_flow');
const outputDir = path.join(__dirname, '../src/components/onboarding-stitch');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const folders = fs.readdirSync(inputDir);

folders.forEach(folder => {
  const codePath = path.join(inputDir, folder, 'code.html');
  if (!fs.existsSync(codePath)) return;

  let html = fs.readFileSync(codePath, 'utf8');
  
  // Extract <main>
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  let content = mainMatch ? mainMatch[1] : html;
  
  // Also extract the fixed footer buttons if they exist
  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  let footer = footerMatch ? footerMatch[1] : '';

  let combined = `
      <div className="flex flex-col h-full bg-surface text-on-surface">
        <header className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between bg-surface/80 backdrop-blur-md">
            <button onClick={onBack} className="p-2 hover:bg-stone-200/50 rounded-full transition-all"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span></button>
            <div className="text-xl font-bold tracking-tighter text-teal-900 dark:text-teal-500 font-lexend">NURA</div>
            <div className="w-10"></div>
        </header>
        
        <main className="flex-grow pt-24 pb-32 px-6 max-w-2xl mx-auto w-full">
          ${content}
        </main>
        
        <footer className="fixed bottom-0 left-0 w-full p-6 bg-surface/80 backdrop-blur-md z-40">
          <div className="max-w-2xl mx-auto flex gap-4 w-full justify-end">
             ${footer ? footer : `<button onClick={onNext} className="bg-primary text-on-primary font-headline font-semibold py-4 px-12 rounded-xl text-lg hover:bg-primary-container transition-all min-w-[200px]">Continuar</button>`}
          </div>
        </footer>
      </div>
  `;

  // React translations
  combined = combined.replace(/class="/g, 'className="');
  combined = combined.replace(/for="/g, 'htmlFor="');
  combined = combined.replace(/stroke-width="/g, 'strokeWidth="');
  combined = combined.replace(/stroke-linecap="/g, 'strokeLinecap="');
  combined = combined.replace(/stroke-linejoin="/g, 'strokeLinejoin="');
  // SVG and HTML self closing tags
  combined = combined.replace(/<img([^>]*)>/g, (m, p1) => { if (p1.endsWith('/')) return m; return `<img${p1} />`; });
  combined = combined.replace(/<input([^>]*)>/g, (m, p1) => { if (p1.endsWith('/')) return m; return `<input${p1} />`; });
  combined = combined.replace(/<br>/g, '<br />');
  combined = combined.replace(/<hr>/g, '<hr />');
  
  // Escape inline styles correctly
  combined = combined.replace(/style="([^"]*)"/g, (match, p1) => {
    if (p1.includes('font-variation-settings')) {
      const isFill1 = p1.includes('\'FILL\' 1');
      return `style={{ fontVariationSettings: "'FILL' ${isFill1 ? '1' : '0'}" }}`;
    }
    return `style={{}}`; 
  });

  // Replace <!-- Comments --> with {/* Comments */}
  combined = combined.replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}');

  // Fix inline SVG self-closing (path, circle, etc if needed - but mostly they are fine or use specific tools)

  // Create PascalCase component name
  const compName = folder.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

  const tsx = `import React from 'react';\nimport { StepProps } from '../onboarding-v2/types';\n\nconst ${compName}: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {\n  return (\n    ${combined}\n  );\n};\n\nexport default ${compName};\n`;

  fs.writeFileSync(path.join(outputDir, `${compName}.tsx`), tsx);
  console.log(`Converted ${compName}`);
});
console.log('Conversion done!');
