import { supabase } from './supabase';
import { GeminiProxy } from '../lib/geminiProxy';

const genAI = new GeminiProxy();
const MODEL_NAME = "gemini-2.5-flash";

export interface CoachChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'coach';
  content: string;
  tokens_used?: number;
  context_data?: any;
  created_at: string;
}

export const CoachChatService = {
  /**
   * Get chat history for a user
   */
  async getChatHistory(userId: string, limit: number = 50): Promise<CoachChatMessage[]> {
    // Fetch the most recent `limit` messages in descending order,
    // then reverse so the caller always receives them oldest→newest.
    const { data, error } = await supabase
      .from('coach_chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }

    return (data as CoachChatMessage[]).reverse();
  },

  /**
   * Send a message and get AI response
   */
  async sendMessage(userId: string, userMessage: string): Promise<CoachChatMessage> {
    // Save user message
    const { data: userMsg, error: userError } = await supabase
      .from('coach_chat_messages')
      .insert({
        user_id: userId,
        role: 'user',
        content: userMessage,
      })
      .select()
      .single();

    if (userError) throw userError;

    // Get context for AI
    const context = await this.getContext(userId);

    // Generate AI response
    const aiResponse = await this.generateAIResponse(userMessage, context);

    // Save AI message
    const { data: coachMsg, error: coachError } = await supabase
      .from('coach_chat_messages')
      .insert({
        user_id: userId,
        role: 'coach',
        content: aiResponse.content,
        tokens_used: aiResponse.tokensUsed,
        context_data: context,
      })
      .select()
      .single();

    if (coachError) throw coachError;

    return coachMsg as CoachChatMessage;
  },

  /**
   * Get user context for personalized responses
   */
  async getContext(userId: string): Promise<any> {
    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Get onboarding data
    const { data: onboarding } = await supabase
      .from('nutritionist_onboarding')
      .select('data')
      .eq('user_id', userId)
      .single();

    // Get recent meals (last 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const { data: recentMeals } = await supabase
      .from('meals')
      .select('meal_name, calories, created_at')
      .eq('user_id', userId)
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent check-ins
    const { data: recentCheckins } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(3);

    // Get recent diary notes (last 7 days with content)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: diaryNotes } = await supabase
      .from('daily_logs')
      .select('date, notes, energy_level')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .not('notes', 'is', null)
      .neq('notes', '')
      .order('date', { ascending: false })
      .limit(5);

    return {
      profile: profile || {},
      onboarding: onboarding?.data || {},
      recentMeals: recentMeals || [],
      recentCheckins: recentCheckins || [],
      diaryNotes: diaryNotes || [],
    };
  },

  /**
   * Generate AI response using Gemini
   */
  async generateAIResponse(
    userMessage: string,
    context: any
  ): Promise<{ content: string; tokensUsed: number }> {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const profile = context.profile;
    const onboarding = context.onboarding;
    const recentMeals = context.recentMeals || [];
    const recentCheckins = context.recentCheckins || [];
    const diaryNotes = context.diaryNotes || [];

    // Build context summary
    const restrictions = onboarding.restrictions || [];
    const preferences = onboarding.preferences || [];
    const goal = profile.goal || 'health';
    const targetCalories = profile.target_calories || 2000;
    const targetProtein = profile.target_protein || 150;

    // Recent meals summary
    let mealsSummary = 'Nenhuma refeição recente registrada.';
    if (recentMeals.length > 0) {
      const totalCals = recentMeals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0);
      mealsSummary = `Últimas ${recentMeals.length} refeições (3 dias): ${totalCals}kcal total. Exemplos: ${recentMeals.slice(0, 3).map((m: any) => m.meal_name).join(', ')}`;
    }

    // Recent check-ins summary
    let checkinSummary = 'Nenhum check-in recente.';
    if (recentCheckins.length > 0) {
      const lastCheckin = recentCheckins[0];
      checkinSummary = `Último check-in: Energia ${lastCheckin.energy_level}/10, Fome ${lastCheckin.hunger_level}/10, Humor ${lastCheckin.mood_level}/10`;
    }

    // Diary notes summary
    let diarySummary = '';
    if (diaryNotes.length > 0) {
      const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      diarySummary = '\n- 📔 Diário recente:\n' + diaryNotes
        .map((n: any) => `  ${fmt(n.date)}${n.energy_level ? ` [${n.energy_level}]` : ''}: "${n.notes}"`)
        .join('\n');
    }

    const systemPrompt = `
Você é uma nutricionista clínica experiente e empática, especializada em composição corporal, saúde metabólica e alimentação baseada em evidências científicas.

**PERFIL DO USUÁRIO:**
- 🎯 Objetivo: ${goal === 'aesthetic' ? 'Emagrecimento' : goal === 'performance' ? 'Performance/Ganho de Massa' : 'Saúde'}
- 📊 Metas: ${targetCalories}kcal | ${targetProtein}g proteína
- 🚫 Restrições: ${restrictions.length > 0 ? restrictions.join(', ') : 'Nenhuma'}
- ❤️ Preferências: ${preferences.length > 0 ? preferences.join(', ') : 'Variado'}
- 🍽️ ${mealsSummary}
- 📈 ${checkinSummary}${diarySummary}

**SEU PAPEL:**
1. Responda de forma empática, encorajadora e personalizada
2. Use o contexto do usuário para dar respostas relevantes
3. Seja concisa (máx 3 parágrafos) mas informativa
4. Use emojis moderadamente para tornar a conversa mais amigável
5. Baseie-se em evidências científicas, mas explique de forma simples
6. Se o usuário pedir sugestões, seja específica e prática
7. Se o usuário compartilhar algo, reconheça e valide antes de aconselhar
8. SEMPRE respeite as restrições alimentares do usuário

**TOM:**
- Profissional mas calorosa
- Motivadora sem ser insistente
- Educativa sem ser professoral
- Celebre pequenas vitórias

**EXEMPLOS DE BOA RESPOSTA:**
User: "Estou com muita fome antes de dormir, o que faço?"
Coach: "É super normal sentir fome à noite! 🌙 Considerando seu objetivo de emagrecimento, sugiro uma opção leve mas satisfatória:

Uma das melhores escolhas é um iogurte natural (ou de coco, já que você evita lactose) com algumas amêndoas. Tem proteína para saciedade, triptofano que ajuda no sono, e não vai atrapalhar seus resultados.

Outra opção: chá de camomila com 1 banana pequena. O magnésio da banana relaxa e o carboidrato leve não causa pico de insulina. Evite comer muito perto da hora de dormir (ideal 1-2h antes). Você costuma jantar que horas?"

**AGORA RESPONDA À MENSAGEM DO USUÁRIO:**
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
            parts: [{ text: 'Entendido! Estou pronta para ajudar com orientações nutricionais personalizadas, sempre respeitando as restrições e objetivos do usuário. Vou ser empática, prática e baseada em evidências. Como posso ajudar?' }],
          },
        ],
      });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      const text = response.text();

      // Estimate tokens (rough approximation: 1 token ≈ 4 chars)
      const tokensUsed = Math.ceil((systemPrompt.length + userMessage.length + text.length) / 4);

      console.log('🤖 AI Coach response generated:', text.substring(0, 100) + '...');
      console.log('📊 Tokens used (approx):', tokensUsed);

      return {
        content: text,
        tokensUsed,
      };
    } catch (error) {
      console.error('❌ Error generating AI response:', error);

      // Fallback response
      return {
        content: 'Desculpe, estou com dificuldades técnicas no momento. Tente novamente em instantes! 💙',
        tokensUsed: 0,
      };
    }
  },

  /**
   * Clear chat history for a user
   */
  async clearHistory(userId: string): Promise<void> {
    const { error } = await supabase
      .from('coach_chat_messages')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    console.log('🗑️ Chat history cleared for user:', userId);
  },

  /**
   * Get conversation statistics
   */
  async getStats(userId: string): Promise<{
    totalMessages: number;
    userMessages: number;
    coachMessages: number;
    totalTokens: number;
  }> {
    const { data } = await supabase
      .from('coach_chat_messages')
      .select('role, tokens_used')
      .eq('user_id', userId);

    if (!data) {
      return { totalMessages: 0, userMessages: 0, coachMessages: 0, totalTokens: 0 };
    }

    return {
      totalMessages: data.length,
      userMessages: data.filter(m => m.role === 'user').length,
      coachMessages: data.filter(m => m.role === 'coach').length,
      totalTokens: data.reduce((sum, m) => sum + (m.tokens_used || 0), 0),
    };
  },
};
