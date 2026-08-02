import { supabase } from './supabase';
import { Meal, DailyStats } from '../types';
import { INITIAL_STATS } from '../constants';
import { StatsService } from './statsService';
import { GamificationService } from './gamificationService';
import { getLocalDateString } from '../utils/dateUtils';

/**
 * Vocabulário LEGADO de `type`. Cuidado: 'meal'/'visual' são os valores da CHECK da
 * tabela `posts`, não da `meals` — a `meals` aceita 'manual'|'ai-chat'|'ai-photo'|
 * 'ai-voice' (ver supabase-schema.sql). Gravar 'visual' numa base com a CHECK certa
 * viola a constraint e derruba TODO registro por foto ("erro ao registrar refeição").
 *
 * Por isso o insert usa o tipo real do app e só cai neste mapa se o banco recusar —
 * assim funciona nas duas versões de schema que existem por aí.
 */
const mapMealTypeToDbLegacy = (type: string): string => (type === 'ai-photo' ? 'visual' : 'meal');

/** Violação de CHECK constraint no Postgres. */
const CHECK_VIOLATION = '23514';

/** Linhas antigas gravadas com o vocabulário errado — só para o ícone da lista. */
const mapDbTypeToApp = (type: string): Meal['type'] => {
    if (type === 'visual') return 'ai-photo';
    if (type === 'manual' || type === 'ai-chat' || type === 'ai-photo' || type === 'ai-voice') return type;
    return 'ai-chat'; // 'meal' legado e qualquer valor desconhecido
};

export const MealService = {
    // Upload image to Supabase Storage
    async uploadMealImage(imageUri: string, userId: string): Promise<string | null> {
        try {
            // Convert Base64 URI to Blob
            const response = await fetch(imageUri);
            const blob = await response.blob();

            const fileExt = 'jpg'; // Assume JPG for simplicity from camera/base64
            const fileName = `${userId}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('meal-photos')
                .upload(filePath, blob, { contentType: blob.type || 'image/jpeg' });

            if (uploadError) {
                console.error('Error uploading image:', uploadError);
                return null;
            }

            const { data } = supabase.storage
                .from('meal-photos')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('Error processing image upload:', error);
            return null;
        }
    },

    // Save a meal to Supabase, returns the new meal's id
    async logMeal(meal: Meal, userId: string): Promise<string> {
        console.log('[MealService.logMeal] Logging meal:', {
            type: meal.type,
            name: meal.name,
            calories: meal.calories
        });

        let imageUrl = meal.imageUri;

        // If it's a base64 data URI (new photo), upload it
        if (meal.imageUri && meal.imageUri.startsWith('data:')) {
            const uploadedUrl = await this.uploadMealImage(meal.imageUri, userId);
            // Upload falhou → grava SEM imagem. Nunca mandar o data URI para a coluna:
            // são centenas de KB de base64 num INSERT, o que derruba a gravação inteira
            // (tamanho de payload/coluna) e transforma um problema de storage — que a
            // foto no chat já compensa — em "erro ao registrar refeição".
            imageUrl = uploadedUrl ?? undefined;
            if (!uploadedUrl) {
                console.warn('[MealService.logMeal] Foto não subiu; refeição será salva sem imagem.');
            }
        }

        const insertWithType = (dbType: string) => supabase
            .from('meals')
            .insert({
                user_id: userId,
                name: meal.name,
                calories: Math.round(meal.calories),
                protein: Math.round(meal.macros.protein),
                carbs: Math.round(meal.macros.carbs),
                fats: Math.round(meal.macros.fats),
                type: dbType,
                items: meal.items,
                image_url: imageUrl,
            })
            .select('id')
            .single();

        // Tenta com o tipo real do app (o que a CHECK da tabela `meals` espera).
        let { data, error } = await insertWithType(meal.type);

        // Base antiga com o vocabulário de `posts` na coluna: repete com o legado.
        if (error?.code === CHECK_VIOLATION) {
            const legacyType = mapMealTypeToDbLegacy(meal.type);
            console.warn(`[MealService.logMeal] meals.type recusou "${meal.type}"; repetindo como "${legacyType}"`);
            ({ data, error } = await insertWithType(legacyType));
        }

        if (error || !data) {
            console.error('[MealService.logMeal] Error:', error);
            throw error ?? new Error('Insert da refeição não retornou id');
        }

        console.log('[MealService.logMeal] Success! Meal ID:', data.id);

        // Estatísticas/gamificação são derivadas. A refeição já está salva e a
        // interface não precisa esperar várias consultas adicionais.
        void this.syncDailyStats(userId);

        return data.id as string;
    },

    // Get meals for a specific date
    async getMeals(userId: string, date: Date = new Date()): Promise<Meal[]> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('meals')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', startOfDay.toISOString())
            .lte('created_at', endOfDay.toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((item: any) => ({
            id: item.id,
            name: item.name,
            timestamp: new Date(item.created_at),
            calories: item.calories,
            macros: {
                protein: item.protein,
                carbs: item.carbs,
                fats: item.fats
            },
            type: mapDbTypeToApp(item.type),
            items: item.items,
            imageUri: item.image_url
        }));
    },

    // Helper to sync daily stats table for gamification
    async syncDailyStats(userId: string) {
        try {
            const date = new Date();
            const stats = await StatsService.getDailyStats(userId, date);
            const formattedDate = getLocalDateString(date);

            // Upsert flow_stats
            const { error: statsError } = await supabase
                .from('flow_stats')
                .upsert({
                    user_id: userId,
                    date: formattedDate,
                    flow_score: stats.flowScore,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, date' });

            if (statsError) throw statsError;

            // Trigger Gamification Sync
            await GamificationService.updateStats(userId);

        } catch (e) {
            console.error("Error syncing daily stats:", e);
        }
    },

    async deleteMeal(mealId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('meals')
            .delete()
            .eq('id', mealId)
            .eq('user_id', userId);

        if (error) throw error;
        void this.syncDailyStats(userId);
    },

    async updateMeal(mealId: string, userId: string, updates: Partial<Meal>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.calories !== undefined) dbUpdates.calories = Math.round(updates.calories);
        if (updates.macros) {
            dbUpdates.protein = Math.round(updates.macros.protein);
            dbUpdates.carbs = Math.round(updates.macros.carbs);
            dbUpdates.fats = Math.round(updates.macros.fats);
        }
        if (updates.items !== undefined) dbUpdates.items = updates.items;

        const { error } = await supabase
            .from('meals')
            .update(dbUpdates)
            .eq('id', mealId)
            .eq('user_id', userId);

        if (error) throw error;
        void this.syncDailyStats(userId);
    }
};
