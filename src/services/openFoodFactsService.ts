/**
 * OpenFoodFacts Service
 * Free, no API key required. Prioritizes Brazilian products (br.openfoodfacts.org),
 * falls back to global database (world.openfoodfacts.org).
 * Used as primary nutritional data source before Gemini (TACO/USDA fallback).
 */

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

const TIMEOUT_MS = 5000;
const FIELDS = 'product_name,nutriments';
const PAGE_SIZE = 5;

async function fetchOFF(baseUrl: string, query: string): Promise<OFFResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url =
      `${baseUrl}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
      `&search_simple=1&action=process&json=1&fields=${FIELDS}&page_size=${PAGE_SIZE}`;

    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const data = await res.json();
    clearTimeout(timer);

    const products: any[] = data.products || [];
    const product = products.find(
      (p) => p.product_name && (p.nutriments?.['energy-kcal_100g'] ?? 0) > 0
    );
    if (!product) return null;

    const n = product.nutriments;

    // Helper: convert g → mg, round to 1 decimal
    const mg = (key: string): number | undefined => {
      const v = n[key];
      return v != null && v > 0 ? Math.round(v * 1000 * 10) / 10 : undefined;
    };
    // Helper: convert g → mcg, round to 1 decimal
    const mcg = (key: string): number | undefined => {
      const v = n[key];
      return v != null && v > 0 ? Math.round(v * 1_000_000 * 10) / 10 : undefined;
    };
    // Helper: value already in g, return as-is rounded
    const g = (key: string): number | undefined => {
      const v = n[key];
      return v != null && v > 0 ? Math.round(v * 10) / 10 : undefined;
    };

    const per100g: OFFPer100g = {
      calories:      Math.round(n['energy-kcal_100g'] || 0),
      protein:       Math.round((n['proteins_100g'] || 0) * 10) / 10,
      carbs:         Math.round((n['carbohydrates_100g'] || 0) * 10) / 10,
      fats:          Math.round((n['fat_100g'] || 0) * 10) / 10,
      fiber:         g('fiber_100g'),
      sugar:         g('sugars_100g'),
      saturated_fat: g('saturated-fat_100g'),
      sodium:        n['sodium_100g'] != null ? Math.round(n['sodium_100g'] * 1000) : undefined,
      potassium:     mg('potassium_100g'),
      calcium:       mg('calcium_100g'),
      iron:          mg('iron_100g'),
      magnesium:     mg('magnesium_100g'),
      zinc:          mg('zinc_100g'),
      vitamin_a:     mcg('vitamin-a_100g'),
      vitamin_c:     mg('vitamin-c_100g'),
      vitamin_d:     mcg('vitamin-d_100g'),
      vitamin_e:     mg('vitamin-e_100g'),
      vitamin_b12:   mcg('vitamin-b12_100g'),
      vitamin_b6:    mg('vitamin-b6_100g'),
      folate:        mcg('folate_100g'),
    };

    if (per100g.calories <= 0) return null;

    return { name: product.product_name, per100g };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Search OpenFoodFacts for a food item.
 * Tries Brazilian DB first, then global DB.
 * Returns null if not found or on timeout/error (caller falls back to Gemini).
 */
export async function searchOpenFoodFacts(query: string): Promise<OFFResult | null> {
  // Try Brazilian database first
  const brResult = await fetchOFF('https://br.openfoodfacts.org', query);
  if (brResult) return brResult;

  // Fall back to global database
  return fetchOFF('https://world.openfoodfacts.org', query);
}

/**
 * Formats an OFFResult into a prompt block to inject into Gemini.
 * Gemini uses this as primary reference and scales by weight.
 */
export function formatOFFBlock(result: OFFResult): string {
  const n = result.per100g;
  const micros = Object.entries(n)
    .filter(([k, v]) => !['calories','protein','carbs','fats'].includes(k) && v != null)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  return `## DADOS PRIMÁRIOS — OPENFOODFACTS (USE COMO REFERÊNCIA PRINCIPAL)
Produto encontrado: "${result.name}"
Valores por 100g: calorias ${n.calories}kcal | proteína ${n.protein}g | carboidratos ${n.carbs}g | gorduras ${n.fats}g${micros ? `\nMicronutrientes por 100g: ${micros}` : ''}
Escale proporcionalmente ao peso estimado ou informado pelo usuário.`;
}
