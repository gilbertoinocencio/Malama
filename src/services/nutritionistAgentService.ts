import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey || 'mock_key');
const MODEL_NAME = "gemini-2.0-flash-exp";

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

    // Create new session
    const welcomeMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'agent',
      content: 'Olá! Sou a nutricionista virtual da NURA. Vou te ajudar a montar um plano alimentar personalizado de 3 meses, baseado em evidências científicas e adaptado à sua realidade.\n\nVou fazer algumas perguntas para conhecer você melhor. Não se preocupe, é rápido e você pode pular perguntas opcionais.\n\nVamos começar?',
      timestamp: new Date(),
    };

    const newSession: OnboardingSession = {
      userId,
      currentStage: 'WELCOME',
      completed: false,
      data: {},
      messages: [welcomeMessage],
    };

    const { data: created, error: createError } = await supabase
      .from('nutritionist_onboarding')
      .insert({
        user_id: userId,
        current_stage: 'WELCOME',
        completed: false,
        data: {},
        messages: [welcomeMessage],
      })
      .select()
      .single();

    if (createError) throw createError;

    return {
      ...newSession,
      id: created.id,
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

    // Generate agent response using Gemini
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
   * Generate agent response using Gemini AI
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
      .map((m) => `${m.role === 'agent' ? 'Nutricionista' : 'Usuário'}: ${m.content}`)
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

      // Fallback response
      return {
        message: 'Desculpe, tive um problema técnico. Pode tentar novamente?',
        extractedData: {},
        nextStage: session.currentStage,
      };
    }
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
