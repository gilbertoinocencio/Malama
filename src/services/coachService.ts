import { supabase } from './supabase';
import { CaramelAI, CARAMEL_FAST_MODEL } from '../lib/caramelAI';
import { getLocalDateString } from '../utils/dateUtils';

const genAI = new CaramelAI();
const MODEL_NAME = CARAMEL_FAST_MODEL;

export interface DailyMission {
  id?: string;
  user_id: string;
  mission_date: string;
  mission_type: 'hydration' | 'meal_timing' | 'protein_intake' | 'exercise' | 'sleep' | 'checkin' | 'custom';
  title: string;
  description?: string;
  target_value?: number;
  current_value: number;
  unit?: string;
  completed: boolean;
  xp_reward: number;
}

export interface MealSuggestion {
  id?: string;
  user_id: string;
  suggestion_date: string;
  meal_time: 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'pre_workout' | 'post_workout' | 'dinner' | 'evening_snack';
  suggested_hour: string;
  meal_name: string;
  description?: string;
  ingredients?: { name: string; quantity: string }[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  reasoning?: string;
  alternatives?: { name: string; description: string }[];
  accepted?: boolean | null;
  logged: boolean;
}

export interface DailyCheckin {
  id?: string;
  user_id: string;
  checkin_date: string;
  energy_level: number;
  hunger_level: number;
  mood: number;
  motivation: number;
  weight?: number;
  sleep_hours?: number;
  sleep_quality?: number;
  notes?: string;
  symptoms?: string[];
  coach_feedback?: string;
}

export interface CoachingInsight {
  id?: string;
  user_id: string;
  insight_type: 'tip' | 'warning' | 'celebration' | 'adjustment';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message: string;
  action_items?: string[];
  related_to?: string;
  seen: boolean;
  dismissed: boolean;
}

export const CoachService = {
  /**
   * Generate daily missions for user based on their profile and goals
   */
  async generateDailyMissions(userId: string, date: string = getLocalDateString()): Promise<DailyMission[]> {
    // Check if missions already exist for today
    const { data: existing } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('user_id', userId)
      .eq('mission_date', date);

    if (existing && existing.length > 0) {
      return existing as DailyMission[];
    }

    // Get user profile to personalize missions
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Base missions for everyone
    const missions: Omit<DailyMission, 'id'>[] = [
      {
        user_id: userId,
        mission_date: date,
        mission_type: 'hydration',
        title: 'Hidratação',
        description: `Beba ${Math.max(3000, Math.round((profile.weight || 70) * 35)) + (profile.activity_level === 'intense' ? 600 : profile.activity_level === 'moderate' ? 300 : 0)}ml de água hoje`,
        target_value: Math.max(3000, Math.round((profile.weight || 70) * 35)) + (profile.activity_level === 'intense' ? 600 : profile.activity_level === 'moderate' ? 300 : 0),
        current_value: 0,
        unit: 'ml',
        completed: false,
        xp_reward: 20,
      },
      {
        user_id: userId,
        mission_date: date,
        mission_type: 'protein_intake',
        title: 'Meta de Proteína',
        description: `Consuma ${profile.target_protein || 150}g de proteína hoje`,
        target_value: profile.target_protein || 150,
        current_value: 0,
        unit: 'g',
        completed: false,
        xp_reward: 30,
      },
      {
        user_id: userId,
        mission_date: date,
        mission_type: 'checkin',
        title: 'Check-in Diário',
        description: 'Compartilhe como você está se sentindo hoje',
        target_value: 1,
        current_value: 0,
        unit: 'vez',
        completed: false,
        xp_reward: 15,
      },
    ];

    // Goal-specific missions
    if (profile.goal === 'performance') {
      missions.push({
        user_id: userId,
        mission_date: date,
        mission_type: 'exercise',
        title: 'Treino Planejado',
        description: 'Complete seu treino de hoje',
        target_value: 1,
        current_value: 0,
        unit: 'treino',
        completed: false,
        xp_reward: 40,
      });
    }

    if (profile.goal === 'aesthetic' || profile.goal === 'health') {
      missions.push({
        user_id: userId,
        mission_date: date,
        mission_type: 'sleep',
        title: 'Qualidade do Sono',
        description: 'Durma pelo menos 7-8 horas hoje',
        target_value: 8,
        current_value: 0,
        unit: 'horas',
        completed: false,
        xp_reward: 25,
      });
    }

    // Insert missions
    const { data: created, error } = await supabase
      .from('daily_missions')
      .insert(missions)
      .select();

    if (error) throw error;

    return created as DailyMission[];
  },

  /**
   * Update mission progress
   */
  async updateMissionProgress(
    userId: string,
    missionId: string,
    currentValue: number
  ): Promise<DailyMission> {
    const { data: mission } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('id', missionId)
      .eq('user_id', userId)
      .single();

    if (!mission) throw new Error('Mission not found');

    const completed = mission.target_value ? currentValue >= mission.target_value : currentValue > 0;

    const { data: updated, error } = await supabase
      .from('daily_missions')
      .update({
        current_value: currentValue,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('id', missionId)
      .select()
      .single();

    if (error) throw error;

    // If completed, add XP to profile
    if (completed && !mission.completed) {
      await this.addXP(userId, mission.xp_reward);
    }

    return updated as DailyMission;
  },

  /**
   * Complete a mission
   */
  async completeMission(userId: string, missionId: string): Promise<DailyMission> {
    const { data: mission } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('id', missionId)
      .eq('user_id', userId)
      .single();

    if (!mission) throw new Error('Mission not found');

    const { data: updated, error } = await supabase
      .from('daily_missions')
      .update({
        current_value: mission.target_value || 1,
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', missionId)
      .select()
      .single();

    if (error) throw error;

    // Add XP if not already completed
    if (!mission.completed) {
      await this.addXP(userId, mission.xp_reward);
    }

    return updated as DailyMission;
  },

  /**
   * Get today's missions for user
   */
  async getTodayMissions(userId: string): Promise<DailyMission[]> {
    return this.generateDailyMissions(userId, getLocalDateString());
  },

  /**
   * Sync active missions progress with latest daily stats (hydration, protein)
   */
  async syncMissionsProgress(userId: string): Promise<void> {
    const today = getLocalDateString();
    const { data: missions } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('user_id', userId)
      .eq('mission_date', today);

    if (!missions || missions.length === 0) return;

    try {
      // 1. Sync Hydration
      const hydroMission = missions.find(m => m.mission_type === 'hydration');
      if (hydroMission && !hydroMission.completed) {
        const { data: dailyLog } = await supabase
          .from('daily_logs')
          .select('water_intake')
          .eq('user_id', userId)
          .eq('date', today)
          .maybeSingle();

        const currentHydration = dailyLog?.water_intake || 0;
        if (currentHydration > (hydroMission.current_value || 0)) {
          await this.updateMissionProgress(userId, hydroMission.id, currentHydration);
        }
      }

      // 2. Sync Protein
      const proteinMission = missions.find(m => m.mission_type === 'protein_intake');
      if (proteinMission && !proteinMission.completed) {
        // Late import to prevent circular dependency
        const { MealService } = await import('./mealService');
        const meals = await MealService.getMeals(userId, new Date());
        const currentProtein = Math.round(meals.reduce((acc, meal) => acc + meal.macros.protein, 0));

        if (currentProtein > (proteinMission.current_value || 0)) {
          await this.updateMissionProgress(userId, proteinMission.id, currentProtein);
        }
      }
    } catch (e) {
      console.error('Error syncing missions:', e);
    }
  },

  /**
   * Submit daily check-in
   */
  async submitCheckin(userId: string, checkinData: Partial<DailyCheckin>): Promise<DailyCheckin> {
    const today = getLocalDateString();

    // O registro não deve ficar esperando uma inferência. Esta resposta curta é
    // útil e determinística; o Caramel enriquece o texto em background depois.
    const coachFeedback = (() => {
      if ((checkinData.sleep_hours ?? 8) < 6 || (checkinData.sleep_quality ?? 10) <= 4) {
        return 'Seu sono parece ter pedido mais cuidado hoje. Priorize refeições simples, hidrate-se e tente desacelerar mais cedo à noite.';
      }
      if ((checkinData.energy_level ?? 10) <= 4 || (checkinData.mood ?? 10) <= 4) {
        return 'Hoje vale ir com mais gentileza e constância. Faça uma refeição equilibrada e escolha uma ação pequena que caiba na sua energia.';
      }
      return 'Check-in registrado! Mantenha esse ritmo e use essa boa disposição em uma escolha prática a favor do seu objetivo hoje.';
    })();

    const checkin = {
      user_id: userId,
      checkin_date: today,
      ...checkinData,
      coach_feedback: coachFeedback,
    };

    const { data, error } = await supabase
      .from('daily_checkins')
      .upsert(checkin, { onConflict: 'user_id,checkin_date' })
      .select()
      .single();

    if (error) throw error;

    // Missão e enriquecimento são efeitos secundários: não seguram a interface.
    void supabase
      .from('daily_missions')
      .update({ completed: true, current_value: 1, completed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('mission_date', today)
      .eq('mission_type', 'checkin')
      .then(({ error }) => {
        if (error) console.error('Erro ao concluir missão de check-in:', error);
      });

    void this.generateCheckinFeedback(userId, checkinData).then(async (enrichedFeedback) => {
      if (!enrichedFeedback) return;
      const { error: feedbackError } = await supabase
        .from('daily_checkins')
        .update({ coach_feedback: enrichedFeedback })
        .eq('user_id', userId)
        .eq('checkin_date', today);
      if (feedbackError) console.error('Erro ao enriquecer feedback do check-in:', feedbackError);
    }).catch(() => {});

    return data as DailyCheckin;
  },

  /**
   * Whether the user already submitted today's check-in.
   * Server-side source of truth (survives reload / device switch),
   * so we never re-prompt after a check-in already exists for the day.
   */
  async hasCheckinToday(userId: string): Promise<boolean> {
    const today = getLocalDateString();
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('checkin_date')
      .eq('user_id', userId)
      .eq('checkin_date', today)
      .maybeSingle();

    if (error) {
      console.error('hasCheckinToday:', error);
      return true; // fail closed: on error, don't nag the user
    }
    return !!data;
  },

  /**
   * Generate personalized feedback for check-in using AI
   */
  async generateCheckinFeedback(userId: string, checkinData: Partial<DailyCheckin>): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 300 },
      });

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle();
      const firstName = profile?.display_name?.trim().split(/\s+/)[0] || '';

      const prompt = `
Você é um coach nutricional empático e motivador.

${firstName
  ? `O nome da pessoa é ${firstName}. Se usar um vocativo, use somente esse primeiro nome.`
  : 'O nome não está disponível; não use vocativo.'}
NUNCA use "amigo", "amiga" ou outro vocativo genérico.

O usuário fez o check-in diário com as seguintes informações:
- Nível de energia: ${checkinData.energy_level}/10
- Nível de fome: ${checkinData.hunger_level}/10
- Humor: ${checkinData.mood}/10
- Motivação: ${checkinData.motivation}/10
${checkinData.sleep_hours ? `- Horas de sono: ${checkinData.sleep_hours}h` : ''}
${checkinData.sleep_quality ? `- Qualidade do sono: ${checkinData.sleep_quality}/10` : ''}
${checkinData.notes ? `- Observações: ${checkinData.notes}` : ''}

Gere um feedback personalizado, empático e motivador (máximo 3 frases) que:
1. Reconheça o que o usuário está sentindo
2. Dê uma dica prática se houver algo a melhorar
3. Seja encorajador

Responda apenas com o texto do feedback, sem formatação.
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating checkin feedback:', error);
      return 'Obrigado por compartilhar como você está! Continue assim, você está no caminho certo! 💪';
    }
  },

  /**
   * Add XP to user profile
   */
  async addXP(userId: string, xp: number): Promise<void> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_xp, level')
      .eq('id', userId)
      .single();

    if (!profile) return;

    const newTotalXP = (profile.total_xp || 0) + xp;
    const newLevel = Math.floor(newTotalXP / 100) + 1; // 100 XP per level

    await supabase
      .from('profiles')
      .update({
        total_xp: newTotalXP,
        level: newLevel,
      })
      .eq('id', userId);
  },

  /**
   * Get active coaching insights for user
   */
  async getActiveInsights(userId: string): Promise<CoachingInsight[]> {
    const { data, error } = await supabase
      .from('coaching_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('dismissed', false)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    return data as CoachingInsight[];
  },

  /**
   * Dismiss an insight
   */
  async dismissInsight(insightId: string): Promise<void> {
    await supabase
      .from('coaching_insights')
      .update({ dismissed: true })
      .eq('id', insightId);
  },
};
