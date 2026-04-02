/**
 * OpenFoodFacts Service
 * Free, no API key required. Prioritizes Brazilian products (br.openfoodfacts.org),
 * falls back to global database (world.openfoodfacts.org).
 * Used as primary nutritional data source before Gemini (TACO/USDA fallback).
 */

import { AIResponse, MicroNutrients } from '../types';

export interface OFFPer100g {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  sugar?: number;
  saturated_fat?: number;
  sodium?: number;    // mg
  potassium?: number; // mg
  calcium?: number;   // mg
  iron?: number;      // mg
  magnesium?: number; // mg
  zinc?: number;      // mg
  vitamin_a?: number;   // mcg
  vitamin_c?: number;   // mg
  vitamin_d?: number;   // mcg
  vitamin_e?: number;   // mg
  vitamin_b12?: number; // mcg
  vitamin_b6?: number;  // mg
  folate?: number;      // mcg
}

export interface OFFResult {
  name: string;
  per100g: OFFPer100g;
}

export interface OFFBarcodeResult {
  name: string;
  brand?: string;
  per100g: OFFPer100g;
  servingSizeG?: number;
  imageUrl?: string;
}

const TIMEOUT_MS = 5000;
const FIELDS = 'product_name,nutriments';
const PAGE_SIZE = 5;

// ─── Shared helpers ──────────────────────────────────────────────────

function parseNutriments(n: any): OFFPer100g | null {
  const cal = n['energy-kcal_100g'];
  if (!cal || cal <= 0) return null;

  const mg = (key: string): number | undefined => {
    const v = n[key];
    return v != null && v > 0 ? Math.round(v * 1000 * 10) / 10 : undefined;
  };
  const mcg = (key: string): number | undefined => {
    const v = n[key];
    return v != null && v > 0 ? Math.round(v * 1_000_000 * 10) / 10 : undefined;
  };
  const g = (key: string): number | undefined => {
    const v = n[key];
    return v != null && v > 0 ? Math.round(v * 10) / 10 : undefined;
  };

  return {
    calories: Math.round(cal),
    protein: Math.round((n['proteins_100g'] || 0) * 10) / 10,
    carbs: Math.round((n['carbohydrates_100g'] || 0) * 10) / 10,
    fats: Math.round((n['fat_100g'] || 0) * 10) / 10,
    fiber: g('fiber_100g'),
    sugar: g('sugars_100g'),
    saturated_fat: g('saturated-fat_100g'),
    sodium: n['sodium_100g'] != null ? Math.round(n['sodium_100g'] * 1000) : undefined,
    potassium: mg('potassium_100g'),
    calcium: mg('calcium_100g'),
    iron: mg('iron_100g'),
    magnesium: mg('magnesium_100g'),
    zinc: mg('zinc_100g'),
    vitamin_a: mcg('vitamin-a_100g'),
    vitamin_c: mg('vitamin-c_100g'),
    vitamin_d: mcg('vitamin-d_100g'),
    vitamin_e: mg('vitamin-e_100g'),
    vitamin_b12: mcg('vitamin-b12_100g'),
    vitamin_b6: mg('vitamin-b6_100g'),
    folate: mcg('folate_100g'),
  };
}

function fetchWithTimeout(url: string): { promise: Promise<Response>; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return {
    promise: fetch(url, { signal: controller.signal }),
    clear: () => clearTimeout(timer),
  };
}

// ─── Search by text ──────────────────────────────────────────────────

async function fetchOFF(baseUrl: string, query: string): Promise<OFFResult | null> {
  const { promise, clear } = fetchWithTimeout(
    `${baseUrl}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&fields=${FIELDS}&page_size=${PAGE_SIZE}`
  );

  try {
    const res = await promise;
    clear();
    if (!res.ok) return null;

    const data = await res.json();
    const products: any[] = data.products || [];
    const product = products.find(
      (p) => p.product_name && (p.nutriments?.['energy-kcal_100g'] ?? 0) > 0
    );
    if (!product) return null;

    const per100g = parseNutriments(product.nutriments);
    if (!per100g) return null;

    return { name: product.product_name, per100g };
  } catch {
    clear();
    return null;
  }
}

