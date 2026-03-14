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
                  quantity: { type: SchemaType.STRING },
                  calories: { type: SchemaType.NUMBER }
                },
                required: ["name", "quantity", "calories"]
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
    - items (array of objects with: name (string in ${langName}), quantity (string, e.g. '1 large', '100g'), calories (number))
    - message (string, a short motivational phrase in ${langName} about maintaining the flow)
    Approximate values if needed. Keep the tone encouraging and scientific but accessible. ALL text responses MUST be in ${langName}.`;

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
      "items": [{ "name": string (in ${langName}), "quantity": string, "calories": number }], 
      "message": string (short motivational phrase in ${langName}) 
    }
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

export const generatePlanContent = async (profile: any, language: string = 'pt'): Promise<any> => {
  if (!apiKey) throw new Error("API Key missing");

  try {
    const model = getGenAI().getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are NURA, an expert nutritionist and fitness coach. 
      Create a 3-Month Quarterly Plan for this user:
      - Biotype: ${profile.biotype}
      - Goal: ${profile.goal}
      - Activity: ${profile.activity_level}
      - Stats: ${profile.weight}kg, ${profile.height}cm, ${profile.age} years, ${profile.gender}
      
      Return a STRICT JSON object (no markdown) with:
      {
        "calories": number (daily target),
        "macros": { "protein": number, "carbs": number, "fats": number },
        "optimization_tag": string (e.g., "Otimizado: Ectomorfo"),
        "phases": [
          { "title": string, "tag": string, "description": string }, // Phase 1 (Month 1)
          { "title": string, "tag": string, "description": string }, // Phase 2 (Month 2 - Flow Focus)
          { "title": string, "tag": string, "description": string }  // Phase 3 (Month 3)
        ]
      }
      
      Ensure the plan is scientifically tailored to the biotype and goal.
      Phase 2 should always be the "Flow" or "Construction" peak phase.
      Language: ${LANG_NAMES[language] || LANG_NAMES.pt}. ALL text MUST be in this language.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text() || "{}";

    return JSON.parse(cleanJsonString(jsonStr));
  } catch (error) {
    console.error("Gemini Plan Error:", error);
    // Mock for fallback
    return {
      calories: 2200,
      macros: { protein: 160, carbs: 220, fats: 70 },
      optimization_tag: "Otimizado: IA Fallback",
      phases: [
        { title: "Adaptação", tag: "Fase 1", description: "Recalibrando metabolismo." },
        { title: "Flow", tag: "Fase 2", description: "Foco total em performance." },
        { title: "Consolidação", tag: "Fase 3", description: "Mantendo os ganhos." }
      ]
    };
  }
};