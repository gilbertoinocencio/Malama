import { supabase } from './supabase';
import { GamificationService } from './gamificationService';

export interface DailyLogData {
    id?: string;
    user_id: string;
    date: string;
    energy_level?: 'Baixa' | 'Média' | 'Boa' | 'Flow';
    mood?: string;
    notes?: string;
    photo_url?: string;
    flow_score?: number;
}

export const DailyLogService = {
    // Get log for a specific date
    async getDailyLog(userId: string, date: Date = new Date()): Promise<DailyLogData | null> {
        const formattedDate = date.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('date', formattedDate)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            console.error('Error fetching daily log:', error);
            return null;
        }

        return data;
    },

    // Upsert log (Create or Update)
    async saveDailyLog(logData: Partial<DailyLogData> & { user_id: string; date: string }, shareToFeed: boolean = false) {
        // Check if exists
        const dateObj = new Date(logData.date);
        const existing = await this.getDailyLog(logData.user_id, dateObj);
        let savedLog: DailyLogData | null = null;

        if (existing) {
            // Update
            const { data, error } = await supabase
                .from('daily_logs')
                .update(logData)
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            savedLog = data;
        } else {
            // Insert
            const { data, error } = await supabase
                .from('daily_logs')
                .insert(logData)
                .select()
                .single();

            if (error) throw error;
            savedLog = data;
        }

        // Handle Share to Feed
        if (shareToFeed && savedLog && (savedLog.photo_url || savedLog.notes)) {
            try {
                await supabase.from('posts').insert({
                    user_id: savedLog.user_id,
                    image_url: savedLog.photo_url,
                    caption: savedLog.notes || 'Meu Flow do dia',
                    flow_score: savedLog.flow_score || 0
                });
            } catch (postError) {
                console.error("Error sharing to feed:", postError);
                // Don't fail the whole save if posting fails, just log it
            }
        }

        // Trigger Gamification Sync
        await GamificationService.updateStats(logData.user_id);

        return savedLog;
    },

    async uploadJournalPhoto(userId: string, file: File): Promise<string> {
        const fileName = `${userId}/${Date.now()}_journal.jpg`;
        const { data, error } = await supabase.storage
            .from('meal-photos') // Reusing bucket for now
            .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('meal-photos')
            .getPublicUrl(fileName);

        return publicUrl;
    }
};
