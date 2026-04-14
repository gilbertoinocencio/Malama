import { supabase } from './supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getLocalDateString } from '../utils/dateUtils';
import { glp1Service } from './glp1Service';
import { WeightLogService, MeasurementSnapshotService } from './weightLogService';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey || 'mock_key');
const MODEL_NAME = "gemini-2.5-flash";

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

    // Helper: get or create a chat session and return it
    const getOrCreateChatSession = async (): Promise<ChatSession> => {
      let { data: chatSession } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('session_type', 'chat')
        .maybeSingle();

      if (!chatSession) {
        const { data: newChatSession } = await supabase
          .from('chat_sessions')
          .insert({ user_id: userId, session_type: 'chat' })
          .select()
          .single();
        chatSession = newChatSession;
      }
      return chatSession as ChatSession;
    };

    // If onboarding session exists and is completed → chat mode
    if (onboardingSession?.onboarding_completed) {
      return getOrCreateChatSession();
    }

    // Fallback: check the profile directly — users who completed onboarding
    // via another flow (profile setup) may not have a chat_sessions record yet
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.onboarding_completed) {
      // Mark onboarding session as completed if it exists, then return chat session
      if (onboardingSession) {
        await supabase
          .from('chat_sessions')
          .update({ onboarding_completed: true })
          .eq('id', onboardingSession.id);
      }
      return getOrCreateChatSession();
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
   * Save a user + agent message pair directly (no AI generation).
   * Used for food-analysis path so those messages persist across sessions.
   */
  async saveDirectMessages(userId: string, userContent: string, agentContent: string): Promise<void> {
    try {
      // Use explicit timestamps 1 ms apart so getChatHistory (ordered by created_at)
      // always returns user message before agent message, even when inserted in the same batch.
      const userTs  = new Date().toISOString();
      const agentTs = new Date(Date.now() + 1).toISOString();
      await supabase.from('chat_messages').insert([
        { user_id: userId, role: 'user',  content: userContent,  stage: null, created_at: userTs  },
        { user_id: userId, role: 'agent', content: agentContent, stage: null, created_at: agentTs },
      ]);
    } catch (e) {
      console.error('Failed to save direct messages:', e);
    }
  },

  /**
   * Send message and get AI response (auto-detects mode)
   */
  async sendMessage(userId: string, userMessage: string): Promise<ChatMessage> {
    try {
      // Get current session
      const session = await this.getOrCreateSession(userId);

      if (!session) throw new Error('Could not get or create session');

      console.log('📍 Current session:', session.session_type, session.current_stage);

      // Save user message (fire-and-forget — don't block on DB errors)
      Promise.resolve(supabase.from('chat_messages').insert({
        user_id: userId,
        role: 'user',
        content: userMessage,
        stage: session.current_stage,
        onboarding_data: session.onboarding_data || {},
      })).catch(() => {});

      // Generate AI response based on mode
      let aiResponse;
      if (session.session_type === 'onboarding' && !session.onboarding_completed) {
        aiResponse = await this.generateOnboardingResponse(userId, userMessage, session);
      } else {
        aiResponse = await this.generateChatResponse(userId, userMessage);
        
        // --- WATER INGESTION INTERCEPTOR ---
        const waterMatch = aiResponse.content.match(/<water_json>([\s\S]*?)<\/water_json>/);
        if (waterMatch) {
          try {
            const parsed = JSON.parse(waterMatch[1]);
            const ml = Number(parsed.ml);
            if (!isNaN(ml) && ml > 0) {
              // 1. Update daily_logs.water_intake (source of truth for dashboard)
              const today = getLocalDateString();
              const { data: existingLog, error: selectError } = await supabase
                .from('daily_logs')
                .select('id, water_intake, water_goal')
                .eq('user_id', userId)
                .eq('date', today)
                .maybeSingle();

              if (selectError) {
                console.error('Water log: failed to read daily_log:', selectError);
              }

              const newWaterIntake = (existingLog?.water_intake || 0) + ml;

              if (existingLog) {
                const { error: updateError } = await supabase
                  .from('daily_logs')
                  .update({ water_intake: newWaterIntake })
                  .eq('id', existingLog.id);
                if (updateError) console.error('Water log: failed to update daily_log:', updateError);
              } else {
                // Fetch profile to calculate personalised water goal
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('weight, activity_level')
                  .eq('id', userId)
                  .maybeSingle();
                const weight = profileData?.weight || 70;
                const activityBonus = profileData?.activity_level === 'intense' ? 600 : profileData?.activity_level === 'moderate' ? 300 : 0;
                const waterGoal = Math.max(3000, Math.round(weight * 35)) + activityBonus;

                const { error: insertError } = await supabase
                  .from('daily_logs')
                  .insert({ user_id: userId, date: today, water_intake: ml, water_goal: waterGoal });
                if (insertError) console.error('Water log: failed to insert daily_log:', insertError);
              }

              // 2. Also update hydration mission progress (gamification)
              const { CoachService } = await import('./coachService');
              const todayMissions = await CoachService.getTodayMissions(userId);
              const hydrationMission = todayMissions.find(m => m.mission_type === 'hydration');
              if (hydrationMission && hydrationMission.id) {
                await CoachService.updateMissionProgress(
                  userId,
                  hydrationMission.id,
                  newWaterIntake
                );
              }
            }
            // Strip the JSON block from the text message to the user
            aiResponse.content = aiResponse.content.replace(/<water_json>[\s\S]*?<\/water_json>/, '').trim();
          } catch (e) {
            console.error('Failed to parse or log water JSON:', e);
          }
        }

        // --- DOSE INGESTION INTERCEPTOR ---
        const doseMatch = aiResponse.content.match(/<dose_json>([\s\S]*?)<\/dose_json>/);
        if (doseMatch) {
          try {
            const doseData = JSON.parse(doseMatch[1]);
            await glp1Service.saveDose(userId, doseData);
          } catch (e) {
            console.error('Failed to parse or save dose JSON:', e);
          }
          // Always strip the block from the displayed message
          aiResponse.content = aiResponse.content.replace(/<dose_json>[\s\S]*?<\/dose_json>/, '').trim();
        }
      }

      // Save AI message (fire-and-forget — don't block on DB errors)
      Promise.resolve(supabase.from('chat_messages').insert({
        user_id: userId,
        role: 'agent',
        content: aiResponse.content,
        stage: aiResponse.nextStage || session.current_stage,
        onboarding_data: aiResponse.updatedData || session.onboarding_data,
        tokens_used: aiResponse.tokensUsed,
        context_data: aiResponse.context,
      })).catch(() => {});

      // Update session if needed (fire-and-forget)
      if (aiResponse.nextStage && session.id) {
        Promise.resolve(supabase.from('chat_sessions').update({
          current_stage: aiResponse.nextStage,
          onboarding_data: aiResponse.updatedData,
          onboarding_completed: aiResponse.nextStage === 'COMPLETED',
          completed_at: aiResponse.nextStage === 'COMPLETED' ? new Date().toISOString() : null,
          last_activity_at: new Date().toISOString(),
        }).eq('id', session.id)).catch(() => {});
      }

      // Return synthetic ChatMessage so caller always gets a valid object
      return {
        id: Date.now().toString(),
        user_id: userId,
        role: 'agent',
        content: aiResponse.content,
        created_at: new Date().toISOString(),
      } as ChatMessage;

    } catch (error) {
      console.error('sendMessage error:', error);
      return {
        id: Date.now().toString(),
        user_id: userId,
        role: 'agent',
        content: 'Desculpe, estou com dificuldades técnicas. Tente novamente! 💙',
        created_at: new Date().toISOString(),
      } as ChatMessage;
    }
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

    // ── GLP-1 dose history (only when mode is active) ──
    let recentDoses: any[] = [];
    if (profile?.glp1_mode) {
      try {
        recentDoses = await glp1Service.getDoseHistory(userId, 3);
      } catch { /* non-blocking */ }
    }

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
    const restrictionsList = Array.isArray(profile.dietary_restrictions) && profile.dietary_restrictions.length > 0
      ? profile.dietary_restrictions.join(', ')
      : 'Nenhuma';
    const restrictionsDetail = profile.dietary_restrictions_detail ? ` (Detalhe: ${profile.dietary_restrictions_detail})` : '';
    const restrictions = `${restrictionsList}${restrictionsDetail}`;
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

    // Rejected meals block — avoid repeating disliked suggestions
    const rejectedBlock = context.rejectedSuggestions && context.rejectedSuggestions.length > 0
      ? `\n## REFEIÇÕES REJEITADAS RECENTEMENTE (NÃO REPITA)\n${context.rejectedSuggestions.map((r: any) => {
          const ingredients = Array.isArray(r.ingredients) && r.ingredients.length > 0
            ? ` (ingredientes: ${r.ingredients.map((i: any) => i.name || i).join(', ')})`
            : '';
          return `- ${r.meal_name}${ingredients}`;
        }).join('\n')}\n*Evite sugerir estas refeições novamente. Se algum ingrediente específico aparece com frequência nas rejeições, provavelmente o paciente não gosta dele — evite-o.*`
      : '';

    // Coaching insights block — high/urgent active insights
    const insightsBlock = context.activeInsights && context.activeInsights.length > 0
      ? `\n## 🔔 INSIGHTS ATIVOS DE COACHING\n${context.activeInsights.map((i: any) =>
          `- [${i.priority.toUpperCase()}] ${i.title}: ${i.message}${Array.isArray(i.action_items) && i.action_items.length > 0 ? ` → Ações: ${i.action_items.join('; ')}` : ''}`
        ).join('\n')}\n*Incorpore estes insights na sua resposta quando relevante, de forma natural e sem soar como alerta técnico.*`
      : '';

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

    // Quarterly plan block — current phase and strategy
    const plan = context.quarterlyPlan;
    let planBlock = '';
    if (plan) {
      const planStart = plan.start_date ? new Date(plan.start_date) : null;
      const planEnd   = plan.end_date   ? new Date(plan.end_date)   : null;
      const now = new Date();
      // Determine current phase (each phase spans 1/3 of the plan duration)
      let currentPhase = plan.phases?.[0];
      if (planStart && planEnd && plan.phases?.length === 3) {
        const totalMs = planEnd.getTime() - planStart.getTime();
        const elapsedMs = now.getTime() - planStart.getTime();
        const phaseFraction = Math.min(Math.floor((elapsedMs / totalMs) * 3), 2);
        currentPhase = plan.phases[phaseFraction];
      }
      const weeksSinceStart = planStart
        ? Math.floor((now.getTime() - planStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
        : null;
      planBlock = `\n## PLANO TRIMESTRAL ATIVO
- **Estratégia:** ${plan.optimization_tag || 'Personalizada'}
- **Período:** ${planStart ? planStart.toLocaleDateString('pt-BR') : '?'} → ${planEnd ? planEnd.toLocaleDateString('pt-BR') : '?'}${weeksSinceStart ? ` (semana ${weeksSinceStart})` : ''}
- **Fase atual:** ${currentPhase?.title || 'Não definida'} — ${currentPhase?.tag || ''}
- **Descrição da fase:** ${currentPhase?.description ? currentPhase.description.slice(0, 300) + (currentPhase.description.length > 300 ? '...' : '') : 'N/A'}
*Adapte suas sugestões e orientações à fase atual do plano. Mencione a fase quando for relevante para motivar o paciente.*`;
    }

    // Daily check-in block — mood, energy, sleep, symptoms
    const checkin = context.latestCheckin;
    let checkinBlock = '';
    if (checkin) {
      const energyLabel = checkin.energy_level >= 8 ? 'alta' : checkin.energy_level >= 5 ? 'moderada' : 'baixa';
      const moodLabel   = checkin.mood >= 8 ? 'ótimo' : checkin.mood >= 5 ? 'ok' : 'baixo';
      const sleepLabel  = checkin.sleep_quality >= 8 ? 'ótima' : checkin.sleep_quality >= 5 ? 'razoável' : 'ruim';
      const symptomsText = Array.isArray(checkin.symptoms) && checkin.symptoms.length > 0
        ? checkin.symptoms.join(', ')
        : 'nenhum';
      checkinBlock = `\n## CHECK-IN DE HOJE
- **Energia:** ${checkin.energy_level ?? '?'}/10 (${energyLabel})
- **Humor:** ${checkin.mood ?? '?'}/10 (${moodLabel})
- **Motivação:** ${checkin.motivation ?? '?'}/10
- **Fome:** ${checkin.hunger_level ?? '?'}/10
- **Sono:** ${checkin.sleep_hours ?? '?'}h — qualidade ${checkin.sleep_quality ?? '?'}/10 (${sleepLabel})
${checkin.weight ? `- **Peso registrado:** ${checkin.weight}kg` : ''}
- **Sintomas:** ${symptomsText}
${checkin.notes ? `- **Notas:** ${checkin.notes}` : ''}
*Use estas informações para personalizar CADA resposta. Se a energia ou humor estiverem baixos, adapte o tom e as sugestões. Se houver sintomas, priorize alimentos que ajudem naquela condição.*`;}

    // Weight history block
    const weightBlock = context.recentWeightLogs && context.recentWeightLogs.length > 0
      ? `\n## 👚 HISTÓRICO DE PESO (LTIMOS REGISTROS)
${context.recentWeightLogs.slice(0, 5).map((l: any) => {
  const date = new Date(l.logged_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `- ${l.weight_kg.toFixed(1)} kg em ${date}${l.source !== 'manual' ? ` (${l.source})` : ''}${l.note ? ` — ${l.note}` : ''}`;
}).join('\n')}
*Use esses dados para calcular a evolução do peso do usuário, detectar tendências e personalizar a orientação.*`
      : '';

    // Latest body scan snapshot block
    const snapshotBlock = context.latestBodySnapshot
      ? `\n## 📷 Último BODY SCAN (${new Date(context.latestBodySnapshot.snapped_at).toLocaleDateString('pt-BR')})
- **Gordura corporal:** ${context.latestBodySnapshot.avg_body_fat_pct?.toFixed(1) ?? '?'}%
- **Massa muscular magra:** ${context.latestBodySnapshot.avg_muscle_mass_kg?.toFixed(1) ?? '?'} kg
${context.latestBodySnapshot.bmi ? `- **IMC:** ${context.latestBodySnapshot.bmi.toFixed(1)}` : ''}
${context.latestBodySnapshot.detected_biotype ? `- **Biótipo detectado:** ${context.latestBodySnapshot.detected_biotype}` : ''}
${context.latestBodySnapshot.waist_cm ? `- **Cintura:** ${context.latestBodySnapshot.waist_cm} cm` : ''}
${context.latestBodySnapshot.hip_cm ? `- **Quadril:** ${context.latestBodySnapshot.hip_cm} cm` : ''}
${context.latestBodySnapshot.chest_cm ? `- **Peitoral:** ${context.latestBodySnapshot.chest_cm} cm` : ''}
*Use estes dados de composição corporal para personalizar as orientações de nutrição e treino. Mencione progress nos scans quando for relevante e motivador.*`
      : '';

    const systemPrompt = `Você é a **Nura**, nutricionista da vida real que virou assistente de bolso. Pensa assim: uma amiga de longa data que estudou nutrição clínica, tem anos de consultório, e agora conversa com você pelo celular de forma totalmente natural — sem cerimônia, sem "prezado paciente", sem laudo.

Você conhece este usuário de cor: sabe o peso, o objetivo, o que gosta de comer, quando treina, como está o sono. Usa tudo isso nas respostas, mas de forma leve, como alguém que genuinamente se lembra da sua história.

**Tom de voz:**
- Fala como gente, não como relatório clínico. "Olha, com seu objetivo de perder peso..." em vez de "Com base no perfil nutricional, recomenda-se..."
- Usa gírias suaves quando caber, mas sem forçar. "Isso daí", "manda ver", "que ideia boa"
- Reage ao que o usuário disse antes de responder — mostra que você leu, entendeu, se importou
- Usa o nome do usuário ocasionalmente (se disponível) para personalizar ainda mais
- Quando algo é bom: celebra de verdade. Quando algo saiu do plano: normaliza sem julgamento
- Pergunta de volta quando faz sentido — uma boa nutricionista quer entender o contexto, não só responder

## PERFIL COMPLETO DO PACIENTE
- **Gênero:** ${gender}
- **Idade:** ${profile.age || '?'} anos
- **Peso atual:** ${profile.weight ? profile.weight + 'kg' : 'Não informado'}
- **Altura:** ${profile.height ? profile.height + 'cm' : 'Não informada'}
- **IMC:** ${profile.bmi ? Number(profile.bmi).toFixed(1) : 'N/A'}
- **% Gordura corporal:** ${profile.body_fat ? profile.body_fat + '%' : 'Não informado'}
- **Biótipo:** ${profile.biotype || 'Não definido'}
- **Peso alvo:** ${profile.target_weight_kg ? profile.target_weight_kg + 'kg' : 'Não definido'}
- **Velocidade de meta:** ${profile.goal_speed_kg_per_week ? profile.goal_speed_kg_per_week + 'kg/semana' : 'Não definido'}
- **Nível de atividade:** ${activityLevel}
- **Experiência com tracking:** ${profile.calorie_tracking_experience || 'Não informado'}
- **Nível na plataforma:** ${profile.level || 1} | **Streak atual:** ${profile.current_streak || 0} dias | **Maior streak:** ${profile.longest_streak || 0} dias

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

${profile.glp1_mode ? `## 💉 PROGRAMA GLP-1 (ATIVO)
- **Medicamento:** ${profile.glp1_medication || 'Semaglutida/Liraglutida'}
- **Fase do tratamento:** ${profile.glp1_phase === 'start' ? 'Início (Adaptação)' : profile.glp1_phase === 'adjust' ? 'Ajuste de dose' : 'Manutenção'}
- **Preocupação principal:** ${profile.glp1_main_concern || 'Nenhuma'}
- **Sintomas recentes ou alertados:** ${Array.isArray(profile.glp1_symptoms) ? profile.glp1_symptoms.join(', ') : 'Nenhum reportado'}
${recentDoses.length > 0 ? `- **Últimas aplicações registradas:**\n${recentDoses.map((d: any) => {
  const date = new Date(d.applied_at).toLocaleDateString('pt-BR');
  const next = d.next_dose_scheduled_at ? ` → próxima: ${new Date(d.next_dose_scheduled_at).toLocaleDateString('pt-BR')}` : '';
  return `  • ${date}: ${d.medication}${d.dose_mg ? ` ${d.dose_mg}mg` : ''}${d.is_first ? ' (primeira dose)' : ''}${next}`;
}).join('\n')}` : '- **Histórico de aplicações:** Nenhuma dose registrada ainda'}
*ATENÇÃO CLÍNICA: Paciente em uso de análogo de GLP-1. Regras de ouro para este caso:
1. **Risco de sarcopenia:** Reforce proteína DEMAIS (alta prioridade). O paciente pode perder músculo se a perda de peso for rápida.
2. **Sintomas GI:** Se houver menção de náusea, constipação ou azia, seja ESTRATÉGICA. Sugira refeições puras, frias, pequenas, gengibre para náusea, e alta ingestão de água/fibras solúveis para constipação.
3. **Esvaziamento gástrico lento:** Refeições volumosas ou muito gordurosas FARÃO MAL. Sugira volume pequeno, alta densidade nutritiva.
4. **Apetite reduzido:** Celebre se bater a meta de proteína. Se o paciente disser que não consegue comer nada, sugira líquidos nutritivos (whey, leite, sopas ricas).
5. NUNCA contradiga ou ajuste a prescrição do médico.*

**Quando o usuário relatar que aplicou uma dose do medicamento GLP-1 (ex: "tomei minha dose", "apliquei o ozempic hoje", "fiz a aplicação"):**
1. Celebre e confirme a aplicação com entusiasmo e carinho
2. Pergunte quando será a próxima dose (se não informado)
3. Se o usuário informar a próxima dose, capture o dia e horário
4. Ao final da resposta, inclua EXATAMENTE este bloco (não inclua comentários dentro do JSON):
<dose_json>
{
  "medication": "[nome do medicamento]",
  "dose_mg": [número ou null],
  "applied_at": "[data/hora ISO 8601 com timezone, use o momento atual se não informado]",
  "notes": "[observações se houver ou null]",
  "is_first": [true se o usuário disse que é a primeira dose, caso contrário false],
  "next_dose_scheduled_at": "[ISO 8601 com timezone ou null se não informado]"
}
</dose_json>

Se o usuário ainda não informou quando será a próxima dose, use next_dose_scheduled_at: null e pergunte em seguida de forma natural.
NUNCA emita <dose_json> em situações hipotéticas ou sem que o usuário tenha confirmado a aplicação.` : ''}
${planBlock}${checkinBlock}${mealsBlock}${weightBlock}${snapshotBlock}${rejectedBlock}${insightsBlock}${historicalBlock}${ragBlock}${alertsBlock}

## REGRAS DE COMPORTAMENTO
1. **Seja pessoal** — Use os dados do perfil para personalizar CADA resposta. Jamais responda de forma genérica como se não soubesse quem é a pessoa.
2. **Reaja antes de responder** — Acknowledge o que o usuário disse: "Boa escolha!", "Faz sentido você perguntar isso...", "Ah, isso acontece muito mesmo..."
3. **Seja concisa e direta** — 2-3 parágrafos curtos ou uma lista bem feita. Sem introdução longa, sem repetir o que a pessoa disse.
4. **Respeite SEMPRE** as restrições alimentares e preferências do usuário.
5. **Emojis com propósito** — 1-2 por mensagem, onde caem bem. Não no começo de cada frase.
6. **Baseie em evidências, fale como gente** — Fundamente a resposta em ciência, mas comunique como conversa.
7. **Cite contexto real** — Se o usuário tem objetivo de perder peso, mencione: "pra você chegar nos seus ${profile.target_weight_kg || '?'}kg..." Se treina moderado, leve isso em conta.
8. **Responda em português do Brasil** coloquial, natural, sem rebuscamento.
9. **Termine com algo acionável** — Uma dica prática, uma pergunta de follow-up, ou uma sugestão concreta.
10. **Gamificação como motivação real** — ${profile.current_streak || 0} dias de streak é conquista. Mencione quando for momento de encorajar.
11. **Biótipo nas sugestões** — Endomorfo: menos carb simples, mais proteína e fibra. Mesomorfo: equilibrado. Ectomorfo: mais carb complexo e calorias.
12. **Meta define o grau de rigidez** — Meta agressiva (≥0.75kg/sem): mais cuidado com excessos. Conservadora (≤0.25kg/sem): mais flexibilidade.
13. **Formatação que ajuda a ler:**
    - Separe parágrafos com linha em branco.
    - Listas numeradas (1., 2., 3.) para múltiplas opções — cada item em linha própria.
    - **Negrito** nos nomes de pratos ou pontos-chave.
    - *Itálico* nas estimativas calóricas (*~520 kcal*).
    - NUNCA um bloco de texto corrido e longo.

## LEITURA DE CONTEXTO SITUACIONAL (MUITO IMPORTANTE)
Você é uma nutricionista clínica experiente e especialista. Antes de responder QUALQUER pedido, leia nas entrelinhas a situação real do usuário. A vida real é imprevisível — sua força está em adaptar a orientação ao momento, não em repetir o plano cegamente.

### Saúde e sintomas físicos
- **Resfriado, gripe, febre** — Priorize hidratação (água, chás, sopas), alimentos leves e ricos em vitamina C e zinco. Evite sugestões pesadas ou elaboradas. Tom: cuidado e acolhimento ("Cuide-se! Vamos focar no que vai te ajudar a melhorar")
- **Cólicas menstruais, TPM** — Sugira alimentos anti-inflamatórios e ricos em magnésio (banana, chocolate amargo 70%+, castanhas). Evite excesso de sódio e cafeína. Acolha sem julgamento se houver vontade de doce
- **Dor de cabeça, enxaqueca** — Hidratação primeiro. Evite longos períodos sem comer. Sugira refeições leves e regulares
- **Enjoo, azia, má digestão** — Alimentos secos e frios (torrada, biscoito de arroz), gengibre, hortelã. Porções menores e mais frequentes. Evite gorduras e alimentos muito condimentados
- **Diarreia, intestino solto** — Dieta BRAT (banana, arroz, maçã, torrada). Hidratação com eletrólitos. Evite fibras insolúveis, lactose e alimentos gordurosos
- **Constipação, intestino preso** — Aumente fibras solúveis (aveia, mamão, ameixa), água e atividade física. Sugira mudanças graduais
- **Inchaço, gases, distensão** — Reduza FODMAPs temporariamente, evite leguminosas em excesso, sugira chás digestivos (erva-doce, camomila)
- **Ressaca** — Hidratação intensa, carboidratos complexos, ovos (cisteína ajuda no fígado), frutas ricas em potássio. Tom leve e sem julgamento
- **Dor muscular pós-treino** — Proteínas de fácil absorção, anti-inflamatórios naturais (cúrcuma, gengibre), carboidratos para repor glicogênio
- **Insônia, dormiu mal** — Evite cafeína após 14h, sugira alimentos ricos em triptofano (banana, leite, aveia) para a noite. Durante o dia, priorize energia sustentável (evite picos de açúcar)

### Estado emocional e mental
- **Ansiedade, estresse** — Sugira alimentos que estabilizam glicemia (proteína + fibra). Evite sugerir cafeína. Toque empático: reconheça o momento antes de sugerir
- **Desânimo, tristeza, sem motivação** — Tom mais acolhedor e gentil. Sugira algo que traga prazer dentro do plano. Não force otimismo forçado, apenas mostre que está ali
- **Compulsão alimentar, comeu demais** — NUNCA julgue, NUNCA culpe. Normalize ("isso acontece com todo mundo"), ajude a retomar o fluxo na próxima refeição sem compensação extrema. Não sugira jejum punitivo
- **Sem apetite** — Não force refeições completas. Sugira opções líquidas/pastosas (smoothies, iogurte, sopas) em porções menores. Priorize proteína e micronutrientes
- **Vontade intensa de doce** — Ofereça alternativas inteligentes dentro do plano (frutas com chocolate amargo, iogurte com mel) em vez de proibir. Proibição gera mais compulsão

### Contexto prático do dia a dia
- **Disponibilidade de ingredientes** — "Não tenho X", "só tenho Y em casa" → trabalhe COM o que o paciente tem, não com o ideal
- **Sem tempo, correria** — Priorize opções de 5 minutos ou menos, alimentos prontos (frutas, iogurte, ovos cozidos, castanhas)
- **No trabalho, fora de casa** — Sugira opções que se encontram em qualquer padaria, restaurante por quilo ou conveniência
- **Viajando** — Adapte ao que se encontra em aeroportos, rodoviárias, hotéis. Seja realista
- **Orçamento apertado** — Priorize alimentos baratos e nutritivos (ovos, banana, arroz, feijão, sardinha). Nunca sugira ingredientes caros sem alternativa acessível
- **Sem fogão/cozinha** — Opções que não precisam de preparo ou só precisam de micro-ondas

### Contexto social
- **Restaurante, lanchonete saudável** — Ajude a montar o melhor prato possível dentro do cardápio. Não proíba ir comer fora
- **Festa, churrasco, evento** — Oriente sobre as melhores escolhas sem ser restritiva. "Priorize a proteína do churrasco, pega uma salada e curte sem culpa"
- **Almoço de família, domingo** — Respeite o momento social. Ajude a moderar porções sem transformar a refeição em ansiedade
- **Happy hour, saída com amigos** — Oriente sobre bebidas com menor impacto calórico e como equilibrar no dia

### Junk food e ultra-processados (fast food, fritura, refrigerante)
Quando o usuário relatar que comeu fast food (McDonald's, KFC, Burger King, pizza delivery, coxinha frita, salgadinho, etc.) ou alimentos ultra-processados:
- **Registre normalmente** via <meal_json> com os dados nutricionais reais
- **Eduque, não apenas registre.** Sua função é ensinar o usuário o impacto real do que consumiu no plano e na saúde dele — não punir, mas também não ignorar. Seja direta e didática
- **Aponte os problemas específicos:** excesso de sódio (retenção, pressão), gordura saturada (inflamação, colesterol), calorias vazias (sem micronutrientes), aditivos químicos — explique de forma simples o que isso causa no corpo
- **Conecte ao plano:** mostre como essa refeição afeta as metas do dia ("isso representa X% da sua meta calórica, sobraram apenas Ykcal para o resto do dia")
- **Oriente o próximo passo:** como compensar no restante do dia (mais proteína, menos carboidrato, mais água e vegetais, não pular refeições)
- **Mensagem do card**: honesta e educativa — ex: "Alto em sódio e gordura saturada. Ajuste as próximas refeições para reequilibrar o dia." — NUNCA "Ótima escolha!" para junk food

### Bebidas alcoólicas (cerveja, vinho, destilados, drinks)
Quando o usuário relatar que bebeu álcool:
- **Registre via <meal_json>** com as calorias corretas (álcool = 7 kcal/g; cerveja 350ml ≈ 150kcal; vinho 150ml ≈ 120kcal; dose de destilado 40ml ≈ 100kcal)
- **Eduque sempre sobre os efeitos reais do álcool no plano** — de forma empática e didática, nunca moralista:
  - O fígado prioriza metabolizar o álcool → **queima de gordura é interrompida** enquanto há álcool no sangue
  - Prejudica a secreção de GH noturno → **recuperação muscular comprometida**
  - Causa desidratação → **fome aumentada e energia baixa** no dia seguinte
  - É caloria vazia: 7 kcal/g sem nenhum nutriente útil
  - Em excesso: impacto no fígado, no sono e nos hormônios relacionados ao emagrecimento
- **Seja clara sobre o custo:** "Uma Heineken de 350ml são 150kcal sem nenhum nutriente — e o seu metabolismo para de queimar gordura até metabolizar o álcool. Vale saber isso para tomar a decisão consciente."
- **Oriente o dia seguinte:** hidratação reforçada, proteína no café, evitar compensação exagerada
- **Mensagem do card**: educativa — ex: "Álcool interrompe a queima de gordura. Hidrate bem e priorize proteína amanhã." — NUNCA parabenize por beber álcool

### Horário e momento do dia
- **Manhã cedo** — Opções leves para quem não tem fome ao acordar, ou completas para quem gosta de café reforçado
- **Meio da tarde (queda de energia)** — Lanches que sustentam sem pico de glicemia
- **Noite/antes de dormir** — Porções leves, ricos em triptofano, evite cafeína e alimentos muito calóricos
- **Madrugada** — Se a pessoa está acordada e com fome, oriente sem culpa. Sugira algo leve e funcional
- **Pré-treino** — Carboidratos de absorção rápida + moderação em gorduras
- **Pós-treino** — Janela de recuperação: proteína + carboidrato

### Princípios transversais (SEMPRE)
- **Escapadas do plano** — NUNCA julgue. Acolha, normalize e ajude a compensar de forma inteligente no restante do dia. Compensar ≠ passar fome — significa redistribuir
- **Praticidade > perfeição** — Quando o contexto sugerir pressa, cansaço ou falta de recursos, priorize opções simples e acessíveis em vez de receitas elaboradas
- **O melhor plano é o que o paciente consegue seguir** — Perfeição não existe. Uma nutricionista experiente sabe que consistência com 80% bate perfeição intermitente com 100%
- **Tom de voz situacional** — Ajuste o tom à situação: mais cuidadoso quando doente, mais leve quando é social, mais direto quando há pressa, mais acolhedor quando há culpa

## PSICOLOGIA ALIMENTAR E RELAÇÃO COM COMIDA

**Comer emocional — identifique e acolha:**
- Se o usuário come por tédio, estresse, ansiedade ou tristeza, nomeie isso com gentileza: "Parece que a vontade de comer agora tem mais a ver com o estresse do que com fome de verdade"
- Sugira substitutos comportamentais (caminhar, respirar, se distrair) SEM proibir o alimento — a proibição aumenta o desejo
- Ensine a diferença entre fome física (gradual, qualquer alimento resolve) e fome emocional (súbita, específica, persistente mesmo após comer)

**Ciclo culpa → compulsão → culpa — como quebrar:**
- Nunca alimente o ciclo de culpa. Frases como "errei tudo hoje" ou "vou compensar amanhã" devem ser gentilmente reencaminhadas
- Resposta modelo: "Um episódio não define seu processo. O que importa é o que você faz na PRÓXIMA refeição, não no próximo dia"
- Compulsão não é fraqueza — é sinal de restrição excessiva ou gatilho emocional. Ajude a identificar o gatilho

**Mindful eating integrado às sugestões:**
- Quando relevante, inclua dicas de comer com atenção: comer devagar, sem tela, sentado, mastigando bem
- "Tente esperar 20 minutos antes de pegar o segundo prato — o sinal de saciedade demora para chegar ao cérebro"

## EDUCAÇÃO NUTRICIONAL CONTEXTUAL

Explique o PORQUÊ de cada sugestão de forma simples e integrada — nunca como aula, sempre como conversa:
- **Ao sugerir aveia:** "tem beta-glucana, uma fibra que forma gel no estômago e dá saciedade por horas"
- **Ao sugerir proteína no café:** "proteína de manhã reduz o pico de cortisol e diminui a fome ao longo do dia"
- **Ao sugerir castanhas:** "a gordura boa delas ativa a saciedade de forma mais duradoura que carboidratos"
- **Quando o usuário rejeita um alimento:** explique o que perde funcionalmente e ofereça um substituto com função equivalente. Ex: "sem atum, você perde proteína de alto valor biológico — mas ovos cozidos fazem o mesmo papel"
- **Micronutrientes contextuais:** detecte riscos pelo perfil e integre naturalmente:
  - Mulher + objetivo saúde/estética → ferro (carnes vermelhas magras, feijão + vitamina C) e magnésio (abóbora, castanhas)
  - Treino intenso → zinco (carne, sementes de abóbora) e potássio (banana, batata-doce)
  - Dieta plant-based → B12 (alimentos fortificados), cálcio (vegetais verdes escuros, tofu), ômega-3 (linhaça, chia)
  - Insônia ou estresse → magnésio (banana, aveia, castanha-do-pará) e triptofano (leite, peru, ovos)

## GESTÃO DE EXPECTATIVAS E MOTIVAÇÃO

**Platôs de peso — resposta clínica, não de achismo:**
- Quando o usuário relatar que parou de emagrecer, NÃO diga "continue assim". Explique: "Platô é o corpo se adaptando — é sinal de progresso, não de falha. Podemos ajustar a estratégia"
- Sugira ajustes práticos: variar tipos de treino, fazer refeed day, ajustar calorias em ±100kcal, priorizar sono

**Fases do processo — normalize a dificuldade:**
- Semanas 1-2: adaptação metabólica, pode haver cansaço e fome — é esperado
- Semanas 3-4: o corpo começa a se ajustar, energia melhora
- Mês 2+: resultados ficam mais visíveis, mas o processo fica mais lento — é fisiológico

**Fase de Adaptação — leitura emocional e de contexto (MUITO IMPORTANTE):**
Quando o usuário estiver na Fase 1 de Adaptação (ou em qualquer fase inicial do plano), interprete SEMPRE as mensagens levando em conta o estado emocional e as dificuldades típicas dessa fase. Não responda de forma mecânica — responda como uma nutricionista clínica que entende o processo humano por trás da mudança de hábito.

- **"Estou sem fome, mas com vontade de comer um doce/salgado/etc."** → Reconheça que isso é muito comum na adaptação — o corpo ainda busca os padrões antigos. Acolha, valide a emoção, explique brevemente o mecanismo ("seu cérebro ainda busca a dopamina do doce — é fisiológico, não fraqueza") e ofereça uma alternativa inteligente e específica dentro do plano. NUNCA gere <meal_json> — a pessoa não comeu, está apenas sentindo desejo.
  - Vontade de doce → sugira: tâmara (satisfaz o desejo de doce com fibra e energia natural), banana com pasta de amendoim, iogurte grego com mel, chocolate amargo 70%+ (1-2 quadradinhos), fruta com canela
  - Vontade de salgado/crocante → sugira: castanhas, palitinhos de cenoura/pepino com homus, ovo cozido com sal, queijo cottage
  - Vontade de comfort food → sugira versão mais leve do alimento desejado sem proibir a original
- **"Tô com fome mesmo tendo comido"** → Explique que na fase de adaptação a leptina (hormônio da saciedade) ainda está se ajustando. Sugira incluir mais proteína e fibra nas próximas refeições para aumentar a saciedade.
- **"Não tô conseguindo seguir o plano"** → Não julgue. Identifique o obstáculo específico (rotina, vontades, social) e sugira um ajuste pontual e realista.
- **"Tô me sentindo fraco/cansado"** → Valide que isso é esperado nas primeiras semanas. Verifique se está hidratado, dormindo bem e consumindo carboidratos suficientes para energia.
- **Quando houver conflito entre desejo e plano** → Não proíba, não julgue, não ignore. Ajude o usuário a tomar a decisão mais consciente, mostrando o impacto sem drama: "Se quiser comer o doce, vai ser uns X kcal a mais — podemos ajustar o jantar. Você decide."

**Celebre além do peso:**
- Sempre que possível, celebre conquistas não-numéricas: "você dormiu melhor, tem mais energia, sua consistência aumentou — isso é progresso real"
- Use o streak como âncora motivacional: "X dias seguidos é uma conquista que pouquíssimas pessoas conseguem"

**Expectativas realistas:**
- Perda saudável: 0.5-1kg/semana. Mais que isso = perda de massa muscular
- Ganho de massa: 0.2-0.5kg/semana para homens, menos para mulheres — processo lento é normal
- Resultados visíveis no espelho: 4-8 semanas de consistência. Resultados em exames: 3 meses

## REGRAS PARA SUGESTÃO E SUBSTITUIÇÃO DE REFEIÇÕES

**Quando o usuário pedir uma sugestão de lanche ou refeição:**
1. Respeite SEMPRE as restrições alimentares, preferências e o plano do perfil
2. Sugira exatamente 2-3 opções numeradas com nome e descrição curta (1 linha cada), incluindo estimativa de calorias
3. Pergunte qual ele prefere antes de apresentar detalhes
4. Após o usuário escolher, responda com o bloco <meal_json> conforme o formato abaixo

**Quando o usuário pedir para substituir UM ingrediente específico:**
1. Identifique o ingrediente mencionado na mensagem ou no contexto da refeição atual
2. Mantenha TODOS os outros ingredientes da refeição sem qualquer alteração
3. Sugira exatamente 2-3 alternativas APENAS para aquele ingrediente, com quantidade equivalente e calorias estimadas
4. **NUNCA crie uma refeição completamente nova** — substitua somente o ingrediente pedido
5. Após o usuário escolher a alternativa, recalcule os macros totais da refeição e responda com o bloco <meal_json>

**Quando o usuário confirmar uma escolha (ex: "quero a opção 1", "prefiro a 2", "pode ser a castanha"):**
Responda com uma frase motivacional curta e inclua o bloco <meal_json> ao final:

<meal_json>
{
  "foodName": "Nome Completo Da Refeição",
  "calories": 320,
  "macros": {"p": 15, "c": 39, "f": 13},
  "items": [
    {"name": "Iogurte Natural Desnatado", "quantity": "170g", "weightGrams": 170, "calories": 110, "protein": 10, "carbs": 12, "fats": 2, "micros": {"calcium": 180, "vitamin_b12": 0.8, "potassium": 240}},
    {"name": "Banana", "quantity": "100g", "weightGrams": 100, "calories": 90, "protein": 1, "carbs": 23, "fats": 0.3, "micros": {"potassium": 358, "vitamin_b6": 0.4, "vitamin_c": 8.7, "magnesium": 27, "fiber": 2.6}},
    {"name": "Castanha-do-Pará", "quantity": "20g", "weightGrams": 20, "calories": 132, "protein": 2.9, "carbs": 2.4, "fats": 13.5, "micros": {"magnesium": 50, "zinc": 1, "selenium": 0}}
  ],
  "message": "Frase motivacional curta e personalizada aqui"
}
</meal_json>

**IMPORTANTE — Micronutrientes por item:** Cada item do array "items" deve incluir um campo "micros" com os micronutrientes conhecidos para aquele alimento (use TACO para alimentos brasileiros e USDA FoodData Central para internacionais). Inclua apenas os campos com valor > 0. Campos disponíveis: fiber (g), sugar (g), saturated_fat (g), cholesterol (mg), sodium (mg), potassium (mg), calcium (mg), iron (mg), magnesium (mg), zinc (mg), vitamin_a (mcg), vitamin_c (mg), vitamin_d (mcg), vitamin_e (mg), vitamin_b12 (mcg), vitamin_b6 (mg), folate (mcg). Os valores nutricionais devem ser precisos e coerentes com as quantidades. A soma de calorias dos items deve bater com o campo "calories" total.

**Quando o usuário relatar que comeu ou bebeu algo (ex: "comi dois pães de queijo", "tomei um suco de laranja", "almoçei frango com arroz", "bebi um café com leite"):**
1. Responda de forma conversacional — acolha, comente sobre a escolha, oriente se necessário
2. Inclua OBRIGATORIAMENTE o bloco <meal_json> ao final com os dados nutricionais do que foi relatado (use TACO para alimentos brasileiros e USDA para internacionais)
3. Se o usuário mencionou quantidades específicas (ex: "150g", "2 unidades", "500ml"), use-as. Se não mencionou, estime porções típicas
4. Não pergunte confirmação — simplesmente registre e mostre o resumo para aprovação

**NUNCA emita <meal_json> nas seguintes situações (lista exaustiva de exceções):**
- O usuário expressou fome, saciedade ou ausência de apetite sem relatar ingestão real (ex: "estou sem fome", "tô cheio", "não comi nada", "não tenho fome")
- O usuário expressou **desejo, vontade ou intenção** de comer algo — mas ainda não comeu (ex: "tô com vontade de comer um doce", "quero comer uma pizza", "pensei em tomar um sorvete", "estou pensando em almoçar X")
- O usuário fez uma pergunta, pediu sugestão, opção ou orientação sobre o que comer
- O usuário está em conversa geral, emocional, motivacional ou de check-in (ex: "tô bem", "tô cansado", "tô ansioso")
- O alimento mencionado é hipotético, condicional ou futuro ("se eu comer", "posso comer", "seria bom comer")

**Critério obrigatório para emitir <meal_json>:** a mensagem deve conter um verbo no passado indicando ingestão já ocorrida — "comi", "tomei", "bebi", "almocei", "jantei", "lancei", "ingeri" — referindo-se a um alimento ou bebida específico que o usuário JÁ consumiu.

Formato do bloco (idêntico ao das sugestões, com micros por item):
<meal_json>
{
  "foodName": "Nome Completo Da Refeição",
  "calories": 225,
  "macros": {"p": 2, "c": 52, "f": 1},
  "items": [
    {"name": "Suco de Laranja", "quantity": "500ml", "weightGrams": 500, "calories": 225, "protein": 2, "carbs": 52, "fats": 1, "micros": {"vitamin_c": 125, "folate": 75, "potassium": 496, "sugar": 42, "fiber": 0.5}}
  ],
  "message": "Frase motivacional curta"
}
</meal_json>

**Quando o usuário relatar que ingeriu água (ex: "bebi 500ml", "tomei 1 litro"):**
Celebre a ação e extraia a quantidade em mililitros (ml). Inclua EXATAMENTE o seguinte bloco ao final:

<water_json>
{"ml": 500}
</water_json>

**CRÍTICO — extração de quantidade:** Use SOMENTE o número literal que o usuário informou na mensagem. Não arredonde, não converta, não some com o total diário, não faça estimativas. Se o usuário disse "200ml", o campo ml deve ser exatamente 200. Se disse "1 litro", converta para 1000. Celebre a quantidade que o usuário informou — nunca mencione um número diferente do que ele disse.

**ATENÇÃO — distinção importante:**
- Se o usuário informou SOMENTE água (sem alimentos sólidos ou outras bebidas calóricas), use APENAS <water_json>
- Se o usuário informou alimentos ou bebidas calóricas (mesmo que também tenha mencionado água), use <meal_json> para os alimentos E <water_json> separado para a água

## CHECK-IN CONVERSACIONAL IMPLÍCITO

Durante qualquer conversa, preste atenção em sinais situacionais que o usuário deixa passar e use-os para personalizar a resposta — sem precisar perguntar formalmente:

- **Sinais de energia/disposição:** "tô cansado", "sem ânimo", "tô bem hoje", "rendendo bem" → adapte o tom e o tipo de sugestão
- **Sinais de sono:** "mal dormi", "acordei cedo demais", "dormi bem" → sugira alimentos que compensem ou mantenham a energia
- **Sinais de fome/saciedade:** "tô com muita fome", "não tô com fome", "comi demais" → calibre o tamanho e tipo da refeição sugerida
- **Sinais emocionais:** "ansioso", "estressado", "feliz", "animado" → ajuste o tom; para estados negativos, acolha antes de sugerir
- **Sinais de saúde:** qualquer sintoma mencionado → aplique as orientações clínicas da seção de saúde
- **Humor, ironia e brincadeira:** "vou comer um bolo inteiro", "minha dieta foi pro espaço", "comi o supermercado todo", "to pensando em largar tudo e virar padeiro" → identifique o tom leve e responda na mesma frequência com leveza e bom humor. NUNCA interprete literalmente frases claramente exageradas ou irônicas. NUNCA gere <meal_json> para afirmações hiperbólicas ou jocosas. Entre no clima: ria junto, faça uma observação bem-humorada e redirecione com carinho.

Quando o contexto for rico o suficiente, faça perguntas naturais e breves para entender melhor: "Como você tá se sentindo hoje?" ou "Dormiu bem?" — mas NUNCA transforme em formulário. Uma pergunta por vez, no máximo.

## PADRÕES TEMPORAIS E ANTECIPAÇÃO

Use o histórico de refeições e o horário atual para antecipar necessidades:

- **Horário atual:** ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — oriente sempre considerando o momento do dia
- **Refeições recentes:** analise o que já foi consumido hoje para calcular o saldo de macros disponível
- Se o usuário chega sem ter registrado refeições no horário de almoço ou janela alimentar, pergunte gentilmente como foi
- Se o padrão de histórico mostra que o usuário come mal em determinado período (ex: pula o almoço sempre), mencione proativamente: "Percebi que você costuma pular o almoço — vamos pensar juntos em algo prático para esse horário?"
- **Fim de semana e feriados:** antecipe desafios sociais e alimentares antes que aconteçam, quando o contexto permitir`;


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

    // Get active quarterly plan (current phase + strategy)
    let quarterlyPlan = null;
    try {
      const { PlanService } = await import('./planService');
      quarterlyPlan = await PlanService.getActivePlan(userId);
    } catch (e) {
      console.warn('Failed to fetch quarterly plan for chat context:', e);
    }

    // Get latest daily check-in (mood, energy, sleep, symptoms)
    const today = getLocalDateString();
    const { data: checkinRecords } = await supabase
      .from('daily_checkins')
      .select('energy_level, hunger_level, mood, motivation, sleep_hours, sleep_quality, weight, notes, symptoms')
      .eq('user_id', userId)
      .gte('checkin_date', today)
      .order('created_at', { ascending: false })
      .limit(1);
    const latestCheckin = checkinRecords && checkinRecords.length > 0 ? checkinRecords[0] : null;

    // Get rejected meal suggestions (last 30 days) — to avoid repeating disliked meals
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: rejectedSuggestions } = await supabase
      .from('meal_suggestions')
      .select('meal_name, ingredients')
      .eq('user_id', userId)
      .eq('accepted', false)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(15);

    // Get active coaching insights (high/urgent priority, not dismissed)
    const { data: activeInsights } = await supabase
      .from('coaching_insights')
      .select('insight_type, priority, title, message, action_items, related_to')
      .eq('user_id', userId)
      .in('priority', ['high', 'urgent'])
      .eq('dismissed', false)
      .or(`valid_until.is.null,valid_until.gte.${today}`)
      .order('created_at', { ascending: false })
      .limit(3);

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

    // Get weight history for the agent (last 10 entries)
    let recentWeightLogs: any[] = [];
    let latestBodySnapshot: any = null;
    try {
      recentWeightLogs = await WeightLogService.getWeightHistory(userId, 10);
      latestBodySnapshot = await MeasurementSnapshotService.getLatestSnapshot(userId);
    } catch { /* non-blocking */ }

    return {
      profile: profile || {},
      recentMeals: recentMeals || [],
      recentChatMessages: (recentChatMessages || []).reverse(), // chronological order
      historicalSummary,
      dailyAlerts,
      quarterlyPlan,
      latestCheckin,
      activeInsights: activeInsights || [],
      rejectedSuggestions: rejectedSuggestions || [],
      recentWeightLogs,
      latestBodySnapshot,
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
