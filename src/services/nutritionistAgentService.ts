import { supabase } from './supabase';
import { CaramelAI, CARAMEL_AUTO_MODEL } from '../lib/caramelAI';

const genAI = new CaramelAI();
const MODEL_NAME = CARAMEL_AUTO_MODEL;

// Onboarding Stages
export type OnboardingStage =
  | 'WELCOME'
  | 'NAME'
  | 'BIRTH_DATE'
  | 'BIOLOGICAL_SEX'
  | 'HEIGHT_WEIGHT'
  | 'BODY_COMPOSITION_QUESTION'
  | 'BODY_COMPOSITION_DATA'
  | 'ACTIVITY_TYPES'
  | 'ACTIVITY_FREQUENCY'
  | 'ACTIVITY_DURATION'
  | 'ACTIVITY_INTENSITY'
  | 'FOOD_ROUTINE'
  | 'FOOD_RESTRICTIONS'
  | 'FOOD_PREFERENCES'
  | 'PREVIOUS_DIETS'
  | 'MAIN_GOAL'
  | 'COMPLETED';

// Onboarding Data Interface
export interface OnboardingData {
  // Campos vindos do onboarding-stitch que o serviço já consumia sem estarem
  // declarados aqui. Adicionados como opcionais: é correção de declaração,
  // não mudança de comportamento.
  foodRestrictions?: string[];
  foodRestrictionsDetail?: string;
  dietType?: string;
  mealsPerDay?: number;
  eatingLocation?: string;
  additionalGoals?: string[];
  habitChanges?: string[];
  drinksEnoughWater?: string;

  // Demographic
  fullName?: string;
  birthDate?: string;
  age?: number;
  biologicalSex?: 'M' | 'F';
  height?: number; // cm
  weight?: number; // kg

  // Body Composition (optional)
  hasBodyComposition?: boolean;
  muscleMass?: number; // kg
  fatMass?: number; // kg
  bodyWater?: number; // %
  bmi?: number;
  bodyFatPercentage?: number; // %
  waistHipRatio?: number;

  // Physical Activity
  activityTypes?: string[];
  weeklyFrequency?: number;
  averageDuration?: number; // minutes
  intensity?: 'leve' | 'moderada' | 'alta';

  // Eating Habits
  currentRoutine?: string;
  restrictions?: string[];
  preferences?: string[];
  previousDiets?: string;

  // Goal
  mainGoal?: 'emagrecimento' | 'ganho_massa' | 'performance' | 'saude';

  // Wellness (new fields inspired by BitePal)
  intermittentFasting?: {
    enabled: boolean;
    window?: string; // e.g., "16:8", "18:6"
    startTime?: string; // e.g., "12:00"
  };
  gutHealth?: number; // 1-10 scale
  energyLevel?: number; // 1-10 scale
  sleepQuality?: number; // 1-10 scale
  stressLevel?: number; // 1-10 scale

  // Biotype (for profile sync)
  biotype?: 'ecto' | 'meso' | 'endo';
}

export interface ChatMessage {
  id: string;
  role: 'agent' | 'user';
  content: string;
  timestamp: Date;
}

export interface OnboardingSession {
  id?: string;
  userId: string;
  currentStage: OnboardingStage;
  completed: boolean;
  data: OnboardingData;
  messages: ChatMessage[];
  createdAt?: Date;
  updatedAt?: Date;
}

// System Prompt for the Nutritionist Agent
const NUTRITIONIST_SYSTEM_PROMPT = `
Você é uma nutricionista clínica experiente, com foco em composição corporal, saúde metabólica e alimentação baseada em evidências científicas.

Seu papel é conduzir o usuário por um atendimento estruturado e empático, com o objetivo de montar um plano alimentar estratégico com duração de 3 meses.

**REGRAS IMPORTANTES:**
1. Faça APENAS UMA pergunta de cada vez
2. Aguarde a resposta antes de prosseguir
3. Seja empática, clara, educativa e motivadora
4. NUNCA julgue hábitos ou corpo
5. Valide respostas e corrija erros gentilmente
6. Use linguagem acessível (evite jargões técnicos)
7. Incentive mudanças sustentáveis
8. Respeite a realidade e cultura alimentar do usuário
9. NUNCA prescreva medicamentos

**OBJETIVO:**
Criar um plano alimentar completo e personalizado com duração de 3 meses, dividido em 3 fases:
1. Adaptação (semanas 1–4): reorganização alimentar, ajuste de horários e comportamentos
2. Progressão (semanas 5–8): intensificação das estratégias conforme o objetivo
3. Consolidação (semanas 9–12): manutenção dos resultados, ajustes finos, autonomia alimentar

**TOM DE VOZ:**
- Empática e acolhedora
- Motivadora, mas realista
- Educativa sem ser pedante
- Positiva e encorajadora
`;

