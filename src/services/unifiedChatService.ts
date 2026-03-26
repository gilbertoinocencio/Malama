import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey || 'mock_key');
const MODEL_NAME = "gemini-1.5-flash";

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
      .maybeSingle();

    // If onboarding exists and is completed, get/create chat session
    if (onboardingSession?.onboarding_completed) {
      let { data: chatSession } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('session_type', 'chat')
        .maybeSingle();

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
   * Generate free chat response — uses V2 profile data + RAG + alerts
   */
  async generateChatResponse(
    userId: string,
    userMessage: string
  ): Promise<{
    content: string;
    tokensUsed: number;
    context?: any;
  }> {
    const context = await this.getContext(userId);
    const profile = context.profile;

    // ── RAG: Retrieve Relevant Guidelines ──
    let guidelinesText = '';
    try {
      const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const embedResult = await embeddingModel.embedContent(userMessage);
      const embedding = embedResult.embedding.values;

      const { data: guidelines } = await supabase.rpc('match_guidelines', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 3
      });
      
      if (guidelines && guidelines.length > 0) {
        guidelinesText = guidelines.map((g: any) => `- [${g.category}] ${g.title}: ${g.content}`).join('\n');
      }
    } catch (err) {
      console.warn('RAG embedding lookup skipped:', err);
    }

    // ── Build rich context from V2 profile ──
    const goalMap: Record<string, string> = {
      'lose_weight': 'Perder peso',
      'maintain_weight': 'Manter peso',
      'gain_weight': 'Ganhar peso / massa muscular',
      'aesthetic': 'Emagrecimento estético',
      'health': 'Saúde geral',
      'performance': 'Performance esportiva',
    };
    const activityMap: Record<string, string> = {
      'sedentary': 'Sedentário (pouca atividade)',
      'light': 'Ligeiramente ativo (exercício leve 1-3x/sem)',
      'moderate': 'Moderadamente ativo (exercício 3-5x/sem)',
      'very': 'Muito ativo (exercício intenso 6-7x/sem)',
      'intense': 'Extremamente ativo (atleta)',
    };
    const genderMap: Record<string, string> = {
      'male': 'Masculino', 'female': 'Feminino', 'non_binary': 'Não-binário'
    };

    const primaryGoal = goalMap[profile.primary_goal] || profile.primary_goal || profile.goal || 'Não definido';
    const gender = genderMap[profile.gender] || profile.gender || 'Não informado';
    const activityLevel = activityMap[profile.activity_level] || profile.activity_level || 'Não informado';
    const restrictions = Array.isArray(profile.dietary_restrictions) && profile.dietary_restrictions.length > 0
      ? profile.dietary_restrictions.join(', ')
      : 'Nenhuma';
    const dietType = profile.diet_type || 'Variada';
    const additionalGoals = Array.isArray(profile.additional_goals) && profile.additional_goals.length > 0
      ? profile.additional_goals.join(', ')
      : 'Nenhum';
    const habitChanges = Array.isArray(profile.habit_changes) && profile.habit_changes.length > 0
      ? profile.habit_changes.join(', ')
      : 'Nenhum';

    const targetCalories = profile.target_calories || 2000;
    const targetProtein = profile.target_protein || 150;
    const targetCarbs = profile.target_carbs || 200;
    const targetFats = profile.target_fats || 65;

    // Historical summary
    const historicalBlock = context.historicalSummary
      ? `\n## MEMÓRIA DE LONGO PRAZO\n${context.historicalSummary}`
      : '';

    // RAG block
    const ragBlock = guidelinesText
      ? `\n## DIRETRIZES CLÍNICAS RELEVANTES (BASE DE CONHECIMENTO)\n${guidelinesText}\n*Use estas diretrizes para fundamentar sua resposta quando relevante.*`
      : '';

    // Reactive alerts
    const alertsBlock = context.dailyAlerts && context.dailyAlerts.length > 0
      ? `\n## ⚠️ ALERTAS REATIVOS DO DIA\n${context.dailyAlerts.join('\n')}\n*Incorpore estes alertas na sua resposta de forma gentil e natural, sugerindo como compensar no resto do dia.*`
      : '';

    // Recent meals
    const mealsBlock = context.recentMeals && context.recentMeals.length > 0
      ? `\n## REFEIÇÕES RECENTES\n${context.recentMeals.map((m: any) => `- ${m.name || m.meal_name}: ${m.calories}kcal (${new Date(m.created_at).toLocaleDateString('pt-BR')})`).join('\n')}`
      : '';

    const systemPrompt = `Você é a **Nura**, uma nutricionista clínica virtual experiente, empática e acolhedora. Você acompanha este paciente de perto e conhece profundamente o perfil dele.

## PERFIL COMPLETO DO PACIENTE
- **Gênero:** ${gender}
- **Idade:** ${profile.age || '?'} anos
- **Peso atual:** ${profile.weight ? profile.weight + 'kg' : 'Não informado'}
- **Altura:** ${profile.height ? profile.height + 'cm' : 'Não informada'}
- **IMC:** ${profile.bmi ? Number(profile.bmi).toFixed(1) : 'N/A'}
- **Peso alvo:** ${profile.target_weight_kg ? profile.target_weight_kg + 'kg' : 'Não definido'}
- **Nível de atividade:** ${activityLevel}

## OBJETIVO E DIETA
- **Objetivo principal:** ${primaryGoal}
- **Objetivos secundários:** ${additionalGoals}
- **Tipo de dieta:** ${dietType}
- **Restrições alimentares:** ${restrictions}
- **Hábitos que quer mudar:** ${habitChanges}
- **Refeições por dia:** ${profile.meals_per_day || 3}
- **Janela alimentar:** ${profile.eating_window_start || '08:00'} - ${profile.eating_window_end || '20:00'}
- **Onde costuma comer:** ${profile.eating_location || 'Não informado'}
- **Conhece jejum intermitente:** ${profile.knows_intermittent_fasting === true ? 'Sim' : profile.knows_intermittent_fasting === false ? 'Não' : 'N/A'}
- **Bebe água suficiente:** ${profile.drinks_enough_water || 'N/A'}

## METAS NUTRICIONAIS DIÁRIAS
- Calorias: ${targetCalories}kcal
- Proteínas: ${targetProtein}g
- Carboidratos: ${targetCarbs}g
- Gorduras: ${targetFats}g
${mealsBlock}${historicalBlock}${ragBlock}${alertsBlock}

## REGRAS DE COMPORTAMENTO
1. **Seja pessoal** — Use os dados do perfil para personalizar CADA resposta. Nunca dê respostas genéricas.
2. **Seja empática** — Aja como uma profissional que realmente se importa com o paciente.
3. **Seja concisa** — Máximo 3 parágrafos, a menos que o paciente peça detalhes.
4. **Respeite SEMPRE** as restrições e o tipo de dieta do paciente.
5. **Use emojis** com moderação (1-3 por mensagem).
6. **Baseie-se em evidências** — Se houver diretrizes clínicas acima, use-as.
7. **Mencione dados reais** — Faça referência ao peso, objetivo, ou metas do paciente quando relevante. Ex: "Como seu objetivo é perder peso e você está com IMC de 26.3..."
8. **Responda em português do Brasil**, de forma natural e acessível.
9. **Sugira ações práticas** — Sempre termine com uma sugestão concreta.`;

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    try {
      // Build conversation history from DB
      const chatHistory = context.recentChatMessages || [];
      const history: any[] = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: `Olá! Sou a Nura, sua nutricionista pessoal 💚 Estou aqui para te ajudar no seu objetivo de ${primaryGoal.toLowerCase()}. Como posso te ajudar?` }] },
      ];

      // Add recent conversation messages for continuity
      for (const msg of chatHistory) {
        history.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }

      const chat = model.startChat({ history });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        tokensUsed: Math.ceil((systemPrompt.length + userMessage.length + text.length) / 4),
        context: { mode: 'chat' },
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
    // Get V2 profile (the single source of truth for user data)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // Get recent meals (last 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const { data: recentMeals } = await supabase
      .from('meals')
      .select('name, calories, created_at')
      .eq('user_id', userId)
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);
      
    // Get latest historical summary (long-term memory)
    const { data: historicalSummaryRecords } = await supabase
      .from('historical_summaries')
      .select('summary')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
      
    const historicalSummary = historicalSummaryRecords && historicalSummaryRecords.length > 0 
      ? historicalSummaryRecords[0].summary 
      : null;

    // Get recent chat messages for conversation continuity (last 10)
    const { data: recentChatMessages } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get daily stats for reactive alerts
    let dailyAlerts: string[] = [];
    try {
      const { StatsService } = await import('./statsService');
      const stats = await StatsService.getDailyStats(userId, new Date());
      
      if (stats.consumedCalories > stats.targetCalories * 1.1) {
        dailyAlerts.push(`ALERTA DE SISTEMA: O usuário já ultrapassou a meta de calorias hoje (${Math.round(stats.consumedCalories)}kcal vs meta ${stats.targetCalories}kcal).`);
      }
      if (stats.macros.carbs > stats.targetMacros.carbs * 1.1) {
        dailyAlerts.push(`ALERTA DE SISTEMA: O consumo de carboidratos está alto hoje (${Math.round(stats.macros.carbs)}g vs meta ${stats.targetMacros.carbs}g).`);
      }
      if (stats.macros.protein < stats.targetMacros.protein * 0.3 && new Date().getHours() > 18) {
        dailyAlerts.push(`ALERTA DE SISTEMA: Fim do dia e consumo de proteína está muito baixo (${Math.round(stats.macros.protein)}g vs meta ${stats.targetMacros.protein}g). Incentive o consumo.`);
      }
    } catch (e) {
      console.warn("Failed to generate daily alerts", e);
    }

    return {
      profile: profile || {},
      recentMeals: recentMeals || [],
      recentChatMessages: (recentChatMessages || []).reverse(), // chronological order
      historicalSummary,
      dailyAlerts
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
      .maybeSingle();

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
      .maybeSingle();

    return data?.onboarding_data || {};
  },
};
