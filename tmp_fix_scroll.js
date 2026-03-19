import fs from 'fs';
import path from 'path';

const dir = 'c:/Users/DELL/Desktop/projetos/Nura/src/components/onboarding-stitch';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace <footer className="fixed bottom-0 ...">
  content = content.replace(
    /<footer className="fixed bottom-0 left-0 w-full ([^"]*)">/g,
    '<footer className="shrink-0 w-full $1 p-6 relative z-40 bg-surface/80 backdrop-blur-md pb-8">'
  );

  // General catch-all for fixed footer
  content = content.replace(
    /className="fixed bottom-0 ([^"]*)"/g,
    'className="shrink-0 relative w-full $1 pb-8"'
  );

  // Some components might have <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t ... z-50">
  // let's ensure they are also catched if the first script missed them.
  content = content.replace(
    /className="fixed bottom-\d+ left-\d+ right-\d+([^"]*)"/g,
    'className="shrink-0 w-full relative $1 pb-8"'
  );

  fs.writeFileSync(filePath, content);
  console.log(`Processed footer for ${file}`);
});
