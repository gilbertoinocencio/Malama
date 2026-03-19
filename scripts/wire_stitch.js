/**
 * WIRING SCRIPT - Adds interactive state management to reconverted Stitch components.
 * Each component that collects user data needs custom wiring.
 * This script applies targeted patches to specific components.
 */
import fs from 'fs';
import path from 'path';

const DIR = 'c:/Users/DELL/Desktop/projetos/Nura/src/components/onboarding-stitch';

function patchFile(filename, patches) {
  const filePath = path.join(DIR, filename);
  let content = fs.readFileSync(filePath, 'utf8');
  
  for (const patch of patches) {
    if (patch.find && patch.replace) {
      if (content.includes(patch.find)) {
        content = content.replace(patch.find, patch.replace);
        console.log(`  ✓ Applied patch: ${patch.desc || 'unnamed'}`);
      } else {
        console.log(`  ⚠ Could not find target for patch: ${patch.desc || 'unnamed'}`);
      }
    }
    if (patch.regex && patch.replace) {
      const regex = new RegExp(patch.regex, patch.flags || 'g');
      if (regex.test(content)) {
        content = content.replace(new RegExp(patch.regex, patch.flags || 'g'), patch.replace);
        console.log(`  ✓ Applied regex patch: ${patch.desc || 'unnamed'}`);
      } else {
        console.log(`  ⚠ Could not find target for regex patch: ${patch.desc || 'unnamed'}`);
      }
    }
  }
  
  fs.writeFileSync(filePath, content);
}

// ===== NuraTipoDeDieta - Diet Type Selection =====
console.log('\n🔧 NuraTipoDeDieta');
const tipoDeDietaPath = path.join(DIR, 'NuraTipoDeDieta.tsx');
let tipoDeDieta = fs.readFileSync(tipoDeDietaPath, 'utf8');
// This needs a full rewrite with diet options
const tipoDeDietaContent = `import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraTipoDeDieta: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const dietTypes = [
    { value: 'equilibrada', label: 'Equilibrada', icon: 'balance' },
    { value: 'vegetariana', label: 'Vegetariana', icon: 'eco' },
    { value: 'vegan', label: 'Vegan', icon: 'spa' },
    { value: 'paleo', label: 'Paleo', icon: 'pets' },
    { value: 'cetogenica', label: 'Cetogénica', icon: 'whatshot' },
    { value: 'rica_proteina', label: 'Rica em proteína', icon: 'fitness_center' },
    { value: 'baixa_carboidratos', label: 'Baixa em carbo', icon: 'remove_circle_outline' }
  ];

  const handleSelect = (value: string) => {
    updateData({ dietType: value });
    setTimeout(() => onNext(), 300);
  };

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 transition-all rounded-full">
          <span className="material-symbols-outlined text-teal-900">close</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full">
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4">
            Que tipo de dieta prefere?
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Personalize a sua experiência nutritiva selecionando o estilo alimentar.
          </p>
        </section>

        <div className="space-y-4">
          {dietTypes.map((diet) => {
            const isSelected = data.dietType === diet.value;
            return (
              <button
                key={diet.value}
                onClick={() => handleSelect(diet.value)}
                className={\`w-full flex items-center justify-between p-6 rounded-xl text-left transition-all duration-300 group \${
                  isSelected
                    ? 'bg-primary-fixed-dim shadow-md border-2 border-primary/20'
                    : 'bg-surface-container-lowest shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:bg-surface-container-low border-2 border-transparent'
                }\`}
              >
                <div className="flex items-center gap-4">
                  <div className={\`w-12 h-12 rounded-xl flex items-center justify-center \${isSelected ? 'bg-primary/10' : 'bg-surface-container-high/50'}\`}>
                    <span className={\`material-symbols-outlined text-2xl \${isSelected ? 'text-primary' : 'text-on-surface-variant'}\`} style={{ fontVariationSettings: "'FILL' 1" }}>{diet.icon}</span>
                  </div>
                  <span className={\`font-headline text-lg font-semibold \${isSelected ? 'text-primary' : 'text-on-surface group-hover:text-primary'}\`}>
                    {diet.label}
                  </span>
                </div>
                {isSelected && (
                  <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                )}
              </button>
            );
          })}
        </div>
      </main>

      <footer className="shrink-0 w-full p-6 bg-surface/90 backdrop-blur-md z-10">
        <div className="max-w-2xl mx-auto">
          <button onClick={onNext} className="w-full h-16 rounded-xl bg-primary text-on-primary font-headline font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/10">
            Continuar
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraTipoDeDieta;
`;
fs.writeFileSync(tipoDeDietaPath, tipoDeDietaContent);
console.log('  ✅ Full rewrite complete');