/**
 * Search OpenFoodFacts by product name.
 * Tries Brazilian DB first, then global DB.
 */
export async function searchOpenFoodFacts(query: string): Promise<OFFResult | null> {
  const brResult = await fetchOFF('https://br.openfoodfacts.org', query);
  if (brResult) return brResult;
  return fetchOFF('https://world.openfoodfacts.org', query);
}

// ─── Lookup by barcode ───────────────────────────────────────────────

async function fetchBarcodeFromHost(host: string, barcode: string): Promise<OFFBarcodeResult | null> {
  const { promise, clear } = fetchWithTimeout(
    `${host}/api/v0/product/${encodeURIComponent(barcode)}.json`
  );

  try {
    const res = await promise;
    clear();
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const product = data.product;
    if (!product.nutriments || !product.product_name) return null;

    const per100g = parseNutriments(product.nutriments);
    if (!per100g) return null;

    let servingSizeG: number | undefined;
    if (product.serving_size) {
      const match = product.serving_size.match(/(\d+(?:[.,]\d+)?)\s*g/i);
      if (match) servingSizeG = parseFloat(match[1].replace(',', '.'));
    }

    return {
      name: product.product_name,
      brand: product.brands || undefined,
      per100g,
      servingSizeG,
      imageUrl: product.image_url || undefined,
    };
  } catch {
    clear();
    return null;
  }
}

/**
 * Lookup a product by barcode (EAN-13/EAN-8/UPC-A) on OpenFoodFacts.
 * Tries the Brazilian database first (better coverage of local products),
 * then falls back to the global database.
 */
export async function lookupBarcode(barcode: string): Promise<OFFBarcodeResult | null> {
  const brResult = await fetchBarcodeFromHost('https://br.openfoodfacts.org', barcode);
  if (brResult) return brResult;
  return fetchBarcodeFromHost('https://world.openfoodfacts.org', barcode);
}

// ─── Convert barcode result → AIResponse ─────────────────────────────

/**
 * Converts an OFFBarcodeResult into an AIResponse compatible with MealLogger.
 * Scales per-100g values to the serving size (or 100g default).
 */
export function barcodeResultToAIResponse(result: OFFBarcodeResult): AIResponse {
  const weight = result.servingSizeG || 100;
  const scale = weight / 100;
  const n = result.per100g;

  const scaleVal = (v: number | undefined) => v != null ? Math.round(v * scale * 10) / 10 : 0;

  const calories = Math.round(n.calories * scale);
  const protein = Math.round(n.protein * scale);
  const carbs = Math.round(n.carbs * scale);
  const fats = Math.round(n.fats * scale);

  // Build micros from available OFF data
  const micros: Partial<MicroNutrients> = {};
  const microKeys: (keyof OFFPer100g)[] = [
    'fiber', 'sugar', 'saturated_fat', 'sodium', 'potassium', 'calcium',
    'iron', 'magnesium', 'zinc', 'vitamin_a', 'vitamin_c', 'vitamin_d',
    'vitamin_e', 'vitamin_b12', 'vitamin_b6', 'folate',
  ];
  for (const key of microKeys) {
    const val = scaleVal(n[key]);
    if (val > 0) {
      (micros as any)[key] = val;
    }
  }

  const foodName = result.brand
    ? `${result.brand} — ${result.name}`
    : result.name;

  const quantity = result.servingSizeG
    ? `1 porção (${weight}g)`
    : `100g`;

  return {
    foodName,
    calories,
    macros: { p: protein, c: carbs, f: fats },
    items: [{
      name: foodName,
      quantity,
      weightGrams: weight,
      calories,
      protein,
      carbs,
      fats,
      micros: Object.keys(micros).length > 0 ? micros as MicroNutrients : undefined,
    }],
  };
}

// ─── Format for Gemini prompt injection ──────────────────────────────

/**
 * Formats an OFFResult into a prompt block to inject into Gemini.
 * Gemini uses this as primary reference and scales by weight.
 */
