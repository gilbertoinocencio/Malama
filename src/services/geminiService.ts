import { SchemaType } from "@google/generative-ai";
import { GeminiProxy } from '../lib/geminiProxy';
import { AIResponse, MealItem, MicroNutrients, Profile } from '../types';
import { searchOpenFoodFacts, formatOFFBlock } from './openFoodFactsService';
import { normalizeGender } from '../utils/bodyCompositionCalculators';
import { NutritionKnowledgeService } from './nutritionKnowledgeService';

/**
 * Deterministic meal-slot label from the device clock. Single source of truth for
 * naming a meal ("Café da Manhã", "Almoço", "Jantar"…) — never let the model derive
 * it from a time string (that produced "Almoço" at 21h).
 */
export const getMealSlotLabel = (date: Date = new Date()): string => {
  const h = date.getHours();
  if (h >= 5  && h < 10) return 'Café da Manhã';
  if (h >= 10 && h < 12) return 'Lanche da Manhã';
  if (h >= 12 && h < 15) return 'Almoço';
  if (h >= 15 && h < 18) return 'Lanche da Tarde';
  if (h >= 18 && h < 22) return 'Jantar';
  return 'Ceia';
};

/** Portuguese gender-agreement instruction for the user being addressed. */
const genderAgreementRule = (raw?: string | null): string => {
  if (raw === 'non_binary') {
    return 'IMPORTANTE: dirija-se ao usuário de forma NEUTRA em gênero (evite "amigo/amiga", "focado/focada"). Use construções neutras.';
  }
  const g = normalizeGender(raw);
  return g === 'male'
    ? 'IMPORTANTE: o usuário é do gênero MASCULINO. Trate-o no masculino — "amigo", e todos os adjetivos no masculino ("focado", "encaminhado", "preparado"). NUNCA use "amiga" ou adjetivos femininos.'
    : 'IMPORTANTE: a usuária é do gênero FEMININO. Trate-a no feminino — "amiga", e todos os adjetivos no feminino ("focada", "encaminhada", "preparada").';
};

// Shared micronutrient schema properties (optional — not in required[])
const MICRO_SCHEMA_PROPERTIES = {
  fiber: { type: SchemaType.NUMBER },
  sugar: { type: SchemaType.NUMBER },
  saturated_fat: { type: SchemaType.NUMBER },
  cholesterol: { type: SchemaType.NUMBER },
  sodium: { type: SchemaType.NUMBER },
  potassium: { type: SchemaType.NUMBER },
  calcium: { type: SchemaType.NUMBER },
  iron: { type: SchemaType.NUMBER },
  magnesium: { type: SchemaType.NUMBER },
  zinc: { type: SchemaType.NUMBER },
  vitamin_a: { type: SchemaType.NUMBER },
  vitamin_c: { type: SchemaType.NUMBER },
  vitamin_d: { type: SchemaType.NUMBER },
  vitamin_e: { type: SchemaType.NUMBER },
  vitamin_b12: { type: SchemaType.NUMBER },
  vitamin_b6: { type: SchemaType.NUMBER },
  folate: { type: SchemaType.NUMBER },
} as const;

const MICRO_PROMPT_INSTRUCTIONS = `
## MICRONUTRIENTES POR ITEM
Para cada item, inclua também os seguintes campos quando disponíveis nas bases TACO/USDA:
- fiber (fibra alimentar, g), sugar (açúcares totais, g), saturated_fat (gordura saturada, g), cholesterol (colesterol, mg)
- sodium (sódio, mg), potassium (potássio, mg), calcium (cálcio, mg), iron (ferro, mg), magnesium (magnésio, mg), zinc (zinco, mg)
- vitamin_a (Vitamina A, mcg), vitamin_c (Vitamina C, mg), vitamin_d (Vitamina D, mcg), vitamin_e (Vitamina E, mg)
- vitamin_b12 (Vitamina B12, mcg), vitamin_b6 (Vitamina B6, mg), folate (Folato, mcg)
Use os valores por 100g da base de dados e escale proporcionalmente ao weightGrams do item. Omita campos que não constam na base para aquele alimento.`;

const getGenAI = () => new GeminiProxy();

// Helper to clean JSON string if Markdown code blocks are present
const cleanJsonString = (str: string) => {
  return str.replace(/```json/g, '').replace(/```/g, '').trim();
};

const MODEL_NAME = "gemini-2.5-flash";
const IMAGE_MODEL_NAME = MODEL_NAME;

