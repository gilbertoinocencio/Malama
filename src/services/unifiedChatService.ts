import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey || 'mock_key');
const MODEL_NAME = "gemini-2.0-flash-exp";

// Onboarding Stages (mesma estrutura do nutritionistAgentService)
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

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  stage?: OnboardingStage | null;
  onboarding_data?: any;
  tokens_used?: number;
  context_data?: any;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  session_type: 'onboarding' | 'chat';
  current_stage?: OnboardingStage | null;
  onboarding_completed: boolean;
  onboarding_data?: any;
  started_at: string;
  completed_at?: string | null;
  last_activity_at: string;
}

export const UnifiedChatService = {
  /**
   * Get or create session for user
   */
  async getOrCreateSession(userId: string): Promise<ChatSession> {
    // Try to get existing onboarding session
    let { data: onboardingSession } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('session_type', 'onboarding')
      .single();

    // If onboarding exists and is completed, get/create chat session
    if (onboardingSession?.onboarding_completed) {
      let { data: chatSession } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('session_type', 'chat')
        .single();

      if (!chatSession) {
        // Create chat session
        const { data: newChatSession } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: userId,
            session_type: 'chat',
          })
          .select()
          .single();

        chatSession = newChatSession;
      }

      return chatSession as ChatSession;
    }

    // If no onboarding session, create one
    if (!onboardingSession) {
      const { data: newOnboarding } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          session_type: 'onboarding',
          current_stage: 'WELCOME',
        })
        .select()
        .single();

      onboardingSession = newOnboarding;
    }

    return onboardingSession as ChatSession;
  },

  /**
   * Get chat history
   */
  async getChatHistory(userId: string, limit: number = 100): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }

    return data as ChatMessage[];
  },

  /**
   * Send message and get AI response (auto-detects mode)
   */
  async sendMessage(userId: string, userMessage: string): Promise<ChatMessage> {
    // Get current session
    const session = await this.getOrCreateSession(userId);

    console.log('📍 Current session:', session.session_type, session.current_stage);

    // Save user message
    const { data: userMsg } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        role: 'user',
        content: userMessage,
        stage: session.current_stage,
        onboarding_data: session.onboarding_data || {},
      })
      .select()
      .single();

    // Generate AI response based on mode
    let aiResponse;
    if (session.session_type === 'onboarding' && !session.onboarding_completed) {
      aiResponse = await this.generateOnboardingResponse(userId, userMessage, session);
    } else {
      aiResponse = await this.generateChatResponse(userId, userMessage);
    }

    // Save AI message
    const { data: agentMsg } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        role: 'agent',
        content: aiResponse.content,
        stage: aiResponse.nextStage || session.current_stage,
        onboarding_data: aiResponse.updatedData || session.onboarding_data,
        tokens_used: aiResponse.tokensUsed,
        context_data: aiResponse.context,
      })
      .select()
      .single();

    // Update session if needed
    if (aiResponse.nextStage) {
      await supabase
        .from('chat_sessions')
        .update({
          current_stage: aiResponse.nextStage,
          onboarding_data: aiResponse.updatedData,
          onboarding_completed: aiResponse.nextStage === 'COMPLETED',
          completed_at: aiResponse.nextStage === 'COMPLETED' ? new Date().toISOString() : null,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', session.id);
    }

    return agentMsg as ChatMessage;
  },

  /**
   * Generate onboarding response (estruturado)
   */
  async generateOnboardingResponse(
    userId: string,
    userMessage: string,
    session: ChatSession
  ): Promise<{
    content: string;
    tokensUsed: number;
    nextStage?: OnboardingStage;
    updatedData?: any;
    context?: any;
  }> {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const currentStage = session.current_stage as OnboardingStage;
    const currentData = session.onboarding_data || {};

    // System prompt para onboarding estruturado
    const systemPrompt = `
Você é uma nutricionista conduzindo um atendimento inicial (onboarding).

ESTÁGIO ATUAL: ${currentStage}
DADOS COLETADOS: ${JSON.stringify(currentData, null, 2)}

ESTÁGIOS DO ONBOARDING:
1. WELCOME - Boas-vindas e explicação
2. NAME - Coletar nome completo
3. BIRTH_DATE - Coletar data de nascimento
4. BIOLOGICAL_SEX - Coletar sexo biológico (M/F)
5. HEIGHT_WEIGHT - Coletar altura (cm) e peso (kg)
6. BODY_COMPOSITION_QUESTION - Perguntar se tem dados de composição corporal
7. BODY_COMPOSITION_DATA - Se sim, coletar % gordura, massa muscular
8. ACTIVITY_TYPES - Tipos de atividade física
9. ACTIVITY_FREQUENCY - Frequência semanal
10. ACTIVITY_DURATION - Duração média por sessão
11. ACTIVITY_INTENSITY - Intensidade (leve/moderada/alta)
12. FOOD_ROUTINE - Rotina alimentar atual
13. FOOD_RESTRICTIONS - Restrições (vegano, sem glúten, etc)
14. FOOD_PREFERENCES - O que gosta/não gosta
15. PREVIOUS_DIETS - Dietas anteriores
16. MAIN_GOAL - Objetivo principal
17. COMPLETED - Onboarding finalizado

INSTRUÇÕES:
1. Baseado na mensagem do usuário e no estágio atual, extraia os dados relevantes
2. Valide a resposta (ex: idade deve ser 10-100 anos)
3. Responda de forma empática e avance para próximo estágio
4. Se resposta inválida, peça esclarecimento sem avançar

FORMATO DE RESPOSTA (JSON):
{
  "content": "Sua resposta ao usuário (texto amigável)",
  "extractedData": { "campo": "valor" },
  "nextStage": "PRÓXIMO_ESTÁGIO",
  "isValid": true/false
}

Mensagem do usuário: "${userMessage}"

Responda APENAS com o JSON, sem texto adicional.
`;

    try {
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid JSON response');

      const parsed = JSON.parse(jsonMatch[0]);

      // Merge extracted data
      const updatedData = { ...currentData, ...parsed.extractedData };

      return {
        content: parsed.content,
        tokensUsed: Math.ceil(systemPrompt.length / 4),
        nextStage: parsed.isValid ? parsed.nextStage : currentStage,
        updatedData,
        context: { stage: currentStage },
      };
    } catch (error) {
      console.error('Error in onboarding:', error);
      return {
        content: 'Desculpe, houve um erro. Pode repetir?',
        tokensUsed: 0,
      };
    }
  },

  /**
   * Generate free chat response (não estruturado)
   */
  async generateChatResponse(
    userId: string,
    userMessage: string
  ): Promise<{
    content: string;
    tokensUsed: number;
    context?: any;
  }> {
    // Get user context (same as coachChatService)
    const context = await this.getContext(userId);

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const profile = context.profile;
    const onboarding = context.onboarding;
    const restrictions = onboarding.restrictions || [];
    const preferences = onboarding.preferences || [];
    const goal = profile.goal || 'health';
    const targetCalories = profile.target_calories || 2000;
    const targetProtein = profile.target_protein || 150;

    const systemPrompt = `
Você é uma nutricionista clínica experiente e empática.

**PERFIL DO USUÁRIO:**
- 🎯 Objetivo: ${goal === 'aesthetic' ? 'Emagrecimento' : goal === 'performance' ? 'Performance/Ganho de Massa' : 'Saúde'}
- 📊 Metas: ${targetCalories}kcal | ${targetProtein}g proteína
- 🚫 Restrições: ${restrictions.length > 0 ? restrictions.join(', ') : 'Nenhuma'}
- ❤️ Preferências: ${preferences.length > 0 ? preferences.join(', ') : 'Variado'}

**SEU PAPEL:**
1. Responda de forma empática e personalizada
2. Seja concisa (máx 3 parágrafos)
3. Use emojis moderadamente
4. SEMPRE respeite as restrições alimentares
5. Baseie-se em evidências científicas

Responda à mensagem do usuário de forma natural e útil.
`;

    try {
      const chat = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }],
          },
          {
            role: 'model',
            parts: [{ text: 'Entendido! Pronta para ajudar. 💚' }],
          },
        ],
      });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        tokensUsed: Math.ceil((systemPrompt.length + userMessage.length + text.length) / 4),
        context: { mode: 'chat', profile },
      };
    } catch (error) {
      console.error('Error in chat:', error);
      return {
        content: 'Desculpe, estou com dificuldades técnicas. Tente novamente! 💙',
        tokensUsed: 0,
      };
    }
  },

  /**
   * Get user context for personalization
   */
  async getContext(userId: string): Promise<any> {
    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Get completed onboarding data
    const { data: onboardingSession } = await supabase
      .from('chat_sessions')
      .select('onboarding_data')
      .eq('user_id', userId)
      .eq('session_type', 'onboarding')
      .eq('onboarding_completed', true)
      .single();

    // Get recent meals
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const { data: recentMeals } = await supabase
      .from('meals')
      .select('meal_name, calories, created_at')
      .eq('user_id', userId)
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      profile: profile || {},
      onboarding: onboardingSession?.onboarding_data || {},
      recentMeals: recentMeals || [],
    };
  },

  /**
   * Clear chat history
   */
  async clearHistory(userId: string, sessionType?: 'onboarding' | 'chat'): Promise<void> {
    if (sessionType) {
      // Clear messages from specific session
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('session_type', sessionType)
        .single();

      if (session) {
        await supabase
          .from('chat_messages')
          .delete()
          .eq('user_id', userId);
      }
    } else {
      // Clear all messages
      await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId);
    }
  },

  /**
   * Check if onboarding is completed
   */
  async isOnboardingCompleted(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('chat_sessions')
      .select('onboarding_completed')
      .eq('user_id', userId)
      .eq('session_type', 'onboarding')
      .single();

    return data?.onboarding_completed || false;
  },

  /**
   * Get onboarding data
   */
  async getOnboardingData(userId: string): Promise<any> {
    const { data } = await supabase
      .from('chat_sessions')
      .select('onboarding_data')
      .eq('user_id', userId)
      .eq('session_type', 'onboarding')
      .single();

    return data?.onboarding_data || {};
  },
};