export function formatOFFBlock(result: OFFResult): string {
  const n = result.per100g;
  const micros = Object.entries(n)
    .filter(([k, v]) => !['calories', 'protein', 'carbs', 'fats'].includes(k) && v != null)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  return `## DADOS PRIMÁRIOS — OPENFOODFACTS (USE COMO REFERÊNCIA PRINCIPAL)
Produto encontrado: "${result.name}"
Valores por 100g: calorias ${n.calories}kcal | proteína ${n.protein}g | carboidratos ${n.carbs}g | gorduras ${n.fats}g${micros ? `\nMicronutrientes por 100g: ${micros}` : ''}
Escale proporcionalmente ao peso informado ou 100g se não houver informação de porção.`;
}

/**
 * Enriches barcode data by searching TACO/USDA via Gemini using the product name.
 * Uses OFF macros as anchor and fills in complete micronutrients from nutritional databases.
 */
export async function enrichBarcodeWithAI(result: OFFBarcodeResult, language: string = 'pt'): Promise<OFFBarcodeResult> {
  const n = result.per100g;

  try {
    // Dynamic import to avoid circular dependency
    const { GoogleGenerativeAI, SchemaType } = await import('@google/generative-ai');
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

    if (!apiKey) return result;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Você é um nutricionista especialista em análise nutricional com acesso às bases TACO (Brasil) e USDA (EUA).

PRODUTO DO CÓDIGO DE BARRAS:
Nome: ${result.name} ${result.brand ? `(${result.brand})` : ''}
Dados confirmados por 100g (OpenFoodFacts - use como referência OBRIGATÓRIA):
- Calorias: ${n.calories}kcal
- Proteínas: ${n.protein}g
- Carboidratos: ${n.carbs}g
- Gorduras: ${n.fats}g

TAREFA:
Busque nas tabelas TACO ou USDA alimentos SIMILARES a este produto e retorne os micronutrientes por 100g.
Use os valores de calorias, proteínas, carbs e gorduras DO OpenFoodFacts (já conferidos).
Complete APENAS os micronutrientes baseando-se em alimentos similares da TACO/USDA.

${language === 'pt' ? `
Exemplos de busca:
- "Monster Energy" → busque por "bebida energética" na TACO/USDA
- "Whey Protein" → busque por "proteína do soro do leite" na TACO
- "Arroz integral" → busque por "arroz, integral, cozido" na TACO

Retorne valores coerentes com o tipo de produto (bebida, lácteo, grão, etc.).` : ''}

Retorne APENAS o JSON abaixo, sem texto adicional:
{
  "sodium": número ou null,
  "potassium": número ou null,
  "calcium": número ou null,
  "iron": número ou null,
  "magnesium": número ou null,
  "zinc": número ou null,
  "vitamin_c": número ou null,
  "vitamin_b12": número ou null,
  "vitamin_b6": número ou null,
  "fiber": número ou null,
  "sugar": número ou null,
  "saturated_fat": número ou null,
  "cholesterol": número ou null
}`;

    const response = await model.generateContent(prompt);
    const text = response.response.text();
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const estimated = JSON.parse(cleanText);

    // Merge estimated micros into per100g, keeping OFF macros intact
    const enriched: OFFPer100g = {
      ...n,
      sodium: estimated.sodium ?? n.sodium,
      potassium: estimated.potassium ?? n.potassium,
      calcium: estimated.calcium ?? n.calcium,
      iron: estimated.iron ?? n.iron,
      magnesium: estimated.magnesium ?? n.magnesium,
      zinc: estimated.zinc ?? n.zinc,
      vitamin_c: estimated.vitamin_c ?? n.vitamin_c,
      vitamin_b12: estimated.vitamin_b12 ?? n.vitamin_b12,
      vitamin_b6: estimated.vitamin_b6 ?? n.vitamin_b6,
      fiber: estimated.fiber ?? n.fiber,
      sugar: estimated.sugar ?? n.sugar,
      saturated_fat: estimated.saturated_fat ?? n.saturated_fat,
      cholesterol: estimated.cholesterol ?? n.cholesterol,
    };

    console.log('[enrichBarcodeWithAI] Enriched with TACO/USDA data:', result.name);
    return { ...result, per100g: enriched };
  } catch (error) {
    console.error('[enrichBarcodeWithAI] Failed to enrich:', error);
    return result; // Return original data if enrichment fails
  }
}
