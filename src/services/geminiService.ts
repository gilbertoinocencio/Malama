import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { AIResponse, MicroNutrients } from '../types';
import { searchOpenFoodFacts, formatOFFBlock } from './openFoodFactsService';

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

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
// Initialize lazily to prevent crash if API key is missing during module load
let genAI: GoogleGenerativeAI | null = null;

const getGenAI = () => {
  if (!genAI) {
    // Valid key or fallback to prevent crash (requests will fail/be mocked)
    genAI = new GoogleGenerativeAI(apiKey || 'mock_key');
  }
  return genAI;
};

// Helper to clean JSON string if Markdown code blocks are present
const cleanJsonString = (str: string) => {
  return str.replace(/```json/g, '').replace(/```/g, '').trim();
};

const MODEL_NAME = "gemini-2.5-flash";

const LANG_NAMES: Record<string, string> = {
  pt: 'Portuguese (Brazilian)',
  en: 'English',
  es: 'Spanish'
};

export const analyzeTextLog = async (text: string, language: string = 'pt'): Promise<AIResponse> => {
  console.log("Gemini Service: Checking API Key...");
  if (!apiKey) {
    console.error("Gemini Service: API Key is MISSING or empty.");
    throw new Error("API Key configuration missing (Client-Side). Check VITE_GEMINI_API_KEY.");
  }
  console.log("Gemini Service: API Key present (Starts with " + apiKey.substring(0, 4) + ")");

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
    const offResult = await searchOpenFoodFacts(text);
    const offBlock = offResult ? formatOFFBlock(offResult) : '';

    const prompt = `You are NURA, a clinical-grade nutrition analysis engine AND a strict, evidence-based nutritionist who cares about the user's health.

Analyze this food log: "${text}".

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
You are NOT just a passive logger. You are a CLINICAL NUTRITIONIST who must provide HONEST, EVIDENCE-BASED feedback:

1. **High-calorie meals (>800 kcal for a single meal):** Warn the user about excessive calories and suggest it may impact their goals
2. **Fried foods (batata frita, frituras, empanados):** ALWAYS warn about health risks - trans fats, inflammation, cardiovascular issues
3. **Ultra-processed foods:** Point out concerns about additives, sodium, and lack of nutrients
4. **Excessive sugar/sodium:** Warn about health implications
5. **Balanced meals:** Praise when appropriate, but still suggest improvements

The "message" field should reflect your professional assessment:
- If the meal is unhealthy: Be direct but supportive. Example: "Essa refeição tem muitas calorias (1239 kcal) e gordura saturada. A batata frita é um alimento ultraprocessado que pode prejudicar seus objetivos. Que tal trocar por batata assada na próxima?"
- If the meal is balanced: "Boa escolha! Refeição equilibrada com proteínas, carboidratos e gorduras saudáveis."
- If the meal is moderate: "Refeição ok, mas atenção ao tamanho da porção para não ultrapassar suas metas."

Return a JSON object with:
- foodName (string, overall summary name in ${langName})
- calories (number, total kcal)
- macros (object with p, c, f as numbers for protein, carbs, fats in grams)
- items (array of objects with: name (string in ${langName}), quantity (string, e.g. "2 unidades" — optional), weightGrams (number), calories (number), protein (number), carbs (number), fats (number), plus optional micronutrient fields per item)
- message (string, your professional nutritionist assessment in ${langName} — be honest about unhealthy choices, warn about fried/processed foods, praise balanced meals)
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
  if (!apiKey) throw new Error("API Key missing");

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
  if (!apiKey) throw new Error("API Key missing");

  try {
    // Determine mime type from base64 string header or default to png
    const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';
    const data = base64Image.split(',')[1]; // Remove header

    const model = getGenAI().getGenerativeModel({ model: MODEL_NAME });

    const langName = LANG_NAMES[language] || LANG_NAMES.pt;
    const prompt = `You are NURA, a clinical-grade nutrition analysis engine. Identify ALL food items visible in this image.

## NUTRITIONAL DATABASE PRIORITY
Use values from these databases in order of priority:
1. **TACO (Tabela Brasileira de Composição de Alimentos)** — preferred for Brazilian foods
2. **USDA FoodData Central (SR Legacy / Foundation Foods)** — for international foods
3. **IBGE POF** — for typical Brazilian portion sizes

## RULES
- Estimate the weight of each visible item based on visual portion size (use common plate/bowl sizes as reference).
- Calculate macros per item using **per-100g values** from the databases above, scaled to the estimated weight.
- For composite items, break them into individual ingredients when possible.
- Include a "quantity" field (e.g. "1 filé médio", "2 conchas", "1 bowl pequeno").
- Round all numeric values to the nearest integer.
- The total calories and macros must equal the sum of all items.

Return a STRICT JSON string with this structure:
{
  "foodName": string (overall meal name in ${langName}),
  "calories": number (total kcal),
  "macros": { "p": number, "c": number, "f": number },
  "items": [{
    "name": string (in ${langName}),
    "quantity": string (e.g. "1 unidade média"),
    "weightGrams": number,
    "calories": number,
    "protein": number,
    "carbs": number,
    "fats": number,
    "micros": { "fiber": number, "sugar": number, "saturated_fat": number, "cholesterol": number,
      "sodium": number, "potassium": number, "calcium": number, "iron": number, "magnesium": number,
      "zinc": number, "vitamin_a": number, "vitamin_c": number, "vitamin_d": number,
      "vitamin_e": number, "vitamin_b12": number, "vitamin_b6": number, "folate": number } (optional object — omit fields not found in TACO/USDA)
  }],
  "message": string (short motivational phrase in ${langName})
}
${MICRO_PROMPT_INSTRUCTIONS}
ALL text responses MUST be in ${langName}.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType, data } }
    ]);

    const response = await result.response;
    let text = response.text() || "{}";

    // Clean up if it enters markdown mode
    text = cleanJsonString(text);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) text = jsonMatch[0];

    return JSON.parse(text) as AIResponse;
  } catch (error) {
    console.error("Gemini Image Error:", error);
    throw error;
  }
};

export const generatePlanContent = async (profile: any, onboardingData?: any, language: string = 'pt'): Promise<any> => {
  if (!apiKey) throw new Error("API Key missing");

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

    const prompt = `
      Você é NURA, uma nutricionista clínica experiente especializada em composição corporal e saúde metabólica.

      ${userDataSection}

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
            "description": string (200-300 palavras)
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
        { title: "Adaptação", tag: "Fase 1", description: "Recalibrando metabolismo e estabelecendo hábitos alimentares saudáveis." },
        { title: "Flow", tag: "Fase 2", description: "Foco total em performance e otimização de resultados." },
        { title: "Consolidação", tag: "Fase 3", description: "Mantendo os ganhos e desenvolvendo autonomia alimentar." }
      ]
    };
  }
};