// ===== NuraRestriEsAlimentares - Dietary Restrictions (Multi-select) =====
console.log('\n🔧 NuraRestriEsAlimentares');
const restricoesPath = path.join(DIR, 'NuraRestriEsAlimentares.tsx');
const restricoesContent = `import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraRestriEsAlimentares: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const restrictions = [
    { value: 'gluten', label: 'Glúten', icon: 'do_not_disturb' },
    { value: 'lactose', label: 'Lactose', icon: 'water_drop' },
    { value: 'frutos_do_mar', label: 'Frutos do Mar', icon: 'set_meal' },
    { value: 'nozes', label: 'Nozes', icon: 'forest' },
    { value: 'soja', label: 'Soja', icon: 'grass' },
    { value: 'ovos', label: 'Ovos', icon: 'egg' },
    { value: 'nenhuma', label: 'Nenhuma restrição', icon: 'check_circle' }
  ];

  const toggleRestriction = (value: string) => {
    const current = data.dietaryRestrictions || [];
    if (value === 'nenhuma') {
      updateData({ dietaryRestrictions: ['nenhuma'] });
      return;
    }
    const filtered = current.filter((r: string) => r !== 'nenhuma');
    const updated = filtered.includes(value)
      ? filtered.filter((r: string) => r !== value)
      : [...filtered, value];
    updateData({ dietaryRestrictions: updated });
  };

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 transition-all rounded-full">
          <span className="material-symbols-outlined text-teal-900">close</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full">
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4">
            Alguma restrição alimentar?
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Selecione todas as restrições que se aplicam. Isso nos ajuda a criar um plano seguro para você.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-4">
          {restrictions.map((item) => {
            const isSelected = (data.dietaryRestrictions || []).includes(item.value);
            return (
              <button
                key={item.value}
                onClick={() => toggleRestriction(item.value)}
                className={\`flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-300 \${
                  isSelected
                    ? 'bg-primary-fixed-dim shadow-md border-2 border-primary/20'
                    : 'bg-surface-container-lowest shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-2 border-transparent hover:bg-surface-container-low'
                } \${item.value === 'nenhuma' ? 'col-span-2' : ''}\`}
              >
                <span className={\`material-symbols-outlined text-3xl mb-2 \${isSelected ? 'text-primary' : 'text-on-surface-variant'}\`} style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                <span className={\`font-headline font-semibold \${isSelected ? 'text-primary' : 'text-on-surface'}\`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="shrink-0 w-full p-6 bg-surface/90 backdrop-blur-md z-10">
        <div className="max-w-2xl mx-auto">
          <button onClick={onNext} className="w-full h-16 rounded-xl bg-primary text-on-primary font-headline font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/10">
            Continuar
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraRestriEsAlimentares;
`;
fs.writeFileSync(restricoesPath, restricoesContent);
console.log('  ✅ Full rewrite complete');

