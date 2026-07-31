import type { AIResponse, MealItem, MicroNutrients } from '../types';

type UnknownRecord = Record<string, unknown>;

const MICRO_KEYS: (keyof MicroNutrients)[] = [
  'fiber', 'sugar', 'saturated_fat', 'cholesterol', 'sodium', 'potassium',
  'calcium', 'iron', 'magnesium', 'zinc', 'vitamin_a', 'vitamin_c',
  'vitamin_d', 'vitamin_e', 'vitamin_b12', 'vitamin_b6', 'folate',
];

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseFiniteNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && /\d/.test(value)
      ? Number.parseFloat(value.replace(',', '.').replace(/[^\d.-]/g, ''))
      : Number.NaN;
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 10) / 10) : undefined;
};

const toFiniteNumber = (...values: unknown[]): number => {
  for (const value of values) {
    const parsed = parseFiniteNumber(value);
    if (parsed !== undefined) return parsed;
  }
  return 0;
};

const firstText = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

const hasNutritionField = (value: UnknownRecord): boolean => {
  const macros = isRecord(value.macros)
    ? value.macros
    : isRecord(value.nutrients)
      ? value.nutrients
      : {};
  return [
    value.calories, value.kcal, value.protein, value.proteins, value.proteina,
    value.carbs, value.carbohydrates, value.carboidratos, value.fats, value.fat,
    value.gorduras, macros.p, macros.c, macros.f, macros.protein, macros.carbs,
    macros.fats, macros.fat, macros.carbohydrates,
  ].some(candidate => parseFiniteNumber(candidate) !== undefined);
};

const normalizeMicros = (raw: unknown): MicroNutrients | undefined => {
  if (!isRecord(raw)) return undefined;
  const normalized: MicroNutrients = {};
  for (const key of MICRO_KEYS) {
    if (raw[key] !== undefined && raw[key] !== null && raw[key] !== '') {
      normalized[key] = toFiniteNumber(raw[key]);
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const normalizeItem = (raw: unknown, index: number): MealItem | null => {
  if (!isRecord(raw)) return null;
  const macros = isRecord(raw.macros)
    ? raw.macros
    : isRecord(raw.nutrients)
      ? raw.nutrients
      : {};
  const name = firstText(raw.name, raw.foodName, raw.food_name, raw.item, raw.alimento)
    ?? `Item ${index + 1}`;
  const quantity = firstText(raw.quantity, raw.quantidade, raw.portion, raw.porcao);
  const weightGrams = toFiniteNumber(
    raw.weightGrams, raw.weight_grams, raw.grams, raw.weight, raw.pesoGramas, raw.peso,
  );
  const micros = normalizeMicros(raw.micros ?? raw.micronutrients);

  return {
    name,
    ...(quantity ? { quantity } : {}),
    ...(weightGrams > 0 ? { weightGrams } : {}),
    calories: toFiniteNumber(raw.calories, raw.kcal, raw.energy),
    protein: toFiniteNumber(raw.protein, raw.proteins, raw.proteina, macros.p, macros.protein),
    carbs: toFiniteNumber(raw.carbs, raw.carbohydrates, raw.carboidratos, macros.c, macros.carbs, macros.carbohydrates),
    fats: toFiniteNumber(raw.fats, raw.fat, raw.gorduras, raw.gordura, macros.f, macros.fats, macros.fat),
    ...(micros ? { micros } : {}),
  };
};

interface NormalizeMealOptions {
  fallbackName?: string;
  strict?: boolean;
}

/**
 * Converts model/history payloads to the one canonical shape used by meal cards.
 * Model output is untrusted at runtime even when TypeScript says AIResponse.
 */
export const normalizeMealAnalysis = (
  raw: unknown,
  options: NormalizeMealOptions = {},
): AIResponse => {
  const source = isRecord(raw) ? raw : {};
  const rawItems = Array.isArray(source.items)
    ? source.items
    : Array.isArray(source.mealItems)
      ? source.mealItems
    : Array.isArray(source.foods)
      ? source.foods
      : [];
  let items = rawItems
    .map((item, index) => normalizeItem(item, index))
    .filter((item): item is MealItem => item !== null);

  const itemTotals = items.reduce(
    (totals, item) => ({
      calories: totals.calories + toFiniteNumber(item.calories),
      p: totals.p + toFiniteNumber(item.protein),
      c: totals.c + toFiniteNumber(item.carbs),
      f: totals.f + toFiniteNumber(item.fats),
    }),
    { calories: 0, p: 0, c: 0, f: 0 },
  );
  const macros = isRecord(source.macros)
    ? source.macros
    : isRecord(source.nutrients)
      ? source.nutrients
      : {};
  const foodName = firstText(
    source.foodName, source.food_name, source.mealName, source.meal_name,
    source.name, options.fallbackName,
  ) ?? (items.length > 0 ? items.map(item => item.name).join(', ') : 'Refeição');

  const explicitCalories = toFiniteNumber(source.calories, source.kcal, source.energy);
  const calories = explicitCalories > 0 ? explicitCalories : itemTotals.calories;
  const explicitProtein = toFiniteNumber(macros.p, macros.protein, source.protein, source.proteins, source.proteina);
  const explicitCarbs = toFiniteNumber(macros.c, macros.carbs, macros.carbohydrates, source.carbs, source.carbohydrates, source.carboidratos);
  const explicitFats = toFiniteNumber(macros.f, macros.fats, macros.fat, source.fats, source.fat, source.gorduras);
  const normalizedMacros = {
    p: explicitProtein > 0 ? explicitProtein : itemTotals.p,
    c: explicitCarbs > 0 ? explicitCarbs : itemTotals.c,
    f: explicitFats > 0 ? explicitFats : itemTotals.f,
  };

  const hasNutrition = hasNutritionField(source)
    || rawItems.some(item => isRecord(item) && hasNutritionField(item));
  if (options.strict && (!isRecord(raw) || !hasNutrition)) {
    throw new Error('A análise da refeição veio sem dados nutricionais');
  }

  // Some model variants return only totals. Keep the editor usable by synthesizing
  // a single item, while preserving a real items array whenever it exists.
  if (items.length === 0 && hasNutrition) {
    items = [{
      name: foodName,
      calories,
      protein: normalizedMacros.p,
      carbs: normalizedMacros.c,
      fats: normalizedMacros.f,
    }];
  }

  return {
    foodName,
    calories,
    macros: normalizedMacros,
    items,
    ...(typeof source.confidence === 'number' ? { confidence: source.confidence } : {}),
    ...(firstText(source.message, source.feedback, source.mensagem)
      ? { message: firstText(source.message, source.feedback, source.mensagem) }
      : {}),
    ...(typeof source.idRequisicao === 'string' || source.idRequisicao === null
      ? { idRequisicao: source.idRequisicao as string | null }
      : typeof source.requestId === 'string'
        ? { idRequisicao: source.requestId }
        : {}),
  };
};