export const NutritionistAgentService = {
  /**
   * Get or create onboarding session for user
   */
  /**
   * Get or create onboarding session for user
   */
  async getOrCreateSession(userId: string): Promise<OnboardingSession> {
    // Try to fetch existing session
    const { data: existing, error } = await supabase
      .from('nutritionist_onboarding')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing && !error) {
      return {
        id: existing.id,
        userId: existing.user_id,
        currentStage: existing.current_stage as OnboardingStage,
        completed: existing.completed,
        data: existing.data as OnboardingData,
        messages: existing.messages as ChatMessage[],
        createdAt: new Date(existing.created_at),
        updatedAt: new Date(existing.updated_at),
      };
    }

    // Fetch existing profile data to pre-populate onboarding
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const initialData: OnboardingData = {};
    if (profile) {
      if (profile.display_name) initialData.fullName = profile.display_name;

      // Calculate age from date_of_birth
      if (profile.date_of_birth) {
        const birth = new Date(profile.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        initialData.age = age;
      }

      if (profile.gender) {
        initialData.biologicalSex = profile.gender === 'male' ? 'M' : 'F';
      }
      if (profile.height) initialData.height = Number(profile.height);
      if (profile.weight) initialData.weight = Number(profile.weight);
      if (profile.body_fat) initialData.bodyFatPercentage = Number(profile.body_fat);

      if (profile.activity_level) {
        initialData.intensity =
          profile.activity_level === 'sedentary' ? 'leve' :
          profile.activity_level === 'moderate' ? 'moderada' :
          'alta';
      }

      // Pre-populate lifestyle data from onboarding
      if (profile.dietary_restrictions?.length > 0) {
        initialData.foodRestrictions = profile.dietary_restrictions;
      }
      if (profile.dietary_restrictions_detail) {
        initialData.foodRestrictionsDetail = profile.dietary_restrictions_detail;
      }
      if (profile.diet_type) {
        initialData.dietType = profile.diet_type;
      }
      if (profile.meals_per_day) {
        initialData.mealsPerDay = profile.meals_per_day;
      }
      if (profile.eating_location) {
        initialData.eatingLocation = profile.eating_location;
      }
      if (profile.additional_goals?.length > 0) {
        initialData.additionalGoals = profile.additional_goals;
      }
      if (profile.habit_changes?.length > 0) {
        initialData.habitChanges = profile.habit_changes;
      }
      if (profile.drinks_enough_water) {
        initialData.drinksEnoughWater = profile.drinks_enough_water;
      }
    }

    // Determine initial stage based on what data we already have
    const stages: OnboardingStage[] = [
      'WELCOME', 
      'NAME', 
      'BIRTH_DATE', 
      'BIOLOGICAL_SEX', 
      'HEIGHT_WEIGHT', 
      'BODY_COMPOSITION_QUESTION',
      'ACTIVITY_TYPES',
      'ACTIVITY_FREQUENCY',
      'ACTIVITY_DURATION',
      'ACTIVITY_INTENSITY',
      'FOOD_ROUTINE',
      'FOOD_RESTRICTIONS',
      'FOOD_PREFERENCES',
      'PREVIOUS_DIETS',
      'MAIN_GOAL',
      'COMPLETED'
    ];

    let initialStage: OnboardingStage = 'WELCOME';
    
    // Logic to skip stages based on data
    if (!initialData.fullName) initialStage = 'NAME';
    else if (!initialData.age) initialStage = 'BIRTH_DATE';
    else if (!initialData.biologicalSex) initialStage = 'BIOLOGICAL_SEX';
    else if (!initialData.height || !initialData.weight) initialStage = 'HEIGHT_WEIGHT';
    else if (!initialData.activityTypes) initialStage = 'BODY_COMPOSITION_QUESTION';
    else initialStage = 'FOOD_ROUTINE';

    // Build a more descriptive welcome message
    const facts: string[] = [];
    if (initialData.fullName) facts.push(`seu nome (${initialData.fullName})`);
    if (initialData.age) facts.push(`sua idade (${initialData.age} anos)`);
    if (initialData.biologicalSex) facts.push(`seu sexo biológico`);
    if (initialData.weight && initialData.height) facts.push(`seu peso (${initialData.weight}kg) e altura (${initialData.height}cm)`);
    if (initialData.mainGoal) facts.push(`seu objetivo (${initialData.mainGoal})`);

    let content = 'Olá! Sou a nutricionista virtual da Malama. Vou te ajudar a montar um plano alimentar personalizado de 3 meses, baseado em evidências científicas e adaptado à sua realidade.\n\nVou fazer algumas perguntas para conhecer você melhor. Vamos começar?';

    if (facts.length > 0) {
      const factList = facts.join(', ');
      content = `Olá${initialData.fullName ? ' ' + initialData.fullName : ''}! Sou a nutricionista da Malama. Já importei ${factList} do seu perfil para agilizar nosso atendimento.\n\nVamos continuar de onde paramos para montar seu plano de 3 meses?`;
    }

    // Create new session
    const welcomeMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'agent',
      content,
      timestamp: new Date(),
    };

    const { data: created, error: createError } = await supabase
      .from('nutritionist_onboarding')
      .insert({
        user_id: userId,
        current_stage: initialStage,
        completed: false,
        data: initialData,
        messages: [welcomeMessage],
      })
      .select()
      .single();

    if (createError) throw createError;

    return {
      id: created.id,
      userId: created.user_id,
      currentStage: created.current_stage as OnboardingStage,
      completed: created.completed,
      data: created.data as OnboardingData,
      messages: created.messages as ChatMessage[],
      createdAt: new Date(created.created_at),
      updatedAt: new Date(created.updated_at),
    };
  },

  /**
   * Process user message and generate agent response
   */
  async processMessage(
    userId: string,
    userMessage: string
  ): Promise<{ session: OnboardingSession; agentMessage: ChatMessage }> {
    const session = await this.getOrCreateSession(userId);

    // Add user message to history
    const userChatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    session.messages.push(userChatMessage);

    // Generate agent response using Caramel
    const agentResponse = await this.generateAgentResponse(session, userMessage);

    const agentChatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'agent',
      content: agentResponse.message,
      timestamp: new Date(),
    };

    session.messages.push(agentChatMessage);

    // Update session with extracted data and new stage
    session.data = { ...session.data, ...agentResponse.extractedData };
    session.currentStage = agentResponse.nextStage;
    session.completed = agentResponse.nextStage === 'COMPLETED';

    // Save to database
    await supabase
      .from('nutritionist_onboarding')
      .update({
        current_stage: session.currentStage,
        completed: session.completed,
        data: session.data,
        messages: session.messages,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return { session, agentMessage: agentChatMessage };
  },

  /**
   * Helper to clean up content from history to avoid sending large base64 strings to AI
   */
  sanitizeContent(content: string): string {
    // If it's a very large string that looks like base64 image data, truncate it
    if (content.length > 1000 && content.includes('data:image')) {
      return "[Imagem]";
    }
    return content;
  },

  /**
   * Generate agent response using Caramel
   */
  async generateAgentResponse(
    session: OnboardingSession,
    userMessage: string
  ): Promise<{
    message: string;
    extractedData: Partial<OnboardingData>;
    nextStage: OnboardingStage;
  }> {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const conversationHistory = session.messages
      .map((m) => `${m.role === 'agent' ? 'Nutricionista' : 'Usuário'}: ${this.sanitizeContent(m.content)}`)
      .join('\n');

    const prompt = `
${NUTRITIONIST_SYSTEM_PROMPT}

**ESTÁGIO ATUAL:** ${session.currentStage}

**DADOS COLETADOS ATÉ AGORA:**
${JSON.stringify(session.data, null, 2)}

**HISTÓRICO DA CONVERSA:**
${conversationHistory}

**ÚLTIMA MENSAGEM DO USUÁRIO:**
${userMessage}

**SUA TAREFA:**
1. Analise a resposta do usuário
2. Extraia os dados relevantes (se houver)
3. Valide a resposta (se inválida, peça novamente de forma gentil)
4. Determine o próximo estágio do onboarding
5. Faça a próxima pergunta (apenas UMA pergunta)

**FLUXO DE ESTÁGIOS:**
WELCOME → NAME → BIRTH_DATE → BIOLOGICAL_SEX → HEIGHT_WEIGHT → BODY_COMPOSITION_QUESTION
→ (se sim) BODY_COMPOSITION_DATA → ACTIVITY_TYPES → ACTIVITY_FREQUENCY → ACTIVITY_DURATION
→ ACTIVITY_INTENSITY → FOOD_ROUTINE → FOOD_RESTRICTIONS → FOOD_PREFERENCES
→ PREVIOUS_DIETS → MAIN_GOAL → COMPLETED

Retorne um JSON com:
{
  "message": "sua resposta/próxima pergunta",
  "extractedData": { "campo": "valor" },
  "nextStage": "PRÓXIMO_ESTÁGIO"
}

IMPORTANTE:
- Se estiver em WELCOME, vá para NAME e pergunte o nome completo
- Se resposta for inválida, mantenha o mesmo estágio e peça novamente
- Para perguntas opcionais (body composition), permita pular
- Seja natural e conversacional
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        message: parsed.message || 'Desculpe, tive um problema. Pode repetir?',
        extractedData: parsed.extractedData || {},
        nextStage: (parsed.nextStage as OnboardingStage) || session.currentStage,
      };
    } catch (error) {
      console.error('Error generating agent response:', error);

      // Fallback with predefined responses based on stage
      return this.getFallbackResponse(session.currentStage, userMessage);
    }
  },

  /**
   * Get fallback response when Caramel fails
   */
  getFallbackResponse(
    stage: OnboardingStage,
    userMessage: string
  ): {
    message: string;
    extractedData: Partial<OnboardingData>;
    nextStage: OnboardingStage;
  } {
    const fallbacks: Record<OnboardingStage, any> = {
      WELCOME: {
        message: 'Ótimo! Vamos começar. Qual é o seu nome completo?',
        extractedData: {},
        nextStage: 'NAME' as OnboardingStage,
      },
      NAME: {
        message: `Prazer em conhecer você, ${userMessage}! Qual é a sua data de nascimento? (dd/mm/aaaa)`,
        extractedData: { fullName: userMessage },
        nextStage: 'BIRTH_DATE' as OnboardingStage,
      },
      BIRTH_DATE: {
        message: 'Entendi. Qual é o seu sexo biológico?',
        extractedData: { birthDate: userMessage },
        nextStage: 'BIOLOGICAL_SEX' as OnboardingStage,
      },
      BIOLOGICAL_SEX: {
        message: 'Certo! Agora me diga: qual é a sua altura (em cm) e peso atual (em kg)?',
        extractedData: { biologicalSex: userMessage.toLowerCase().includes('fem') ? 'F' : 'M' },
        nextStage: 'HEIGHT_WEIGHT' as OnboardingStage,
      },
      HEIGHT_WEIGHT: {
        message: 'Você possui dados de composição corporal (percentual de gordura, massa muscular)?',
        extractedData: {},
        nextStage: 'BODY_COMPOSITION_QUESTION' as OnboardingStage,
      },
      BODY_COMPOSITION_QUESTION: {
        message: userMessage.toLowerCase().includes('sim')
          ? 'Ótimo! Quais são os seus dados de composição corporal?'
          : 'Sem problemas! Que tipos de atividades físicas você pratica?',
        extractedData: { hasBodyComposition: userMessage.toLowerCase().includes('sim') },
        nextStage: userMessage.toLowerCase().includes('sim') ? 'BODY_COMPOSITION_DATA' as OnboardingStage : 'ACTIVITY_TYPES' as OnboardingStage,
      },
      BODY_COMPOSITION_DATA: {
        message: 'Entendi. Que tipos de atividades físicas você pratica?',
        extractedData: {},
        nextStage: 'ACTIVITY_TYPES' as OnboardingStage,
      },
      ACTIVITY_TYPES: {
        message: 'Legal! Com que frequência você treina por semana?',
        extractedData: { activityTypes: [userMessage] },
        nextStage: 'ACTIVITY_FREQUENCY' as OnboardingStage,
      },
      ACTIVITY_FREQUENCY: {
        message: 'E quanto tempo dura cada sessão de treino, em média?',
        extractedData: {},
        nextStage: 'ACTIVITY_DURATION' as OnboardingStage,
      },
      ACTIVITY_DURATION: {
        message: 'Como você classificaria a intensidade dos seus treinos?',
        extractedData: {},
        nextStage: 'ACTIVITY_INTENSITY' as OnboardingStage,
      },
      ACTIVITY_INTENSITY: {
        message: 'Perfeito! Agora sobre alimentação: como é a sua rotina alimentar atualmente?',
        extractedData: { intensity: userMessage.toLowerCase() as any },
        nextStage: 'FOOD_ROUTINE' as OnboardingStage,
      },
      FOOD_ROUTINE: {
        message: 'Você possui alguma restrição alimentar? (alergias, intolerâncias, vegetariano, etc.)',
        extractedData: { currentRoutine: userMessage },
        nextStage: 'FOOD_RESTRICTIONS' as OnboardingStage,
      },
      FOOD_RESTRICTIONS: {
        message: 'Existem alimentos que você prefere evitar ou que adora comer?',
        extractedData: { restrictions: userMessage === 'Não tenho restrições alimentares' ? [] : [userMessage] },
        nextStage: 'FOOD_PREFERENCES' as OnboardingStage,
      },
      FOOD_PREFERENCES: {
        message: 'Você já seguiu alguma dieta antes? Como foi a experiência?',
        extractedData: { preferences: [userMessage] },
        nextStage: 'PREVIOUS_DIETS' as OnboardingStage,
      },
      PREVIOUS_DIETS: {
        message: 'Por fim, qual é o seu principal objetivo com a nutrição?',
        extractedData: { previousDiets: userMessage },
        nextStage: 'MAIN_GOAL' as OnboardingStage,
      },
      MAIN_GOAL: {
        message: 'Perfeito! Coletei todas as informações. Vou criar um plano personalizado de 3 meses para você!',
        extractedData: {
          mainGoal: userMessage.toLowerCase().includes('emagre')
            ? 'emagrecimento'
            : userMessage.toLowerCase().includes('massa')
            ? 'ganho_massa'
            : userMessage.toLowerCase().includes('performance')
            ? 'performance'
            : 'saude',
        },
        nextStage: 'COMPLETED' as OnboardingStage,
      },
      COMPLETED: {
        message: 'Onboarding completo!',
        extractedData: {},
        nextStage: 'COMPLETED' as OnboardingStage,
      },
    };

    return fallbacks[stage] || {
      message: 'Desculpe, tive um problema. Pode repetir?',
      extractedData: {},
      nextStage: stage,
    };
  },

  /**
   * Get current progress percentage
   */
  getProgress(stage: OnboardingStage): number {
    const stages: OnboardingStage[] = [
      'WELCOME',
      'NAME',
      'BIRTH_DATE',
      'BIOLOGICAL_SEX',
      'HEIGHT_WEIGHT',
      'BODY_COMPOSITION_QUESTION',
      'BODY_COMPOSITION_DATA',
      'ACTIVITY_TYPES',
      'ACTIVITY_FREQUENCY',
      'ACTIVITY_DURATION',
      'ACTIVITY_INTENSITY',
      'FOOD_ROUTINE',
      'FOOD_RESTRICTIONS',
      'FOOD_PREFERENCES',
      'PREVIOUS_DIETS',
      'MAIN_GOAL',
      'COMPLETED',
    ];

    const currentIndex = stages.indexOf(stage);
    const total = stages.length - 1; // Exclude WELCOME

    return Math.round((currentIndex / total) * 100);
  },

  /**
   * Reset onboarding for user
   */
  async resetOnboarding(userId: string): Promise<void> {
    await supabase.from('nutritionist_onboarding').delete().eq('user_id', userId);
  },

  /**
   * Sync onboarding data with profile
   */
  async syncWithProfile(userId: string, onboardingData: OnboardingData): Promise<void> {
    const { ProfileService } = await import('./profileService');

    // Map onboarding goal to profile goal
    let profileGoal: 'aesthetic' | 'health' | 'performance' = 'health';
    if (onboardingData.mainGoal === 'emagrecimento') profileGoal = 'aesthetic';
    else if (onboardingData.mainGoal === 'ganho_massa' || onboardingData.mainGoal === 'performance') profileGoal = 'performance';
    else if (onboardingData.mainGoal === 'saude') profileGoal = 'health';

    // Map intensity/frequency to activity_level
    let activityLevel: 'sedentary' | 'moderate' | 'intense' = 'sedentary';
    if (onboardingData.weeklyFrequency && onboardingData.weeklyFrequency > 0) {
      if (onboardingData.weeklyFrequency >= 5 || onboardingData.intensity === 'alta') {
        activityLevel = 'intense';
      } else if (onboardingData.weeklyFrequency >= 3 || onboardingData.intensity === 'moderada') {
        activityLevel = 'moderate';
      }
    }

    // Map biological sex to gender
    const gender = onboardingData.biologicalSex === 'M' ? 'male' : onboardingData.biologicalSex === 'F' ? 'female' : undefined;

    // Calculate targets if we have all required data
    let targets = {};
    if (onboardingData.weight && onboardingData.height && onboardingData.age && gender && onboardingData.biotype) {
      targets = ProfileService.calculateTargets(
        onboardingData.weight,
        onboardingData.height,
        onboardingData.age,
        gender,
        activityLevel,
        profileGoal,
        onboardingData.biotype
      );
    }

    // Update profile
    await ProfileService.updateProfile(userId, {
      display_name: onboardingData.fullName,
      goal: profileGoal,
      biotype: onboardingData.biotype,
      activity_level: activityLevel,
      weight: onboardingData.weight,
      height: onboardingData.height,
      age: onboardingData.age,
      gender,
      ...(onboardingData.bodyFatPercentage && { body_fat: onboardingData.bodyFatPercentage }),
      ...(targets && {
        target_calories: (targets as any).calories,
        target_protein: (targets as any).protein,
        target_carbs: (targets as any).carbs,
        target_fats: (targets as any).fats,
      }),
    });
  },

  /**
   * Get quick reply suggestions for current stage
   */
  getQuickReplies(stage: OnboardingStage): { label: string; value: string; icon?: string }[] | null {
    const quickReplies: Record<OnboardingStage, { label: string; value: string; icon?: string }[] | null> = {
      WELCOME: [
        { label: 'Vamos começar!', value: 'Sim, quero começar!', icon: 'play_arrow' },
      ],
      NAME: null, // User needs to type their name
      BIRTH_DATE: null, // User needs to type their birth date
      BIOLOGICAL_SEX: [
        { label: 'Masculino', value: 'Masculino', icon: 'man' },
        { label: 'Feminino', value: 'Feminino', icon: 'woman' },
        { label: 'Prefiro não informar', value: 'Prefiro não informar', icon: 'help' },
      ],
      HEIGHT_WEIGHT: null, // User needs to type numbers
      BODY_COMPOSITION_QUESTION: [
        { label: 'Sim, tenho os dados', value: 'Sim', icon: 'check_circle' },
        { label: 'Não tenho', value: 'Não', icon: 'cancel' },
      ],
      BODY_COMPOSITION_DATA: null, // User needs to type data
      ACTIVITY_TYPES: null, // User might have various activities
      ACTIVITY_FREQUENCY: [
        { label: '1-2x por semana', value: '2 vezes por semana' },
        { label: '3-4x por semana', value: '3 vezes por semana' },
        { label: '5+ por semana', value: '5 ou mais vezes por semana' },
        { label: 'Não faço exercícios', value: 'Não pratico atividades físicas' },
      ],
      ACTIVITY_DURATION: [
        { label: 'Menos de 30min', value: 'Menos de 30 minutos' },
        { label: '30-60min', value: 'Entre 30 e 60 minutos' },
        { label: 'Mais de 1h', value: 'Mais de 1 hora' },
      ],
      ACTIVITY_INTENSITY: [
        { label: 'Leve', value: 'Leve', icon: 'sentiment_satisfied' },
        { label: 'Moderada', value: 'Moderada', icon: 'sentiment_neutral' },
        { label: 'Alta', value: 'Alta', icon: 'sentiment_very_satisfied' },
      ],
      FOOD_ROUTINE: null, // User needs to describe their routine
      FOOD_RESTRICTIONS: [
        { label: 'Não tenho restrições', value: 'Não tenho restrições alimentares' },
        { label: 'Tenho restrições', value: 'Sim, tenho algumas restrições' },
      ],
      FOOD_PREFERENCES: null, // User needs to describe preferences
      PREVIOUS_DIETS: [
        { label: 'Nunca fiz dieta', value: 'Nunca fiz dieta antes' },
        { label: 'Já fiz dietas', value: 'Sim, já fiz algumas dietas' },
      ],
      MAIN_GOAL: [
        { label: 'Emagrecimento', value: 'Emagrecimento', icon: 'trending_down' },
        { label: 'Ganho de Massa', value: 'Ganho de massa muscular', icon: 'fitness_center' },
        { label: 'Performance', value: 'Melhorar performance esportiva', icon: 'speed' },
        { label: 'Saúde', value: 'Melhorar saúde geral', icon: 'favorite' },
      ],
      COMPLETED: null,
    };

    return quickReplies[stage] || null;
  },
};