// ===== NuraConheceJejum - Yes/No question =====
console.log('\n🔧 NuraConheceJejum');
patchFile('NuraConheceJejum.tsx', [
  // The HTML has two buttons for Sim/Não - we need to wire them
  // Find buttons and add onClick handlers
]);
// Read the file and do a targeted replacement
const conheceJejumPath = path.join(DIR, 'NuraConheceJejum.tsx');
let conheceJejum = fs.readFileSync(conheceJejumPath, 'utf8');
// Add onClick for "Sim" button
conheceJejum = conheceJejum.replace(
  /(<button[^>]*className="[^"]*"[^>]*>[\s\S]*?Sim[\s\S]*?<\/button>)/,
  (match) => match.replace('<button', '<button onClick={() => { updateData({ knowsIntermittentFasting: true }); onNext(); }}')
);
// Add onClick for "Não" button
conheceJejum = conheceJejum.replace(
  /(<button[^>]*className="[^"]*"[^>]*>[\s\S]*?Não[\s\S]*?<\/button>)/,
  (match) => match.replace('<button', '<button onClick={() => { updateData({ knowsIntermittentFasting: false }); onNext(); }}')
);
fs.writeFileSync(conheceJejumPath, conheceJejum);
console.log('  ✅ Wired Sim/Não buttons');

// ===== NuraConsumoDeGua - Water consumption yes/no =====
console.log('\n🔧 NuraConsumoDeGua');
const consumoDeGuaPath = path.join(DIR, 'NuraConsumoDeGua.tsx');
let consumoDeGua = fs.readFileSync(consumoDeGuaPath, 'utf8');
// Wire water consumption buttons
consumoDeGua = consumoDeGua.replace(
  /(<button[^>]*>[\s\S]*?Sim[\s\S]*?<\/button>)/,
  (match) => match.replace('<button', '<button onClick={() => { updateData({ drinksEnoughWater: "sim" }); onNext(); }}')
);
consumoDeGua = consumoDeGua.replace(
  /(<button[^>]*>[\s\S]*?Não, sei[\s\S]*?<\/button>)/,
  (match) => match.replace('<button', '<button onClick={() => { updateData({ drinksEnoughWater: "nao_sei" }); onNext(); }}')
);
consumoDeGua = consumoDeGua.replace(
  /(<button[^>]*>[\s\S]*?(?:Não(?!,)|Não tenho)[\s\S]*?<\/button>)/,
  (match) => {
    if (match.includes('onClick')) return match;
    return match.replace('<button', '<button onClick={() => { updateData({ drinksEnoughWater: "nao" }); onNext(); }}');
  }
);
fs.writeFileSync(consumoDeGuaPath, consumoDeGua);
console.log('  ✅ Wired water buttons');

// ===== NuraRefeiEsDiRias - Meals per day stepper =====
console.log('\n🔧 NuraRefeiEsDiRias');
const refeicoesPath = path.join(DIR, 'NuraRefeiEsDiRias.tsx');
let refeicoes = fs.readFileSync(refeicoesPath, 'utf8');
// Wire the - button
refeicoes = refeicoes.replace(
  /(<button[^>]*>[\s\S]*?<span[^>]*>remove<\/span>[\s\S]*?<\/button>)/,
  (match) => match.replace('<button', '<button onClick={() => updateData({ mealsPerDay: Math.max(1, (data.mealsPerDay || 3) - 1) })}')
);
// Wire the + button
refeicoes = refeicoes.replace(
  /(<button[^>]*>[\s\S]*?<span[^>]*>add<\/span>[\s\S]*?<\/button>)/,
  (match) => match.replace('<button', '<button onClick={() => updateData({ mealsPerDay: Math.min(6, (data.mealsPerDay || 3) + 1) })}')
);
// Replace the static meal count with dynamic value
refeicoes = refeicoes.replace(/>\s*3\s*<\/span>/g, '>{data.mealsPerDay || 3}</span>');
fs.writeFileSync(refeicoesPath, refeicoes);
console.log('  ✅ Wired +/- stepper');