const LANG_NAMES: Record<string, string> = {
  pt: 'Portuguese (Brazilian)',
  en: 'English',
  es: 'Spanish'
};

export const analyzeTextLog = async (text: string, language: string = 'pt', profile?: Profile | null): Promise<AIResponse> => {
  try {
    const model = getGenAI().getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            foodName: { type: SchemaType.STRING },
            calories: { type: SchemaType.NUMBER },
            macros: {
              type: SchemaType.OBJECT,
              properties: {
                p: { type: SchemaType.NUMBER },
                c: { type: SchemaType.NUMBER },
                f: { type: SchemaType.NUMBER },
              },
              required: ["p", "c", "f"]
            },
            items: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  quantity: { type: SchemaType.STRING },
                  weightGrams: { type: SchemaType.NUMBER },
                  calories: { type: SchemaType.NUMBER },
                  protein: { type: SchemaType.NUMBER },
                  carbs: { type: SchemaType.NUMBER },
                  fats: { type: SchemaType.NUMBER },
                  micros: {
                    type: SchemaType.OBJECT,
                    properties: { ...MICRO_SCHEMA_PROPERTIES },
                    required: Object.keys(MICRO_SCHEMA_PROPERTIES) as string[],
                  },
                },
                required: ["name", "weightGrams", "calories", "protein", "carbs", "fats", "micros"]
              }
            },
            message: { type: SchemaType.STRING }
          },
          required: ["foodName", "calories", "macros", "items", "message"]
        }
      }
    });

    const langName = LANG_NAMES[language] || LANG_NAMES.pt;

    // Primary source: OpenFoodFacts (free, real data). Falls back to TACO/USDA via Gemini training.
    // Only use the OFf result if the product name is relevant to what was typed — a full-sentence
    // query like "Comi pão francês com tres ovos" can match a completely unrelated product
    // (e.g. Coca-Cola Zero), which would then poison the Gemini prompt as "primary reference".
    const offResult = await searchOpenFoodFacts(text);
    const isOffRelevant = (result: typeof offResult): boolean => {
      if (!result) return false;
      const inputWords = text.toLowerCase().replace(/[^a-záéíóúâêôãõç\s]/g, ' ').split(/\s+/).filter(w => w.length > 3);
      const resultName = result.name.toLowerCase();
      // Accept only if at least one significant word from the input appears in the product name
      return inputWords.some(word => resultName.includes(word));
    };
    const offBlock = isOffRelevant(offResult) ? formatOFFBlock(offResult!) : '';

    // Build user context from profile
    const userContext = profile ? `
## USER PROFILE CONTEXT (USE THIS TO PERSONALIZE FEEDBACK)
- **Name:** ${profile.display_name || 'Not provided'}
- **Goal:** ${profile.goal === 'aesthetic' ? 'Weight loss / Aesthetics' : profile.goal === 'performance' ? 'Muscle gain / Performance' : profile.goal === 'health' ? 'Health / Wellness' : 'Not defined'}
- **Activity Level:** ${profile.activity_level === 'sedentary' ? 'Sedentary' : profile.activity_level === 'moderate' ? 'Moderate' : profile.activity_level === 'intense' ? 'Intense' : 'Not defined'}
- **Weight:** ${profile.weight ? profile.weight + 'kg' : 'Not provided'}
- **Height:** ${profile.height ? profile.height + 'cm' : 'Not provided'}
- **Age:** ${profile.age || 'Not provided'}
- **Gender:** ${normalizeGender(profile.gender) === 'male' ? 'Masculino' : 'Feminino'} (raw: ${profile.gender || 'N/A'})
- **Daily Calorie Target:** ${profile.target_calories ? profile.target_calories + ' kcal' : 'Not defined'}
- **Daily Protein Target:** ${profile.target_protein ? profile.target_protein + 'g' : 'Not defined'}

## CONCORDÂNCIA DE GÊNERO NO CAMPO "message" (OBRIGATÓRIO)
${genderAgreementRule(profile.gender)}
` : '';

    const prompt = `You are Malama, a clinical-grade nutrition analysis engine AND a strict, evidence-based nutritionist who cares about the user's health.

Analyze this food log: "${text}".

${userContext}
${offBlock}
## NUTRITIONAL DATABASE PRIORITY
${offBlock ? '0. **OpenFoodFacts data above** — USE THIS AS PRIMARY REFERENCE if provided above.' : ''}
1. **TACO (Tabela Brasileira de Composição de Alimentos)** — preferred for Brazilian foods (feijão, arroz, carne de sol, pão francês, coxinha, açaí, tapioca, etc.)
2. **USDA FoodData Central (SR Legacy / Foundation Foods)** — for international foods or when TACO has no entry
3. **IBGE POF** — for typical Brazilian portion sizes

## RULES
- Calculate macros per item based on the **exact weightGrams** informed or estimated. Use the per-100g values from the databases above and scale proportionally.
- For composite dishes (e.g. "omelete de 3 ovos com queijo"), break down into individual ingredients with their respective weights and macros.
- Include the "quantity" field in each item when applicable (e.g. "3 unidades", "1 concha média", "2 fatias").
- Round all numeric values to the nearest integer.
- The total calories and macros must equal the sum of all items.

## NUTRITIONIST FEEDBACK GUIDELINES (CRITICAL)
You are NOT just a passive logger. You are a CLINICAL NUTRITIONIST who must provide HONEST, EVIDENCE-BASED feedback PERSONALIZED to the user's profile:

1. **High-calorie meals (>800 kcal for a single meal):** Warn the user about excessive calories and how it impacts THEIR SPECIFIC GOAL
2. **Fried foods (batata frita, frituras, empanados):** ALWAYS warn about health risks - trans fats, inflammation, cardiovascular issues
3. **Ultra-processed foods:** Point out concerns about additives, sodium, and lack of nutrients
4. **Excessive sugar/sodium:** Warn about health implications
5. **Balanced meals:** Praise when appropriate, but still suggest improvements

The "message" field is the human voice of Malama talking to the user — write it like a real nutritionist friend texting back, NOT like a clinical report. Warm, natural, Brazilian-Portuguese coloquial, no robotic phrasing like "Esta refeição forneceu X kcal e Yg de proteína, contribuindo para...". The data stays precise; the message sounds like a person. It should reflect your professional assessment PERSONALIZED to the user:
- If the meal is unhealthy AND user wants to lose weight: "Essa refeição tem muitas calorias (1239 kcal) — mais da metade do seu objetivo diário de ${profile?.target_calories || '???'} kcal. A batata frita é ultraprocessada e vai contra seu objetivo de emagrecimento. Que tal trocar por batata doce assada?"
- If the meal is unhealthy AND user wants muscle gain: "Boa proteína, mas a batata frita adiciona gorduras ruins que podem prejudicar sua performance. Troque por batata doce para ganhar massa de forma saudável."
- If the meal is balanced: "Boa escolha! Refeição equilibrada que se encaixa bem no seu objetivo de ${profile?.goal === 'aesthetic' ? 'emagrecimento' : profile?.goal === 'performance' ? 'ganho de massa' : 'saúde'}."
- If the meal is moderate: "Refeição ok, mas atenção ao tamanho da porção para não ultrapassar suas metas de ${profile?.target_calories || '???'} kcal/dia."

Return a JSON object with:
- foodName (string, overall summary name in ${langName})
- calories (number, total kcal)
- macros (object with p, c, f as numbers for protein, carbs, fats in grams)
- items (array of objects with: name (string in ${langName}), quantity (string, e.g. "2 unidades" — optional), weightGrams (number), calories (number), protein (number), carbs (number), fats (number), plus optional micronutrient fields per item)
- message (string, your professional nutritionist assessment in ${langName} — be honest about unhealthy choices, warn about fried/processed foods, praise balanced meals, ALWAYS reference user's specific goals and targets)
${MICRO_PROMPT_INSTRUCTIONS}

ALL text responses MUST be in ${langName}.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text();

    if (!jsonStr) throw new Error("Empty response");

    return JSON.parse(cleanJsonString(jsonStr)) as AIResponse;
  } catch (error) {
    console.error("Gemini Text Error:", error);
    throw error;
  }
};

/**
 * Lookup nutritional data for a SINGLE specific food item.
 * Unlike analyzeTextLog, this does NOT reinterpret the food name.
 * It returns macros for the exact food as described by the user.
 */
export interface SingleItemNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  micros?: MicroNutrients;
}

export const lookupSingleItem = async (
  foodName: string,
  weightGrams: number,
  language: string = 'pt'
): Promise<SingleItemNutrition> => {

  const model = getGenAI().getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          calories: { type: SchemaType.NUMBER },
          protein: { type: SchemaType.NUMBER },
          carbs: { type: SchemaType.NUMBER },
          fats: { type: SchemaType.NUMBER },
          micros: {
            type: SchemaType.OBJECT,
            properties: { ...MICRO_SCHEMA_PROPERTIES },
            required: Object.keys(MICRO_SCHEMA_PROPERTIES) as string[],
          },
        },
        required: ["calories", "protein", "carbs", "fats", "micros"]
      }
    }
  });

  const langName = LANG_NAMES[language] || LANG_NAMES.pt;

  // Primary source: OpenFoodFacts. Falls back to TACO/USDA via Gemini training.
  const offResult = await searchOpenFoodFacts(foodName);
  const offBlock = offResult ? formatOFFBlock(offResult) : '';

  const prompt = `You are a nutritional database lookup engine. Return the macronutrient values for EXACTLY the food described below. Do NOT substitute or generalize the food.

