/**
 * Reconvert all Stitch HTML files to React TSX components.
 * This script reads each code.html from the stitch_nura_onboarding directory,
 * extracts the body content, and converts it to a proper React TSX component
 * with correct flex layout for mobile scrolling inside Framer Motion.
 */
import fs from 'fs';
import path from 'path';

const STITCH_DIR = 'c:/Users/DELL/Desktop/projetos/Nura/stitch_nura_onboarding/stitch_nura_home_feed_the_flow';
const OUTPUT_DIR = 'c:/Users/DELL/Desktop/projetos/Nura/src/components/onboarding-stitch';

// Map folder names to component names
const COMPONENT_MAP = {
  'nura_benef_cios_jejum': 'NuraBenefCiosJejum',
  'nura_conhece_jejum': 'NuraConheceJejum',
  'nura_consumo_de_gua': 'NuraConsumoDeGua',
  'nura_criando_plano': 'NuraCriandoPlano',
  'nura_educa_o_hidrata_o': 'NuraEducaOHidrataO',
  'nura_educa_o_jejum': 'NuraEducaOJejum',
  'nura_experi_ncia_calorias': 'NuraExperiNciaCalorias',
  'nura_janela_alimentar': 'NuraJanelaAlimentar',
  'nura_lembretes_e_rotina': 'NuraLembretesERotina',
  'nura_local_das_refei_es': 'NuraLocalDasRefeiEs',
  'nura_metodologia_flow': 'NuraMetodologiaFlow',
  'nura_mudan_a_de_h_bitos': 'NuraMudanADeHBitos',
  'nura_objetivos_adicionais': 'NuraObjetivosAdicionais',
  'nura_peso_objetivo': 'NuraPesoObjetivo',
  'nura_plano_personalizado': 'NuraPlanoPersonalizado',
  'nura_proje_o_de_sucesso': 'NuraProjeODeSucesso',
  'nura_prova_de_sucesso': 'NuraProvaDeSucesso',
  'nura_refei_es_di_rias': 'NuraRefeiEsDiRias',
  'nura_restri_es_alimentares': 'NuraRestriEsAlimentares',
  'nura_resumo_biom_trico': 'NuraResumoBiomTrico',
  'nura_tipo_de_dieta': 'NuraTipoDeDieta',
  'nura_velocidade_da_meta': 'NuraVelocidadeDaMeta',
};

function extractBodyContent(html) {
  // Extract content between <body ...> and </body>
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return '';
  return bodyMatch[1];
}

function convertHtmlToJsx(html) {
  let jsx = html;

  // Convert class= to className=
  jsx = jsx.replace(/\bclass=/g, 'className=');

  // Convert style="..." with inline styles to JSX objects
  // Handle font-variation-settings
  jsx = jsx.replace(/style="font-variation-settings:\s*'FILL'\s*(\d),\s*'wght'\s*(\d+),\s*'GRAD'\s*(\d),\s*'opsz'\s*(\d+);?"/g,
    (_, fill) => `style={{ fontVariationSettings: "'FILL' ${fill}" }}`);

  jsx = jsx.replace(/style="font-variation-settings:\s*'FILL'\s*(\d);?"/g,
    (_, fill) => `style={{ fontVariationSettings: "'FILL' ${fill}" }}`);

  // Convert remaining simple style attributes
  jsx = jsx.replace(/style="([^"]*)"/g, (match, styles) => {
    if (styles.includes('fontVariationSettings')) return match; // already handled
    const pairs = styles.split(';').filter(s => s.trim());
    const jsxPairs = pairs.map(pair => {
      const [key, value] = pair.split(':').map(s => s.trim());
      if (!key || !value) return '';
      const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return `${camelKey}: '${value}'`;
    }).filter(Boolean);
    return `style={{ ${pairs.join(', ')} }}`;
  });

  // Convert self-closing tags that HTML allows but JSX doesn't
  // <img src="..." > to <img src="..." />
  jsx = jsx.replace(/<(img|input|br|hr|meta|link)(\s[^>]*?)(?<!\/)>/gi, '<$1$2 />');

  // Convert for= to htmlFor=
  jsx = jsx.replace(/\bfor=/g, 'htmlFor=');

  // Convert stroke-dasharray to strokeDasharray etc.
  jsx = jsx.replace(/stroke-dasharray=/g, 'strokeDasharray=');
  jsx = jsx.replace(/stroke-width=/g, 'strokeWidth=');
  jsx = jsx.replace(/stroke-linecap=/g, 'strokeLinecap=');
  jsx = jsx.replace(/stroke-linejoin=/g, 'strokeLinejoin=');
  jsx = jsx.replace(/fill-rule=/g, 'fillRule=');
  jsx = jsx.replace(/clip-rule=/g, 'clipRule=');
  jsx = jsx.replace(/viewbox=/gi, 'viewBox=');
  jsx = jsx.replace(/preserveaspectratio=/gi, 'preserveAspectRatio=');
  jsx = jsx.replace(/x1=/g, 'x1=');
  jsx = jsx.replace(/x2=/g, 'x2=');
  jsx = jsx.replace(/y1=/g, 'y1=');
  jsx = jsx.replace(/y2=/g, 'y2=');

  // Convert SVG specific attributes
  jsx = jsx.replace(/lineargradient/gi, 'linearGradient');
  jsx = jsx.replace(/stop-color=/g, 'stopColor=');
  jsx = jsx.replace(/stop-opacity=/g, 'stopOpacity=');

  // Remove progress bar at top (we handle this in the parent)
  jsx = jsx.replace(/<div className="fixed top-0 left-0 w-full h-1 z-\[60\][^>]*>[\s\S]*?<\/div>\s*<\/div>/g, '');

  // Remove decorative fixed elements at the very bottom (outside main/footer)
  // These are the floating icons that were at the bottom
  
  return jsx;
}

