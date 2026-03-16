import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MealSuggestion } from './coachService';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey || 'mock_key');
const MODEL_NAME = "gemini-2.0-flash-exp";

export const MealSuggestionService = {
  /**
   * Generate daily meal suggestions based on user profile and plan phase
   */
  async generateDailySuggestions(userId: string, date: string = new Date().toISOString().split('T')[0]): Promise<MealSuggestion[]> {
    // Check if suggestions already exist for today
    const { data: existing } = await supabase
      .from('meal_suggestions')
      .select('*')
      .eq('user_id', userId)
      .eq('suggestion_date', date);

    if (existing && existing.length > 0) {
      return existing as MealSuggestion[];
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) throw new Error('Profile not found');

    // Get onboarding data for preferences
    const { data: onboarding } = await supabase
      .from('nutritionist_onboarding')
      .select('data')
      .eq('user_id', userId)
      .single();

    const onboardingData = onboarding?.data || {};

    // Generate suggestions using AI
    const suggestions = await this.generateWithAI(profile, onboardingData);

    // Insert into database
    const toInsert = suggestions.map((s) => ({
      user_id: userId,
      suggestion_date: date,
      ...s,
    }));

    const { data: created, error } = await supabase
      .from('meal_suggestions')
      .insert(toInsert)
      .select();

    if (error) throw error;

    return created as MealSuggestion[];
  },

  /**
   * Generate meal suggestions using Gemini AI
   */
  async generateWithAI(profile: any, onboardingData: any): Promise<Partial<MealSuggestion>[]> {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const restrictions = onboardingData.restrictions || [];
    const preferences = onboardingData.preferences || [];
    const goal = profile.goal || 'health';
    const targetCalories = profile.target_calories || 2000;
    const targetProtein = profile.target_protein || 150;
    const targetCarbs = profile.target_carbs || 200;
    const targetFats = profile.target_fats || 70;

    const prompt = `
Você é um nutricionista criando sugestões de refeições para o dia.

**PERFIL DO USUÁRIO:**
- Objetivo: ${goal === 'aesthetic' ? 'Emagrecimento' : goal === 'performance' ? 'Performance/Ganho de Massa' : 'Saúde'}
- Meta Diária: ${targetCalories} kcal | ${targetProtein}g proteína | ${targetCarbs}g carboidratos | ${targetFats}g gorduras
- Restrições: ${restrictions.length > 0 ? restrictions.join(', ') : 'Nenhuma'}
- Preferências: ${preferences.length > 0 ? preferences.join(', ') : 'Variado'}

**TAREFA:**
Crie 6 sugestões de refeições para o dia, distribuídas assim:
1. Café da Manhã (07:00) - ~25% das calorias
2. Lanche da Manhã (10:00) - ~10% das calorias
3. Almoço (12:30) - ~35% das calorias
4. Lanche da Tarde (16:00) - ~10% das calorias
5. Jantar (19:00) - ~20% das calorias
6. Ceia (21:30) - ~5% das calorias (opcional, leve)

**FORMATO DE RESPOSTA (JSON):**
Retorne um array de objetos JSON, cada um com:
{
  "meal_time": "breakfast" | "morning_snack" | "lunch" | "afternoon_snack" | "dinner" | "evening_snack",
  "suggested_hour": "07:00",
  "meal_name": "Nome atraente da refeição",
  "description": "Descrição breve e motivadora",
  "ingredients": [
    { "name": "Ingrediente", "quantity": "quantidade" }
  ],
  "calories": número_inteiro,
  "protein": número_inteiro,
  "carbs": número_inteiro,
  "fats": número_inteiro,
  "reasoning": "Por que esta refeição é ideal agora (1 frase)",
  "alternatives": [
    { "name": "Alternativa 1", "description": "breve descrição" },
    { "name": "Alternativa 2", "description": "breve descrição" }
  ]
}

**REGRAS:**
1. Respeite TODAS as restrições alimentares
2. Seja criativo mas realista (ingredientes acessíveis no Brasil)
3. Varie proteínas, carboidratos e vegetais
4. Total de calorias deve somar ~${targetCalories} kcal
5. Total de proteínas deve somar ~${targetProtein}g
6. Inclua horários sugeridos
7. Reasoning deve explicar o timing (ex: "Carboidratos lentos para energia sustentada pela manhã")

Retorne APENAS o JSON array, sem texto adicional.
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    } catch (error) {
      console.error('Error generating meal suggestions:', error);

      // Fallback with hardcoded suggestions
      return this.getFallbackSuggestions(targetCalories, targetProtein, targetCarbs, targetFats);
    }
  },

  /**
   * Fallback suggestions if AI fails
   */
  getFallbackSuggestions(calories: number, protein: number, carbs: number, fats: number): Partial<MealSuggestion>[] {
    const breakfastCal = Math.round(calories * 0.25);
    const lunchCal = Math.round(calories * 0.35);
    const dinnerCal = Math.round(calories * 0.20);

    return [
      {
        meal_time: 'breakfast',
        suggested_hour: '07:00',
        meal_name: 'Omelete Proteica com Aveia',
        description: 'Café da manhã balanceado para começar o dia com energia',
        ingredients: [
          { name: 'Ovos', quantity: '3 unidades' },
          { name: 'Aveia', quantity: '40g' },
          { name: 'Banana', quantity: '1 média' },
          { name: 'Pasta de amendoim', quantity: '15g' },
        ],
        calories: breakfastCal,
        protein: Math.round(protein * 0.25),
        carbs: Math.round(carbs * 0.25),
        fats: Math.round(fats * 0.25),
        reasoning: 'Proteínas e carboidratos complexos para energia sustentada',
        alternatives: [
          { name: 'Tapioca com Queijo', description: 'Opção sem glúten' },
          { name: 'Vitamina de Whey', description: 'Rápido e prático' },
        ],
      },
      {
        meal_time: 'lunch',
        suggested_hour: '12:30',
        meal_name: 'Peito de Frango com Batata Doce',
        description: 'Almoço completo para máxima performance',
        ingredients: [
          { name: 'Peito de frango', quantity: '150g' },
          { name: 'Batata doce', quantity: '200g' },
          { name: 'Brócolis', quantity: '100g' },
          { name: 'Azeite', quantity: '1 colher de sopa' },
        ],
        calories: lunchCal,
        protein: Math.round(protein * 0.35),
        carbs: Math.round(carbs * 0.35),
        fats: Math.round(fats * 0.35),
        reasoning: 'Refeição completa para recuperação e energia pós-treino',
        alternatives: [
          { name: 'Salmão Grelhado', description: 'Mais ômega-3' },
          { name: 'Carne Magra', description: 'Mais ferro' },
        ],
      },
      {
        meal_time: 'dinner',
        suggested_hour: '19:00',
        meal_name: 'Peixe com Legumes',
        description: 'Jantar leve e nutritivo',
        ingredients: [
          { name: 'Tilápia', quantity: '120g' },
          { name: 'Mix de legumes', quantity: '150g' },
          { name: 'Quinoa', quantity: '60g' },
        ],
        calories: dinnerCal,
        protein: Math.round(protein * 0.20),
        carbs: Math.round(carbs * 0.15),
        fats: Math.round(fats * 0.20),
        reasoning: 'Proteína leve para não atrapalhar o sono',
        alternatives: [
          { name: 'Omelete de Claras', description: 'Menos calorias' },
          { name: 'Frango Desfiado', description: 'Mais proteína' },
        ],
      },
    ];
  },

  /**
   * Get today's suggestions
   */
  async getTodaySuggestions(userId: string): Promise<MealSuggestion[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.generateDailySuggestions(userId, today);
  },

  /**
   * Accept a meal suggestion
   */
  async acceptSuggestion(suggestionId: string): Promise<void> {
    await supabase
      .from('meal_suggestions')
      .update({ accepted: true })
      .eq('id', suggestionId);
  },

  /**
   * Reject a meal suggestion
   */
  async rejectSuggestion(suggestionId: string): Promise<void> {
    await supabase
      .from('meal_suggestions')
      .update({ accepted: false })
      .eq('id', suggestionId);
  },

  /**
   * Mark suggestion as logged (meal was registered)
   */
  async markAsLogged(suggestionId: string, mealId: string): Promise<void> {
    await supabase
      .from('meal_suggestions')
      .update({ logged: true, logged_meal_id: mealId })
      .eq('id', suggestionId);
  },
};