FOOD: "${foodName}"
WEIGHT: ${weightGrams}g

${offBlock}
## CRITICAL RULES
${offBlock ? '- OpenFoodFacts data above is the PRIMARY REFERENCE — scale the per-100g values to the exact weight.' : ''}
- Return macros for THIS EXACT food, not a generic version.
- "${foodName}" is the food as the user described it. Respect the specific variety, preparation method, and seasoning.
  Examples of distinctions you MUST respect:
  - "arroz japonês" ≠ "arroz branco" (Japanese rice is stickier, slightly more caloric per gram)
  - "sunomono" ≠ "pepino cru" (sunomono includes rice vinegar, sugar, sesame — more carbs)
  - "batata doce assada" ≠ "batata doce cozida" (different water content, different caloric density)
  - "frango grelhado" ≠ "frango frito" (very different fat content)
- Use TACO (Tabela Brasileira de Composição de Alimentos) for Brazilian foods, USDA FoodData Central for international foods.
- Calculate values proportionally from per-100g reference data scaled to ${weightGrams}g.
- Round all values to the nearest integer.

Return JSON: { "calories": number, "protein": number, "carbs": number, "fats": number, "micros": { ...optional micronutrient fields } }
All values in grams except calories (kcal) and micronutrients (see units below). Language for any text: ${langName}.
${MICRO_PROMPT_INSTRUCTIONS}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const jsonStr = response.text();
  if (!jsonStr) throw new Error("Empty response");

  return JSON.parse(cleanJsonString(jsonStr)) as SingleItemNutrition;
};

