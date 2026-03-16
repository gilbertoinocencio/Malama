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

    console.log('🔍 Onboarding data for meal suggestions:', onboardingData);

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

    // Extract all relevant data from onboarding
    const restrictions = onboardingData.restrictions || [];
    const preferences = onboardingData.preferences || [];
    const currentRoutine = onboardingData.currentRoutine || '';
    const intermittentFasting = onboardingData.intermittentFasting || { enabled: false };
    const activityTypes = onboardingData.activityTypes || [];
    const intensity = onboardingData.intensity || 'moderada';
    const gutHealth = onboardingData.gutHealth || 5;
    const energyLevel = onboardingData.energyLevel || 5;
    const sleepQuality = onboardingData.sleepQuality || 5;
    const stressLevel = onboardingData.stressLevel || 5;
    const biotype = onboardingData.biotype || profile.biotype || 'meso';

    const goal = profile.goal || 'health';
    const targetCalories = profile.target_calories || 2000;
    const targetProtein = profile.target_protein || 150;
    const targetCarbs = profile.target_carbs || 200;
    const targetFats = profile.target_fats || 70;

    // Calculate meal times based on intermittent fasting
    let mealTimes = {
      breakfast: '07:00',
      morningSnack: '10:00',
      lunch: '12:30',
      afternoonSnack: '16:00',
      dinner: '19:00',
      eveningSnack: '21:30'
    };

    if (intermittentFasting.enabled) {
      const window = intermittentFasting.window || '16:8';
      if (window === '16:8') {
        mealTimes = {
          breakfast: '12:00',
          morningSnack: '', // Skip
          lunch: '14:00',
          afternoonSnack: '17:00',
          dinner: '19:30',
          eveningSnack: '' // Skip (outside window)
        };
      } else if (window === '18:6') {
        mealTimes = {
          breakfast: '13:00',
          morningSnack: '', // Skip
          lunch: '15:00',
          afternoonSnack: '', // Skip
          dinner: '18:30',
          eveningSnack: '' // Skip
        };
      } else if (window === '20:4') {
        mealTimes = {
          breakfast: '14:00',
          morningSnack: '', // Skip
          lunch: '16:00',
          afternoonSnack: '', // Skip
          dinner: '17:30',
          eveningSnack: '' // Skip
        };
      }
    }

    // Build context string with all personalization factors
    let contextInfo = '';

    // Dietary restrictions and preferences
    if (restrictions.includes('Vegetariano') || restrictions.includes('Vegano')) {
      const isVegan = restrictions.includes('Vegano');
      contextInfo += `\n- ⚠️ CRÍTICO: Dieta ${isVegan ? 'VEGANA' : 'VEGETARIANA'}`;
      if (isVegan) {
        contextInfo += '\n  * ZERO produtos animais: sem carne, peixe, frango, ovos, laticínios, mel, gelatina';
        contextInfo += '\n  * Proteínas: tofu, tempeh, grão-de-bico, lentilha, quinoa, seitan';
      } else {
        contextInfo += '\n  * Sem carne, peixe, frango (permitido ovos e laticínios)';
        contextInfo += '\n  * Proteínas: ovos, iogurte, queijo, tofu, leguminosas';
      }
    }

    if (restrictions.includes('Sem Lactose')) {
      contextInfo += '\n- ⚠️ CRÍTICO: SEM LACTOSE';
      contextInfo += '\n  * Substituir: leite → leite de amêndoa/coco/aveia';
      contextInfo += '\n  * Substituir: iogurte → iogurte de coco';
      contextInfo += '\n  * Substituir: queijo → queijo vegetal/nutritional yeast';
    }

    if (restrictions.includes('Sem Glúten')) {
      contextInfo += '\n- ⚠️ CRÍTICO: SEM GLÚTEN';
      contextInfo += '\n  * Evitar: trigo, aveia comum, centeio, cevada';
      contextInfo += '\n  * Usar: aveia sem glúten, tapioca, arroz, quinoa, batata';
    }

    if (restrictions.includes('Halal')) {
      contextInfo += '\n- ⚠️ CRÍTICO: Dieta Halal - sem carne de porco, produtos certificados';
    }

    if (restrictions.includes('Kosher')) {
      contextInfo += '\n- ⚠️ CRÍTICO: Dieta Kosher - sem mistura carne/laticínios, produtos certificados';
    }

    // Intermittent fasting
    if (intermittentFasting.enabled) {
      const window = intermittentFasting.window || '16:8';
      contextInfo += `\n- ⏰ Jejum Intermitente ${window}`;
      contextInfo += `\n  * Ajustar número de refeições e horários conforme janela`;
      contextInfo += `\n  * Não sugerir refeições fora do período de alimentação`;
    }

    // Preferences
    if (preferences.length > 0) {
      contextInfo += `\n- 💚 Preferências: ${preferences.join(', ')}`;
      if (preferences.includes('Proteínas')) {
        contextInfo += ' - PRIORIZAR fontes proteicas em todas refeições';
      }
      if (preferences.includes('Frutas')) {
        contextInfo += ' - INCLUIR frutas nos lanches';
      }
      if (preferences.includes('Verduras')) {
        contextInfo += ' - INCLUIR vegetais em almoço e jantar';
      }
    }

    // Activity level and timing
    if (activityTypes.length > 0) {
      contextInfo += `\n- 🏃 Atividades: ${activityTypes.join(', ')} (intensidade ${intensity})`;
      if (activityTypes.includes('Musculação') || activityTypes.includes('CrossFit')) {
        contextInfo += '\n  * Proteína pós-treino é ESSENCIAL (30-40g)';
      }
      if (activityTypes.includes('Corrida') || activityTypes.includes('Ciclismo')) {
        contextInfo += '\n  * Carboidratos antes/durante treino para energia';
      }
      if (activityTypes.includes('Yoga') || activityTypes.includes('Pilates')) {
        contextInfo += '\n  * Refeições leves antes da prática';
      }
    }

    // Health optimizations
    if (gutHealth < 5) {
      contextInfo += '\n- 🦠 Saúde intestinal comprometida:';
      contextInfo += '\n  * INCLUIR probióticos (iogurte natural, kefir, kombucha)';
      contextInfo += '\n  * INCLUIR fibras solúveis (aveia, banana, maçã)';
      contextInfo += '\n  * Evitar alimentos muito processados';
    }

    if (energyLevel < 5) {
      contextInfo += '\n- ⚡ Baixa energia:';
      contextInfo += '\n  * Evitar picos glicêmicos (menos açúcar/carbos simples)';
      contextInfo += '\n  * PRIORIZAR carboidratos complexos (batata-doce, arroz integral)';
      contextInfo += '\n  * Incluir gorduras boas para saciedade';
    }

    if (sleepQuality < 5) {
      contextInfo += '\n- 😴 Sono ruim:';
      contextInfo += '\n  * Evitar cafeína após 14h';
      contextInfo += '\n  * Ceia LEVE (máx 200kcal)';
      contextInfo += '\n  * Incluir triptofano à noite (banana, aveia, castanhas)';
    }

    if (stressLevel > 7) {
      contextInfo += '\n- 😰 Alto estresse:';
      contextInfo += '\n  * Incluir ômega-3 (salmão, chia, linhaça)';
      contextInfo += '\n  * Incluir magnésio (castanhas, cacau, espinafre)';
      contextInfo += '\n  * Evitar açúcar/cafeína em excesso';
    }

    // Biotype-specific
    if (biotype === 'ecto') {
      contextInfo += '\n- 🧬 Biotipo Ectomorfo:';
      contextInfo += '\n  * Dificuldade ganhar peso - AUMENTAR densidade calórica';
      contextInfo += '\n  * Lanches calóricos (pasta de amendoim, nozes, abacate)';
    } else if (biotype === 'endo') {
      contextInfo += '\n- 🧬 Biotipo Endomorfo:';
      contextInfo += '\n  * Facilidade ganhar gordura - CONTROLAR carboidratos simples';
      contextInfo += '\n  * Priorizar proteínas e fibras para saciedade';
    }

    // Current routine insights
    const hasLittleTime = currentRoutine.toLowerCase().includes('pouco tempo') ||
                          currentRoutine.toLowerCase().includes('rápid') ||
                          currentRoutine.toLowerCase().includes('correria');

    if (currentRoutine) {
      contextInfo += `\n- 📝 Rotina: "${currentRoutine}"`;
      if (hasLittleTime) {
        contextInfo += '\n  * ⚠️ APENAS RECEITAS RÁPIDAS (≤15min preparo)';
        contextInfo += '\n  * Priorizar: ovos, wraps, vitaminas, saladas prontas';
      }
    }

    const prompt = `
Você é um nutricionista criando sugestões de refeições PERSONALIZADAS para o dia.

**PERFIL DO USUÁRIO:**
- 🎯 Objetivo: ${goal === 'aesthetic' ? 'Emagrecimento' : goal === 'performance' ? 'Performance/Ganho de Massa' : 'Saúde'}
- 📊 Meta Diária: ${targetCalories} kcal | ${targetProtein}g proteína | ${targetCarbs}g carboidratos | ${targetFats}g gorduras
- 🚫 Restrições: ${restrictions.length > 0 ? restrictions.join(', ') : 'Nenhuma'}
- ❤️ Preferências: ${preferences.length > 0 ? preferences.join(', ') : 'Variado'}${contextInfo}

**TAREFA:**
Crie ${intermittentFasting.enabled ? '4-5' : '6'} sugestões de refeições distribuídas assim:

${!intermittentFasting.enabled ? `
1. Café da Manhã (${mealTimes.breakfast}) - ~25% das calorias
2. Lanche da Manhã (${mealTimes.morningSnack}) - ~10% das calorias
3. Almoço (${mealTimes.lunch}) - ~35% das calorias
4. Lanche da Tarde (${mealTimes.afternoonSnack}) - ~10% das calorias
5. Jantar (${mealTimes.dinner}) - ~20% das calorias
6. Ceia (${mealTimes.eveningSnack}) - ~5% das calorias (opcional, leve)
` : `
1. Primeira Refeição (${mealTimes.breakfast}) - ~35% das calorias
2. Refeição Principal (${mealTimes.lunch}) - ~40% das calorias
3. ${mealTimes.afternoonSnack ? `Lanche (${mealTimes.afternoonSnack}) - ~10% das calorias\n4. ` : ''}Última Refeição (${mealTimes.dinner}) - ~${mealTimes.afternoonSnack ? '15' : '25'}% das calorias
`}

**FORMATO DE RESPOSTA (JSON):**
Retorne um array de objetos JSON, cada um com:
{
  "meal_time": "breakfast" | "morning_snack" | "lunch" | "afternoon_snack" | "dinner" | "evening_snack",
  "suggested_hour": "${mealTimes.breakfast}",
  "meal_name": "Nome atraente da refeição",
  "description": "Descrição breve e motivadora (1 linha)",
  "ingredients": [
    { "name": "Ingrediente", "quantity": "quantidade exata" }
  ],
  "calories": número_inteiro,
  "protein": número_inteiro,
  "carbs": número_inteiro,
  "fats": número_inteiro,
  "reasoning": "Por que esta refeição é ideal agora (1 frase curta)",
  "alternatives": [
    { "name": "Alternativa 1", "description": "breve descrição" },
    { "name": "Alternativa 2", "description": "breve descrição" }
  ]
}

**REGRAS CRÍTICAS:**
1. ⚠️ Respeite TODAS as restrições alimentares listadas acima
2. 🇧🇷 Ingredientes acessíveis no Brasil (supermercado comum)
3. 🔢 Total de calorias DEVE somar ~${targetCalories} kcal (margem ±100kcal)
4. 💪 Total de proteínas DEVE somar ~${targetProtein}g (margem ±10g)
5. ⏰ Use EXATAMENTE os horários sugeridos acima
6. ${hasLittleTime ? '⚡ APENAS RECEITAS RÁPIDAS (≤15min preparo)' : '🍳 Varie preparações (grelhado, assado, cru, etc)'}
7. 🎯 Reasoning deve justificar timing/nutrientes (ex: "Proteína pós-treino para recuperação muscular")
8. 🌈 Varie cores, texturas e fontes proteicas ao longo do dia

Retorne APENAS o JSON array, sem texto adicional antes ou depois.
`;

    console.log('📤 Prompt enviado para IA:', prompt);

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('📥 Resposta da IA:', text.substring(0, 500) + '...');

      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('✅ Sugestões geradas com sucesso:', parsed.length, 'refeições');
      return parsed;
    } catch (error) {
      console.error('❌ Erro ao gerar sugestões com IA:', error);

      // Fallback with hardcoded suggestions
      return this.getSmartFallbackSuggestions(targetCalories, targetProtein, targetCarbs, targetFats, restrictions, intermittentFasting);
    }
  },

  /**
   * Smart fallback suggestions respecting user restrictions
   */
  getSmartFallbackSuggestions(
    calories: number,
    protein: number,
    carbs: number,
    fats: number,
    restrictions: string[],
    intermittentFasting: { enabled: boolean; window?: string }
  ): Partial<MealSuggestion>[] {
    const isVegan = restrictions.includes('Vegano');
    const isVegetarian = restrictions.includes('Vegetariano');
    const isLactoseFree = restrictions.includes('Sem Lactose');
    const isGlutenFree = restrictions.includes('Sem Glúten');

    const breakfastCal = Math.round(calories * 0.25);
    const lunchCal = Math.round(calories * 0.35);
    const dinnerCal = Math.round(calories * 0.20);

    // Adapt protein sources based on restrictions
    let proteinSource = 'Peito de frango';
    let proteinQty = '150g';
    if (isVegan) {
      proteinSource = 'Tofu firme';
      proteinQty = '200g';
    } else if (isVegetarian) {
      proteinSource = 'Ovos';
      proteinQty = '3 unidades';
    }

    // Adapt dairy based on lactose
    let yogurt = 'Iogurte natural';
    if (isLactoseFree || isVegan) {
      yogurt = 'Iogurte de coco';
    }

    // Adapt carbs based on gluten
    let carbSource = 'Aveia';
    let carbQty = '40g';
    if (isGlutenFree) {
      carbSource = 'Tapioca';
      carbQty = '50g';
    }

    const suggestions: Partial<MealSuggestion>[] = [
      {
        meal_time: 'breakfast',
        suggested_hour: intermittentFasting.enabled ? '12:00' : '07:00',
        meal_name: isVegan ? 'Vitamina Proteica Vegana' : 'Omelete Proteica com Aveia',
        description: isVegan ? 'Shake cremoso de proteína vegetal' : 'Café da manhã balanceado para energia',
        ingredients: isVegan ? [
          { name: 'Banana', quantity: '1 média' },
          { name: 'Leite de amêndoas', quantity: '200ml' },
          { name: 'Pasta de amendoim', quantity: '20g' },
          { name: 'Aveia sem glúten', quantity: '40g' },
        ] : [
          { name: proteinSource, quantity: proteinQty },
          { name: carbSource, quantity: carbQty },
          { name: 'Banana', quantity: '1 média' },
          { name: 'Pasta de amendoim', quantity: '15g' },
        ],
        calories: breakfastCal,
        protein: Math.round(protein * 0.25),
        carbs: Math.round(carbs * 0.25),
        fats: Math.round(fats * 0.25),
        reasoning: 'Proteínas e carboidratos complexos para energia sustentada',
        alternatives: [
          { name: isGlutenFree ? 'Tapioca com Pasta de Amendoim' : 'Pão Integral com Ovo', description: 'Opção rápida' },
          { name: yogurt + ' com Granola', description: 'Leve e prático' },
        ],
      },
      {
        meal_time: 'lunch',
        suggested_hour: intermittentFasting.enabled ? '14:00' : '12:30',
        meal_name: isVegan ? 'Bowl Vegano de Grão-de-Bico' : 'Proteína com Batata Doce',
        description: 'Almoço completo para máxima performance',
        ingredients: isVegan ? [
          { name: 'Grão-de-bico', quantity: '150g (cozido)' },
          { name: 'Quinoa', quantity: '100g' },
          { name: 'Mix de vegetais', quantity: '150g' },
          { name: 'Tahine', quantity: '15g' },
        ] : [
          { name: proteinSource, quantity: '150g' },
          { name: 'Batata doce', quantity: '200g' },
          { name: 'Brócolis', quantity: '100g' },
          { name: 'Azeite', quantity: '1 colher de sopa' },
        ],
        calories: lunchCal,
        protein: Math.round(protein * 0.35),
        carbs: Math.round(carbs * 0.35),
        fats: Math.round(fats * 0.35),
        reasoning: 'Refeição completa para recuperação e energia',
        alternatives: [
          { name: isVegan ? 'Lentilha com Arroz Integral' : 'Salmão Grelhado', description: isVegan ? 'Proteína vegetal' : 'Mais ômega-3' },
          { name: isVegan ? 'Tofu Grelhado' : 'Carne Magra', description: 'Variação proteica' },
        ],
      },
      {
        meal_time: 'dinner',
        suggested_hour: intermittentFasting.enabled ? '19:30' : '19:00',
        meal_name: isVegan ? 'Wrap Vegano de Homus' : 'Peixe com Legumes',
        description: 'Jantar leve e nutritivo',
        ingredients: isVegan ? [
          { name: 'Tortilla de milho', quantity: '2 unidades' },
          { name: 'Homus', quantity: '80g' },
          { name: 'Vegetais grelhados', quantity: '100g' },
          { name: 'Rúcula', quantity: '30g' },
        ] : [
          { name: 'Tilápia', quantity: '120g' },
          { name: 'Mix de legumes', quantity: '150g' },
          { name: isGlutenFree ? 'Arroz integral' : 'Quinoa', quantity: '60g' },
        ],
        calories: dinnerCal,
        protein: Math.round(protein * 0.20),
        carbs: Math.round(carbs * 0.15),
        fats: Math.round(fats * 0.20),
        reasoning: 'Proteína leve para não atrapalhar o sono',
        alternatives: [
          { name: isVegan ? 'Salada com Grão-de-Bico' : 'Omelete de Claras', description: 'Menos calorias' },
          { name: isVegan ? 'Sopa de Lentilha' : 'Frango Desfiado', description: 'Mais proteína' },
        ],
      },
    ];

    console.log('⚠️ Usando fallback suggestions (respeitando restrições)');
    return suggestions;
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
