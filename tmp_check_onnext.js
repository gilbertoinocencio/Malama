import fs from 'fs';
import path from 'path';

const dir = 'c:/Users/DELL/Desktop/projetos/Nura/src/components/onboarding-stitch';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

let missing = [];

files.forEach(file => {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('onNext(') && !content.includes('onNext}') && !content.includes('onNext =') && !content.includes('nextStep')) {
    missing.push(file);
  }
});

console.log('Files missing onNext:', missing);