export const analyzeImageLog = async (base64Image: string, language: string = 'pt'): Promise<AIResponse> => {

  try {
    const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';
    const data = base64Image.split(',')[1];

    const model = getGenAI().getGenerativeModel({
      model: IMAGE_MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            foodName: { type: SchemaType.STRING },
            calories: { type: SchemaType.NUMBER },
            macros: {
              type: SchemaType.OBJECT,
              properties: {
                p: { type: SchemaType.NUMBER },
                c: { type: SchemaType.NUMBER },
                f: { type: SchemaType.NUMBER },
              },
              required: ["p", "c", "f"]
            },
            items: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  quantity: { type: SchemaType.STRING },
                  weightGrams: { type: SchemaType.NUMBER },
                  calories: { type: SchemaType.NUMBER },
                  protein: { type: SchemaType.NUMBER },
                  carbs: { type: SchemaType.NUMBER },
                  fats: { type: SchemaType.NUMBER },
                  micros: {
                    type: SchemaType.OBJECT,
                    properties: { ...MICRO_SCHEMA_PROPERTIES },
                    required: Object.keys(MICRO_SCHEMA_PROPERTIES) as string[],
                  },
                },
                required: ["name", "weightGrams", "calories", "protein", "carbs", "fats", "micros"]
              }
            },
            message: { type: SchemaType.STRING }
          },
          required: ["foodName", "calories", "macros", "items", "message"]
        }
      }
    });

    const langName = LANG_NAMES[language] || LANG_NAMES.pt;
    const prompt = `You are Malama, a clinical-grade nutrition analysis engine. Identify ALL food items visible in this image.

Use TACO (Brazilian foods), USDA FoodData Central, or IBGE POF as nutritional references, in that order.

Rules:
- Estimate each item's weight from visual portion size (use common plate/bowl sizes as reference).
- Scale per-100g macro values to the estimated weight.
- Break composite dishes into individual ingredients when possible.
- Include a "quantity" field (e.g. "1 filé médio", "2 conchas").
- Round all numbers to the nearest integer. Total calories/macros must equal the sum of items.
- "message": short, honest feedback in ${langName}, written in the warm human voice of Malama (a real nutritionist friend), NOT as a clinical report. Natural and coloquial — never robotic phrasing like "Esta refeição forneceu X kcal e Yg de proteína, contribuindo para...".
${MICRO_PROMPT_INSTRUCTIONS}
ALL text MUST be in ${langName}.`;

    const result = await model.generateContent([prompt, { inlineData: { mimeType, data } }]);
    return JSON.parse(result.response.text()) as AIResponse;
  } catch (error) {
    console.error("Image Analysis Error:", error);
    throw error;
  }
};