// ===== NuraObjetivosAdicionais - Multi-select goals =====
console.log('\n🔧 NuraObjetivosAdicionais');
const objetivosPath = path.join(DIR, 'NuraObjetivosAdicionais.tsx');
const objetivosContent = `import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraObjetivosAdicionais: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const goals = [
    { value: 'melhorar_sono', label: 'Melhorar o Sono', icon: 'bedtime' },
    { value: 'reduzir_stress', label: 'Reduzir Stress', icon: 'self_improvement' },
    { value: 'mais_energia', label: 'Mais Energia', icon: 'bolt' },
    { value: 'ganhar_massa', label: 'Ganhar Massa', icon: 'fitness_center' },
    { value: 'saude_intestinal', label: 'Saúde Intestinal', icon: 'gastroenterology' },
    { value: 'longevidade', label: 'Longevidade', icon: 'favorite' },
  ];

  const toggleGoal = (value: string) => {
    const current = data.additionalGoals || [];
    const updated = current.includes(value)
      ? current.filter((g: string) => g !== value)
      : [...current, value];
    updateData({ additionalGoals: updated });
  };

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 transition-all rounded-full">
          <span className="material-symbols-outlined text-teal-900">close</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full">
        <section className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4">
            Objetivos adicionais?
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Selecione tudo o que você gostaria de melhorar além da nutrição.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-4">
          {goals.map((goal) => {
            const isSelected = (data.additionalGoals || []).includes(goal.value);
            return (
              <button
                key={goal.value}
                onClick={() => toggleGoal(goal.value)}
                className={\`flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-300 \${
                  isSelected
                    ? 'bg-secondary-container/30 shadow-md border-2 border-secondary/30'
                    : 'bg-surface-container-lowest shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-2 border-transparent hover:bg-surface-container-low'
                }\`}
              >
                <span className={\`material-symbols-outlined text-3xl mb-3 \${isSelected ? 'text-secondary' : 'text-on-surface-variant'}\`} style={{ fontVariationSettings: "'FILL' 1" }}>{goal.icon}</span>
                <span className={\`font-headline text-sm font-semibold text-center \${isSelected ? 'text-primary' : 'text-on-surface'}\`}>{goal.label}</span>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="shrink-0 w-full p-6 bg-surface/90 backdrop-blur-md z-10">
        <div className="max-w-2xl mx-auto">
          <button onClick={onNext} className="w-full h-16 rounded-xl bg-primary text-on-primary font-headline font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/10">
            Continuar
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraObjetivosAdicionais;
`;
fs.writeFileSync(objetivosPath, objetivosContent);
console.log('  ✅ Full rewrite complete');

// ===== NuraMudanADeHBitos - Multi-select habits =====
console.log('\n🔧 NuraMudanADeHBitos');
const habitosPath = path.join(DIR, 'NuraMudanADeHBitos.tsx');
const habitosContent = `import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraMudanADeHBitos: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const habits = [
    { value: 'comer_mais_devagar', label: 'Comer mais devagar', icon: 'pace' },
    { value: 'menos_acucar', label: 'Menos açúcar', icon: 'no_food' },
    { value: 'mais_vegetais', label: 'Mais vegetais', icon: 'nutrition' },
    { value: 'menos_processados', label: 'Menos processados', icon: 'block' },
    { value: 'cozinhar_mais', label: 'Cozinhar mais', icon: 'skillet' },
    { value: 'controlar_porcoes', label: 'Controlar porções', icon: 'straighten' },
  ];

  const toggleHabit = (value: string) => {
    const current = data.habitChanges || [];
    const updated = current.includes(value)
      ? current.filter((h: string) => h !== value)
      : [...current, value];
    updateData({ habitChanges: updated });
  };

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 transition-all rounded-full">
          <span className="material-symbols-outlined text-teal-900">close</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full">
        <section className="mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4">
            Que hábitos quer mudar?
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Selecione os hábitos que fazem sentido para o seu estilo de vida atual.
          </p>
        </section>

        <div className="space-y-4">
          {habits.map((habit) => {
            const isSelected = (data.habitChanges || []).includes(habit.value);
            return (
              <button
                key={habit.value}
                onClick={() => toggleHabit(habit.value)}
                className={\`w-full flex items-center gap-5 p-5 rounded-xl transition-all duration-300 \${
                  isSelected
                    ? 'bg-secondary-container/30 shadow-md border-2 border-secondary/30'
                    : 'bg-surface-container-lowest shadow-[0_4px_16px_rgba(0,0,0,0.03)] border-2 border-transparent hover:bg-surface-container-low'
                }\`}
              >
                <div className={\`w-12 h-12 rounded-xl flex items-center justify-center \${isSelected ? 'bg-secondary/10' : 'bg-surface-container-high/50'}\`}>
                  <span className={\`material-symbols-outlined text-2xl \${isSelected ? 'text-secondary' : 'text-on-surface-variant'}\`} style={{ fontVariationSettings: "'FILL' 1" }}>{habit.icon}</span>
                </div>
                <span className={\`font-headline text-lg font-semibold \${isSelected ? 'text-primary' : 'text-on-surface'}\`}>{habit.label}</span>
                {isSelected && (
                  <span className="material-symbols-outlined text-secondary ml-auto" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                )}
              </button>
            );
          })}
        </div>
      </main>

      <footer className="shrink-0 w-full p-6 bg-surface/90 backdrop-blur-md z-10">
        <div className="max-w-2xl mx-auto">
          <button onClick={onNext} className="w-full h-16 rounded-xl bg-primary text-on-primary font-headline font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/10">
            Continuar
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraMudanADeHBitos;
`;
fs.writeFileSync(habitosPath, habitosContent);
console.log('  ✅ Full rewrite complete');

