import { supabase } from './supabase';
import { Meal, DailyStats } from '../types';
import { INITIAL_STATS } from '../constants';
import { StatsService } from './statsService';
import { GamificationService } from './gamificationService';
import { getLocalDateString } from '../utils/dateUtils';

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
                .upload(filePath, blob);

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
        let imageUrl = meal.imageUri;

        // If it's a base64 data URI (new photo), upload it
        if (meal.imageUri && meal.imageUri.startsWith('data:')) {
            const uploadedUrl = await this.uploadMealImage(meal.imageUri, userId);
            if (uploadedUrl) {
                imageUrl = uploadedUrl;
            }
        }

        const { data, error } = await supabase
            .from('meals')
            .insert({
                user_id: userId,
                name: meal.name,
                calories: Math.round(meal.calories),
                protein: Math.round(meal.macros.protein),
                carbs: Math.round(meal.macros.carbs),
                fats: Math.round(meal.macros.fats),
                type: meal.type,
                items: meal.items,
                image_url: imageUrl,
            })
            .select('id')
            .single();

        if (error) throw error;

        // Also sync daily stats for gamification
        await this.syncDailyStats(userId);

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
            type: item.type,
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
        await this.syncDailyStats(userId);
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
        await this.syncDailyStats(userId);
    }
};