export interface MealFeedbackContext {
  profile?: Profile | null;
  consumedToday?: { calories: number; protein: number; carbs: number; fats: number };
  targetToday?: { calories: number; protein: number; carbs: number; fats: number };
  activitiesToday?: { name: string; calories_burned: number; duration_seconds?: number; activity_type?: string }[];
  mealTime?: Date;
}

const getMealSlot = (hour: number): string => {
  if (hour >= 5  && hour < 10) return 'café da manhã';
  if (hour >= 10 && hour < 12) return 'lanche da manhã';
  if (hour >= 12 && hour < 15) return 'almoço';
  if (hour >= 15 && hour < 18) return 'lanche da tarde';
  if (hour >= 18 && hour < 22) return 'jantar';
  return 'lanche noturno';
};

export const generateMealFeedback = async (
  items: MealItem[],
  foodName: string,
  language: string = 'pt',
  ctx?: MealFeedbackContext
): Promise<string> => {
  try {
    const model = getGenAI().getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 } as any,
      },
    });
    const langName = LANG_NAMES[language] || LANG_NAMES.pt;
    const itemsList = items
      .map(i => `- ${i.name}: ${i.weightGrams ?? '?'}g (${i.calories}kcal, ${i.protein ?? 0}p/${i.carbs ?? 0}c/${i.fats ?? 0}f)`)
      .join('\n');

    const mealCalories = items.reduce((s, i) => s + (i.calories ?? 0), 0);
    const mealProtein  = items.reduce((s, i) => s + (i.protein  ?? 0), 0);

    // ── Timing block ─────────────────────────────────────────────────────────
    const now = ctx?.mealTime ?? new Date();
    const hour = now.getHours();
    const mealSlot = getMealSlot(hour);
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // ── Daily balance block ───────────────────────────────────────────────────
    let dailyBalanceBlock = '';
    if (ctx?.consumedToday && ctx?.targetToday) {
      const c = ctx.consumedToday;
      const t = ctx.targetToday;
      const calPct  = t.calories > 0 ? Math.round((c.calories / t.calories) * 100) : 0;
      const protRem = Math.max(0, Math.round(t.protein - c.protein));
      const calRem  = Math.max(0, Math.round(t.calories - c.calories));
      dailyBalanceBlock = `
## BALANÇO DO DIA (já inclui esta refeição)
- Calorias consumidas: ${Math.round(c.calories)}kcal de ${Math.round(t.calories)}kcal (${calPct}%)
- Proteína: ${Math.round(c.protein)}g de ${Math.round(t.protein)}g (faltam ${protRem}g)
- Carboidratos: ${Math.round(c.carbs)}g de ${Math.round(t.carbs)}g
- Gorduras: ${Math.round(c.fats)}g de ${Math.round(t.fats)}g
- Calorias restantes no dia: ${calRem}kcal`;
    }

    // ── User profile block ────────────────────────────────────────────────────
    let profileBlock = '';
    if (ctx?.profile) {
      const p = ctx.profile;
      const goalLabel = p.goal === 'aesthetic' ? 'emagrecimento' : p.goal === 'performance' ? 'ganho de massa/performance' : 'saúde';
      const restrictions = Array.isArray(p.dietary_restrictions) && p.dietary_restrictions.length > 0
        ? p.dietary_restrictions.join(', ')
        : 'nenhuma';
      profileBlock = `
## PERFIL DO USUÁRIO
- Objetivo: ${goalLabel}
- Nível de atividade: ${p.activity_level === 'sedentary' ? 'sedentário' : p.activity_level === 'moderate' ? 'moderado' : 'intenso'}
- Restrições alimentares: ${restrictions}
- Peso: ${p.weight ? p.weight + 'kg' : 'não informado'}`;
    }

    // ── Activities block ──────────────────────────────────────────────────────
    let activityBlock = '';
    if (ctx?.activitiesToday && ctx.activitiesToday.length > 0) {
      const acts = ctx.activitiesToday.map(a => {
        const dur = a.duration_seconds ? `${Math.round(a.duration_seconds / 60)} min` : '';
        return `- ${a.name || a.activity_type}: ${a.calories_burned}kcal queimadas${dur ? ' em ' + dur : ''}`;
      }).join('\n');
      activityBlock = `\n## ATIVIDADES FÍSICAS HOJE\n${acts}`;
    }

    const genderRule = genderAgreementRule(ctx?.profile?.gender);

    const prompt = `Você é a Malama — uma nutricionista de verdade, próxima do paciente. Você fala como gente, não como relatório clínico. O usuário acabou de registrar uma refeição e você dá uma reação rápida, como uma nutricionista de confiança comentaria olhando o prato dele. Responda em ${langName}.

## CONCORDÂNCIA DE GÊNERO (OBRIGATÓRIO)
${genderRule}

## REFEIÇÃO REGISTRADA
- Nome: ${foodName}
- Horário: ${timeStr} (${mealSlot})
- Calorias desta refeição: ${Math.round(mealCalories)}kcal | Proteína: ${Math.round(mealProtein)}g
- Itens:
${itemsList}
${profileBlock}
${dailyBalanceBlock}
${activityBlock}

## INSTRUÇÕES DE FEEDBACK
Escreva UM parágrafo enxuto, porém bem elaborado (entre 3 e 5 frases, ~400–650 caracteres). Não é um textão nem uma lista — é um comentário corrido, fluido, de quem entende do assunto.
Seu papel é EDUCAR para uma alimentação mais consciente, não só registrar. Em cada feedback, combine:
1. Uma reação rápida e honesta a ESTA refeição (acerto ou ponto de atenção, sem julgamento).
2. UM "porquê" educativo — explique de forma simples o efeito real no corpo/objetivo do usuário (ex.: por que aquela proteína sacia mais, por que o carbo simples dá pico de energia curto, por que ultraprocessado pesa no plano). Ensine algo aproveitável.
3. UMA orientação prática e específica para a próxima refeição ou para o resto do dia (o que acrescentar/reduzir/equilibrar), ancorada no objetivo e no balanço do dia.
Se houver atividade física hoje E for relevante, conecte em poucas palavras. Escolha o ângulo mais útil — não tente cobrir tudo de uma vez.

## TOM — FALE COMO UMA PESSOA, NÃO COMO UM SISTEMA
- Soe como uma nutricionista de confiança conversando, não como um laudo. Calorosa, leve, encorajadora, sem julgamento, mas com substância — ensina sem dar aula.
- PROIBIDO o estilo de relatório. NUNCA escreva frases como "Seu almoço às 13:10 forneceu 405kcal e 25g de proteína, contribuindo para seu objetivo de saúde". Os números entram só quando ajudam, ditos de forma humana ("já bateu metade da proteína do dia"), nunca como planilha.
- Exemplo de bom tom (ajuste os adjetivos ao gênero do usuário conforme a regra acima): "Boa pedida! Esses ovos te dão proteína de alto valor biológico, que segura a fome por mais tempo e protege a massa muscular enquanto você emagrece. O pão francês entra como energia rápida, então se quiser estender a saciedade, troca por um integral no próximo dia. Pra fechar bem, no jantar capricha numa fonte de fibra — ajuda na digestão e equilibra o que ainda falta da sua meta."
- Pode usar 1 emoji se cair bem. Português coloquial do Brasil.
- NÃO use saudações genéricas, NÃO repita o nome da refeição como título, NÃO faça lista numerada — texto corrido, humano e útil.
- Idioma: ${langName}

Return JSON: {"message": "feedback here"}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(cleanJsonString(result.response.text()));
    return parsed.message || '';
  } catch (error) {
    console.error("Meal feedback generation error:", error);
    return '';
  }
};

export const generatePlanContent = async (profile: any, onboardingData?: any, language: string = 'pt'): Promise<any> => {

  try {
    const model = getGenAI().getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: "application/json" }
    });

    // Build detailed user data section
    let userDataSection = '';

    if (onboardingData) {
      // Use detailed onboarding data if available
      userDataSection = `
      DADOS DETALHADOS DO USUÁRIO (coletados via onboarding):

      Demográficos:
      - Nome: ${onboardingData.fullName || 'N/A'}
      - Idade: ${onboardingData.age || profile.age} anos
      - Sexo: ${onboardingData.biologicalSex || profile.gender}
      - Peso: ${onboardingData.weight || profile.weight}kg
      - Altura: ${onboardingData.height || profile.height}cm

      ${onboardingData.hasBodyComposition ? `
      Composição Corporal:
      - Gordura Corporal: ${onboardingData.bodyFatPercentage}%
      - Massa Muscular: ${onboardingData.muscleMass}kg
      - Massa de Gordura: ${onboardingData.fatMass}kg
      - IMC: ${onboardingData.bmi}
      - Água Corporal: ${onboardingData.bodyWater}%
      ` : ''}

      Atividade Física:
      - Tipos: ${onboardingData.activityTypes?.join(', ') || 'N/A'}
      - Frequência: ${onboardingData.weeklyFrequency || 'N/A'}x por semana
      - Duração média: ${onboardingData.averageDuration || 'N/A'} minutos
      - Intensidade: ${onboardingData.intensity || 'N/A'}

      Hábitos Alimentares:
      - Rotina Atual: ${onboardingData.currentRoutine || 'N/A'}
      - Restrições: ${onboardingData.restrictions?.join(', ') || 'Nenhuma'}
      - Preferências: ${onboardingData.preferences?.join(', ') || 'Nenhuma'}
      - Dietas Anteriores: ${onboardingData.previousDiets || 'Nenhuma'}

      Objetivo Principal: ${onboardingData.mainGoal || profile.goal}
      `;
    } else {
      // Fallback to basic profile data
      userDataSection = `
      DADOS BÁSICOS DO PERFIL:
      - Biotipo: ${profile.biotype}
      - Objetivo: ${profile.goal}
      - Nível de Atividade: ${profile.activity_level}
      - Estatísticas: ${profile.weight}kg, ${profile.height}cm, ${profile.age} anos, ${profile.gender}
      `;
    }

    const mainGoal = onboardingData?.mainGoal || profile.goal || '';
    const restrictions = onboardingData?.restrictions?.join(', ') || '';
    const knowledgeQuery = `Nutrição clínica para objetivo de ${mainGoal}, composição corporal e saúde metabólica. ${restrictions ? `Restrições: ${restrictions}.` : ''}`;
    const guidelineMatches = await NutritionKnowledgeService.search(knowledgeQuery, 5);
    const knowledgeBlock = NutritionKnowledgeService.formatAsContextBlock(guidelineMatches);

    const prompt = `
      Você é Malama, uma nutricionista clínica experiente especializada em composição corporal e saúde metabólica.

      ${userDataSection}
      ${knowledgeBlock}

      SUA TAREFA:
      Crie um plano alimentar DETALHADO e PERSONALIZADO de 3 meses, dividido em 3 fases:

      1. Fase 1 - Adaptação (Semanas 1-4):
         Reorganização alimentar gradual, ajuste de horários, estabelecimento de hábitos sustentáveis

      2. Fase 2 - Progressão/Flow (Semanas 5-8):
         Intensificação das estratégias, otimização de macros, timing de nutrientes, fase de máxima performance

      3. Fase 3 - Consolidação (Semanas 9-12):
         Manutenção de resultados, ajustes finos, autonomia alimentar, preparação para próximo ciclo

      IMPORTANTE:
      - Use TODOS os dados fornecidos
      - Considere restrições e preferências
      - Adapte às atividades físicas
      - Seja específico e prático
      - Tom motivador e empático
      ${knowledgeBlock ? '- Fundamente as estratégias na BASE CIENTÍFICA CURADA acima quando ela for relevante ao caso' : ''}

      Retorne JSON ESTRITO (sem markdown):
      {
        "calories": number (meta calórica diária),
        "macros": {
          "protein": number (gramas),
          "carbs": number (gramas),
          "fats": number (gramas)
        },
        "optimization_tag": string (ex: "Otimizado: Ectomorfo + Performance"),
        "phases": [
          {
            "title": string,
            "tag": string,
            "focus": string (1 frase objetiva — o propósito central da fase, máx 12 palavras),
            "bullets": string[] (exatamente 5 ações concretas e específicas, máx 15 palavras cada)
          }
        ]
      }

      Idioma: ${LANG_NAMES[language] || LANG_NAMES.pt}. TODO o texto DEVE estar neste idioma.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text() || "{}";

    return JSON.parse(cleanJsonString(jsonStr));
  } catch (error) {
    console.error("Gemini Plan Error:", error);
    return {
      calories: 2200,
      macros: { protein: 160, carbs: 220, fats: 70 },
      optimization_tag: "Otimizado: IA Fallback",
      phases: [
        {
          title: "Adaptação", tag: "Fase 1",
          focus: "Reorganizar hábitos e construir base alimentar sustentável",
          bullets: [
            "Estabelecer horários fixos para as 3 refeições principais",
            "Substituir 1 ultraprocessado por dia por opção integral",
            "Atingir meta de ingestão hídrica diária (2L mínimo)",
            "Incluir proteína em todas as refeições principais",
            "Reduzir açúcar adicionado gradualmente ao longo das semanas"
          ]
        },
        {
          title: "Flow", tag: "Fase 2",
          focus: "Intensificar estratégias e otimizar macros para máxima performance",
          bullets: [
            "Ajustar timing de carboidratos ao redor dos treinos",
            "Aumentar ingestão proteica conforme evolução da composição corporal",
            "Implementar estratégias de controle de fome entre refeições",
            "Monitorar energia e ajustar calorias conforme resposta do corpo",
            "Introduzir alimentos funcionais alinhados ao objetivo principal"
          ]
        },
        {
          title: "Consolidação", tag: "Fase 3",
          focus: "Manter resultados e desenvolver autonomia alimentar plena",
          bullets: [
            "Estabilizar o peso e composição corporal alcançados",
            "Praticar flexibilidade alimentar sem perder os hábitos construídos",
            "Aprender a adaptar o plano em situações sociais e viagens",
            "Revisar e ajustar metas para o próximo ciclo trimestral",
            "Consolidar a relação consciente com a comida sem restrições rígidas"
          ]
        }
      ]
    };
  }
};