// ===== NuraLocalDasRefeiEs - Eating location selection =====
console.log('\n🔧 NuraLocalDasRefeiEs');
const localPath = path.join(DIR, 'NuraLocalDasRefeiEs.tsx');
let localContent = fs.readFileSync(localPath, 'utf8');
// Wire the location option buttons
const locations = [
  { label: 'Cozinhar em casa', value: 'cozinhar_casa' },
  { label: 'Pedir entrega', value: 'pedir_entrega' },
  { label: 'Comer fora', value: 'comer_fora' },
];
// Try to find buttons and add click handlers
for (const loc of locations) {
  const regex = new RegExp(\`(<button[^>]*>[\\s\\S]*?\${loc.label}[\\s\\S]*?<\\/button>)\`, 'g');
  localContent = localContent.replace(regex, (match) => {
    if (match.includes('onClick')) return match;
    return match.replace('<button', \`<button onClick={() => { updateData({ eatingLocation: '\${loc.value}' }); onNext(); }}\`);
  });
}
fs.writeFileSync(localPath, localContent);
console.log('  ✅ Wired location buttons');

// ===== NuraExperiNciaCalorias - Calorie experience =====
console.log('\n🔧 NuraExperiNciaCalorias');
const experienciaPath = path.join(DIR, 'NuraExperiNciaCalorias.tsx');
let experiencia = fs.readFileSync(experienciaPath, 'utf8');
const experiences = [
  { label: 'Sou novo', value: 'new' },
  { label: 'Já tentei', value: 'tried_quit' },
  { label: 'Controlo atualmente', value: 'currently_tracking' },
];
for (const exp of experiences) {
  const regex = new RegExp(\`(<button[^>]*>[\\s\\S]*?\${exp.label}[\\s\\S]*?<\\/button>)\`, 'g');
  experiencia = experiencia.replace(regex, (match) => {
    if (match.includes('onClick')) return match;
    return match.replace('<button', \`<button onClick={() => { updateData({ calorieTrackingExperience: '\${exp.value}' }); onNext(); }}\`);
  });
}
fs.writeFileSync(experienciaPath, experiencia);
console.log('  ✅ Wired experience buttons');

// ===== NuraVelocidadeDaMeta - Goal speed slider =====
console.log('\n🔧 NuraVelocidadeDaMeta');
const velocidadePath = path.join(DIR, 'NuraVelocidadeDaMeta.tsx');
const velocidadeContent = `import React, { useMemo } from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraVelocidadeDaMeta: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  const speedValue = data.goalSpeedKgPerWeek || 0.5;

  const mapSpeedToSlider = (speed: number) => {
    if (speed <= 0.25) return 1;
    if (speed <= 0.375) return 2;
    if (speed <= 0.5) return 3;
    if (speed <= 0.625) return 4;
    return 5;
  };

  const mapSliderToSpeed = (slider: number) => {
    return 0.25 + (slider - 1) * 0.125;
  };

  const sliderValue = mapSpeedToSlider(speedValue);

  const weeksNeeded = useMemo(() => {
    if (!data.currentWeight || !data.targetWeight || !speedValue) return null;
    const weightDiff = Math.abs(data.currentWeight - data.targetWeight);
    return Math.ceil(weightDiff / speedValue);
  }, [data.currentWeight, data.targetWeight, speedValue]);

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 transition-all rounded-full">
          <span className="material-symbols-outlined text-teal-900">close</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full">
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4">
            Velocidade da sua meta
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Escolha o ritmo. Sustentabilidade é a chave.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-6 mb-12">
          <div className="bg-surface-container-lowest p-8 rounded-xl flex flex-col items-center justify-center space-y-4 shadow-[0_16px_32px_rgba(0,0,0,0.04)] border-2 border-transparent">
            <span className="material-symbols-outlined text-5xl text-secondary/40" style={{ fontVariationSettings: "'FILL' 0" }}>egg</span>
            <span className="font-headline text-sm font-medium text-on-surface-variant">Lento e sustentável</span>
          </div>
          <div className="bg-surface-container-lowest p-8 rounded-xl flex flex-col items-center justify-center space-y-4 shadow-[0_16px_32px_rgba(0,0,0,0.04)] border-2 border-secondary/20 scale-105">
            <span className="material-symbols-outlined text-5xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            <span className="font-headline text-sm font-medium text-primary">Rápido e intenso</span>
          </div>
        </div>

        <div className="w-full px-4 mb-12">
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={sliderValue}
            onChange={(e) => updateData({ goalSpeedKgPerWeek: mapSliderToSpeed(parseInt(e.target.value)) })}
            className="w-full h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer"
          />
          <div className="flex justify-between mt-4 text-xs text-on-surface-variant font-headline">
            <span>0.25 kg/sem</span>
            <span className="font-bold text-primary text-base">{speedValue.toFixed(2)} kg/sem</span>
            <span>0.75 kg/sem</span>
          </div>
        </div>

        {weeksNeeded && (
          <div className="bg-secondary-container/20 p-6 rounded-xl border border-secondary/10">
            <p className="text-on-surface-variant text-sm font-headline">
              Previsão: <strong className="text-primary">{weeksNeeded} semanas</strong> para atingir sua meta
            </p>
          </div>
        )}
      </main>

      <footer className="shrink-0 w-full p-6 bg-surface/90 backdrop-blur-md z-10">
        <div className="max-w-2xl mx-auto">
          <button onClick={onNext} className="w-full h-16 rounded-xl bg-primary text-on-primary font-headline font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/10">
            Continuar
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraVelocidadeDaMeta;
`;
fs.writeFileSync(velocidadePath, velocidadeContent);
console.log('  ✅ Full rewrite complete');

// ===== NuraPesoObjetivo - Target weight picker =====
console.log('\n🔧 NuraPesoObjetivo');
const pesoPath = path.join(DIR, 'NuraPesoObjetivo.tsx');
const pesoContent = `import React from 'react';
import { StepProps } from '../onboarding-v2/types';

const NuraPesoObjetivo: React.FC<StepProps> = ({ data, updateData, onNext, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-surface text-on-surface font-body">
      <header className="shrink-0 w-full z-10 bg-stone-50/70 backdrop-blur-xl flex items-center justify-between px-8 h-20">
        <div className="text-2xl font-bold tracking-tighter text-teal-900 font-headline">NURA</div>
        <button onClick={onBack} className="p-2 hover:bg-stone-200/50 transition-all rounded-full">
          <span className="material-symbols-outlined text-teal-900">close</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-8 px-6 max-w-2xl mx-auto w-full flex flex-col items-center">
        <section className="mb-10 w-full">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary font-headline tracking-tight leading-tight mb-4">
            Qual seu peso objetivo?
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
            Defina a meta que faz sentido para o seu corpo e estilo de vida.
          </p>
        </section>

        <div className="flex flex-col items-center space-y-8 w-full">
          <div className="flex items-center space-x-8">
            <button
              onClick={() => updateData({ targetWeight: Math.max(30, (data.targetWeight || 70) - 1) })}
              className="w-16 h-16 rounded-full bg-surface-container-lowest shadow-lg text-primary flex items-center justify-center hover:bg-surface-container-high transition-all active:scale-90"
            >
              <span className="material-symbols-outlined text-3xl">remove</span>
            </button>
            <div className="flex flex-col items-center">
              <span className="text-7xl font-extrabold text-primary font-headline tabular-nums">{data.targetWeight || 70}</span>
              <span className="text-on-surface-variant font-headline text-sm mt-1">kg</span>
            </div>
            <button
              onClick={() => updateData({ targetWeight: Math.min(200, (data.targetWeight || 70) + 1) })}
              className="w-16 h-16 rounded-full bg-surface-container-lowest shadow-lg text-primary flex items-center justify-center hover:bg-surface-container-high transition-all active:scale-90"
            >
              <span className="material-symbols-outlined text-3xl">add</span>
            </button>
          </div>

          <input
            type="range"
            min={30}
            max={200}
            value={data.targetWeight || 70}
            onChange={(e) => updateData({ targetWeight: parseInt(e.target.value) })}
            className="w-full max-w-xs h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer"
          />

          {data.currentWeight && (
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm w-full max-w-sm">
              <p className="text-on-surface-variant text-sm font-headline text-center">
                Diferença: <strong className="text-primary">{Math.abs((data.targetWeight || 70) - data.currentWeight)} kg</strong>
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="shrink-0 w-full p-6 bg-surface/90 backdrop-blur-md z-10">
        <div className="max-w-2xl mx-auto">
          <button onClick={onNext} className="w-full h-16 rounded-xl bg-primary text-on-primary font-headline font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/10">
            Continuar
          </button>
        </div>
      </footer>
    </div>
  );
};

export default NuraPesoObjetivo;
`;
fs.writeFileSync(pesoPath, pesoContent);
console.log('  ✅ Full rewrite complete');

// ===== NuraCriandoPlano - Loading/Creating plan animation =====
console.log('\n🔧 NuraCriandoPlano');
const criandoPlanoPath = path.join(DIR, 'NuraCriandoPlano.tsx');
let criandoPlano = fs.readFileSync(criandoPlanoPath, 'utf8');
// Auto-advance after 3 seconds
if (!criandoPlano.includes('useEffect')) {
  criandoPlano = criandoPlano.replace(
    "import React from 'react';",
    "import React, { useEffect } from 'react';"
  );
  criandoPlano = criandoPlano.replace(
    'return (',
    'useEffect(() => { const timer = setTimeout(() => onNext(), 3500); return () => clearTimeout(timer); }, []);\n\n  return ('
  );
}
fs.writeFileSync(criandoPlanoPath, criandoPlano);
console.log('  ✅ Added auto-advance timer');

// ===== NuraJanelaAlimentar - Eating window =====
console.log('\n🔧 NuraJanelaAlimentar');
const janelaPath = path.join(DIR, 'NuraJanelaAlimentar.tsx');
let janela = fs.readFileSync(janelaPath, 'utf8');
// Replace static times with dynamic data
janela = janela.replace(/08:00/g, '{data.eatingWindowStart || "08:00"}');
janela = janela.replace(/20:00/g, '{data.eatingWindowEnd || "20:00"}');
fs.writeFileSync(janelaPath, janela);
console.log('  ✅ Wired eating window times');

// ===== NuraResumoBiomTrico - Summary display =====
console.log('\n🔧 NuraResumoBiomTrico');
const resumoPath = path.join(DIR, 'NuraResumoBiomTrico.tsx');
let resumo = fs.readFileSync(resumoPath, 'utf8');
// Replace static values with dynamic data
resumo = resumo.replace(/>170<\/span>/g, '>{data.height || 170}</span>');
resumo = resumo.replace(/>70<\/span>/g, '>{data.currentWeight || 70}</span>');
resumo = resumo.replace(/>30<\/span>/g, '>{data.age || 30}</span>');
fs.writeFileSync(resumoPath, resumo);
console.log('  ✅ Wired dynamic values');

console.log('\n🎉 All interactive components wired successfully!');
`;
fs.writeFileSync('c:/Users/DELL/Desktop/projetos/Nura/scripts/wire_stitch.js', wiringScript);
console.log('  Script written');
