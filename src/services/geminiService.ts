import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { AIResponse } from '../types';

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
                  weightGrams: { type: SchemaType.NUMBER },
                  calories: { type: SchemaType.NUMBER },
                  protein: { type: SchemaType.NUMBER },
                  carbs: { type: SchemaType.NUMBER },
                  fats: { type: SchemaType.NUMBER }
                },
                required: ["name", "weightGrams", "calories", "protein", "carbs", "fats"]
              }
            },
            message: { type: SchemaType.STRING }
          },
          required: ["foodName", "calories", "macros", "items", "message"]
        }
      }
    });

    const langName = LANG_NAMES[language] || LANG_NAMES.pt;
    const prompt = `You are NURA, a lifestyle nutrition coach focused on consistency and flow. Analyze this food log: "${text}". 
    Return a JSON object with:
    - foodName (string, overall summary name in ${langName})
    - calories (number, total)
    - macros (object with p, c, f as numbers for protein, carbs, fats in grams)
    - items (array of objects with: name (string in ${langName}), weightGrams (number), calories (number), protein (number), carbs (number), fats (number))
    - message (string, a short motivational phrase in ${langName} about maintaining the flow)
    Approximate values if needed. All macro values should correspond to the estimated weightGrams. ALL text responses MUST be in ${langName}.`;

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

export const analyzeImageLog = async (base64Image: string, language: string = 'pt'): Promise<AIResponse> => {
  if (!apiKey) throw new Error("API Key missing");

  try {
    // Determine mime type from base64 string header or default to png
    const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';
    const data = base64Image.split(',')[1]; // Remove header

    const model = getGenAI().getGenerativeModel({ model: MODEL_NAME });

    const langName = LANG_NAMES[language] || LANG_NAMES.pt;
    const prompt = `You are NURA, a lifestyle nutrition coach. Identify the food in this image. 
    Return a STRICT JSON string with this structure:
    { 
      "foodName": string (in ${langName}), 
      "calories": number, 
      "macros": { "p": number, "c": number, "f": number }, 
      "items": [{ 
        "name": string (in ${langName}), 
        "weightGrams": number, 
        "calories": number,
        "protein": number,
        "carbs": number,
        "fats": number
      }], 
      "message": string (short motivational phrase in ${langName}) 
    }
    All macro values per item should be calculated based on the estimated weightGrams. ALL text responses MUST be in ${langName}.`;

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