export const generateDoctorBriefing = async (patient: any): Promise<string> => {

  try {
    const model = getGenAI().getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
      Você é um assistente clínico de IA (Malama Assistant) projetado para médicos endocrinologistas e nutricionistas.
      Seu papel é ler os dados do paciente abaixo e gerar um BRIEFING CLÍNICO EXECUTIVO para o médico ler ANTES da consulta.
      
      DADOS DO PACIENTE:
      Nome: ${patient.name} (${patient.gender}, ${patient.age} anos)
      Físico: Peso Atual ${patient.currentWeight || patient.current_weight || 'N/A'} kg, IMC ${patient.imc || 'N/A'} (${patient.imc_classification || 'N/A'})
      Uso de GLP-1: ${patient.is_glp1_active ? 'Sim' : 'Não'} ${patient.glp1_medication ? '(' + patient.glp1_medication + ')' : ''}
      
      ADESÃO NOS ÚLTIMOS 30 DIAS:
      Taxa de Atividade/Registro: ${patient.adherence?.registration_percentage || 0}%
      Média Calórica: ${patient.adherence?.average_calories || 0} kcal (Meta: ${patient.adherence?.calorie_goal || 0} kcal)
      Média de Proteína: ${patient.adherence?.average_protein || 0}g (Meta: ${patient.adherence?.protein_goal || 0}g)
      
      SINTOMAS RECENTES (Últimos Check-ins):
      ${(patient.symptom_checkins || []).slice(0, 5).map((c: any) => `- ${c.date}: Humor ${c.mood || 'N/A'}, Energia ${c.energy || 'N/A'}. Sintomas relatados: ${c.symptoms?.join(', ') || 'nenhum'}`).join('\n')}
      
      RETORNE UM TEXTO COM A SEGUINTE ESTRUTURA (use Markdown formatado com bullet points, negrito, etc):
      
      ### 📊 Panorama Clínico
      (Resumo da adesão do paciente, avaliando se ele está comendo mais ou menos do que deveria).
      
      ### 🔴 Alertas
      (Aponte sintomas recorrentes negativos: por exemplo, fadiga excessiva, humor péssimo, abandono de registro, etc. Se GLP-1, fique atento a náuseas).
      
      ### 💡 Sugestão para a Consulta
      (Gere 2 perguntas clínicas diretas que o médico DEVE fazer para este paciente logo no início da conversa).
      
      Seja profissional, analítico, conciso e use português do Brasil. O objetivo é ler rápido. Não use introduções genéricas como "Olá doutor", vá direto ao briefing.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "Erro ao gerar o briefing.";
  } catch (error) {
    console.error("Gemini Doctor Briefing Error:", error);
    return "Houve um problema de conexão com a IA. Por favor, tente novamente.";
  }
};