function wrapInComponent(componentName, bodyJsx) {
  // Split the body content into header, main, and footer sections
  
  // Replace the fixed header with a shrink-0 flex header
  let content = bodyJsx;
  
  // Fix header: remove fixed positioning, add shrink-0
  content = content.replace(
    /className="fixed top-0 w-full z-50([^"]*)"/g,
    'className="shrink-0 w-full z-10$1"'
  );
  
  // Fix main: remove min-h-screen, fixed pt values; add overflow-y-auto
  content = content.replace(
    /className="relative min-h-screen pt-\d+ pb-\d+ px-(\d+)([^"]*)"/g,
    'className="flex-1 overflow-y-auto pt-6 pb-8 px-$1$2"'
  );
  
  // Fix footer: remove fixed positioning, add shrink-0
  content = content.replace(
    /className="fixed bottom-0 left-0 w-full([^"]*)"/g,
    'className="shrink-0 w-full$1"'
  );

  // Remove any remaining fixed decorative elements that would break layout
  content = content.replace(/<div className="fixed bottom-\d+[^"]*pointer-events-none[^>]*>[\s\S]*?<\/div>\s*<\/div>/g, '');
  content = content.replace(/<div className="fixed top-\d+[^"]*pointer-events-none[^>]*>[\s\S]*?<\/div>\s*<\/div>/g, '');

  // Replace the top-level progress bar div if still present
  content = content.replace(/<div className="fixed top-0 left-0 w-full h-1[^>]*>[\s\S]*?<\/div>\s*<\/div>/g, '');

  // Add onClick={onBack} to the back/close button if not already present
  content = content.replace(
    /<button className="([^"]*)">\s*<span className="material-symbols-outlined[^"]*">close<\/span>/g,
    '<button onClick={onBack} className="$1"><span className="material-symbols-outlined text-teal-900 dark:text-teal-500">arrow_back</span>'
  );

  // Add onClick={onNext} to the main CTA button if not already present
  // Match buttons that contain "Continuar" or similar
  content = content.replace(
    /<button className="([^"]*)">\s*([\s\S]*?(?:Continuar|Entendi|Começar|Vamos lá|Próximo|Avançar)[\s\S]*?)<\/button>/g,
    '<button onClick={onNext} className="$1">$2</button>'
  );

  return `import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const ${componentName}: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      ${content.trim()}
    </div>
  );
};

export default ${componentName};
`;
}

// Process all folders
const folders = fs.readdirSync(STITCH_DIR);
let processed = 0;
let skipped = 0;

for (const folder of folders) {
  const componentName = COMPONENT_MAP[folder];
  if (!componentName) {
    console.log(`⏭ Skipping ${folder} (no mapping)`);
    skipped++;
    continue;
  }

  const htmlPath = path.join(STITCH_DIR, folder, 'code.html');
  if (!fs.existsSync(htmlPath)) {
    console.log(`⏭ Skipping ${folder} (no code.html)`);
    skipped++;
    continue;
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const bodyContent = extractBodyContent(html);
  const jsxContent = convertHtmlToJsx(bodyContent);
  const component = wrapInComponent(componentName, jsxContent);

  const outputPath = path.join(OUTPUT_DIR, `${componentName}.tsx`);
  fs.writeFileSync(outputPath, component);
  console.log(`✅ Converted ${folder} → ${componentName}.tsx`);
  processed++;
}

console.log(`\n📊 Done! Processed: ${processed}, Skipped: ${skipped}`);
