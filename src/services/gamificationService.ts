import { supabase } from './supabase';

export type UserLevel = 'seed' | 'root' | 'stem' | 'flower' | 'fruit';

export const LEVEL_THRESHOLDS = {
    seed: 0,
    root: 1000,
    stem: 3000,
    flower: 8000,
    fruit: 20000 // XP based now
};

export interface GamificationStats {
    currentStreak: number;
    longestStreak: number;
    totalFlowDays: number;
    level: UserLevel;
    xp: number;
}

export interface Achievement {
    id: string;
    code: string;
    title: string;
    description: string;
    icon_url: string;
    xp_reward: number;
    unlocked_at?: string; // If unlocked by user
}

export const GamificationService = {

    // Calculate level based on XP
    calculateLevel(xp: number): UserLevel {
        if (xp >= LEVEL_THRESHOLDS.fruit) return 'fruit';
        if (xp >= LEVEL_THRESHOLDS.flower) return 'flower';
        if (xp >= LEVEL_THRESHOLDS.stem) return 'stem';
        if (xp >= LEVEL_THRESHOLDS.root) return 'root';
        return 'seed';
    },

    // Calculate current streak based on flow_stats (client-side logic preserved for now)
    async calculateStreak(userId: string): Promise<number> {
        try {
            const { data: stats, error } = await supabase
                .from('flow_stats')
                .select('date, flow_score')
                .eq('user_id', userId)
                .order('date', { ascending: false });

            if (error || !stats || stats.length === 0) return 0;

            let streak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let lastDate = new Date(stats[0].date);
            lastDate.setHours(0, 0, 0, 0);

            // If the last log is not from today or yesterday, streak is broken
            const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 1) return 0;

            // Simple consecutive check
            for (let i = 0; i < stats.length; i++) {
                if (stats[i].flow_score >= 75) {
                    if (i === 0) {
                        streak++;
                    } else {
                        const current = new Date(stats[i].date);
                        const prev = new Date(stats[i - 1].date);
                        current.setHours(0, 0, 0, 0);
                        prev.setHours(0, 0, 0, 0);

                        const diff = Math.floor((prev.getTime() - current.getTime()) / (1000 * 24 * 60 * 60));
                        if (diff === 1) {
                            streak++;
                        } else {
                            break;
                        }
                    }
                } else {
                    break;
                }
            }
            return streak;
        } catch (e) {
            console.error("Streak calculation error", e);
            return 0;
        }
    },

    // Check and unlock achievements
    async checkAchievements(userId: string, currentStats: GamificationStats) {
        // 1. Fetch all achievable outcomes
        const { data: allAchievements } = await supabase.from('achievements').select('*');
        if (!allAchievements) return;

        // 2. Fetch already unlocked
        const { data: unlocked } = await supabase.from('user_achievements').select('achievement_id').eq('user_id', userId);
        const unlockedIds = new Set(unlocked?.map(u => u.achievement_id));

        const newUnlocks: Achievement[] = [];

        for (const achievement of allAchievements) {
            if (unlockedIds.has(achievement.id)) continue;

            let conditionMet = false;

            if (achievement.condition_type === 'streak') {
                if (currentStats.currentStreak >= achievement.condition_value) conditionMet = true;
            }
            // Add more conditions here (log_count, flow_score, etc.)

            if (conditionMet) {
                // Unlock!
                await supabase.from('user_achievements').insert({
                    user_id: userId,
                    achievement_id: achievement.id
                });
                newUnlocks.push(achievement);
            }
        }

        return newUnlocks; // Return to UI to show toast
    },

    // Update user stats after a daily log is saved
    async updateStats(userId: string): Promise<{ stats: GamificationStats, newUnlocks: Achievement[] } | null> {
        try {
            // 1. Calculate Streak
            const currentStreak = await this.calculateStreak(userId);

            // 2. Fetch current profile
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (!profile) return null;

            const longestStreak = Math.max(profile.longest_streak || 0, currentStreak);

            // 3. Calculate Total Flow Days
            const { count } = await supabase
                .from('flow_stats')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gte('flow_score', 75);

            const totalFlowDays = count || 0;

            // 4. Calculate XP (Simple Logic for now: 100xp per flow day + 10xp per log)
            // Real logic requires separate xp_ledger table, but for MVP we estimate
            const estimatedXP = (totalFlowDays * 100) + (profile.total_xp || 0); // Incremental update is better in future

            const level = this.calculateLevel(estimatedXP);

            // 5. Update Profile
            const { error: updateError } = await supabase.from('profiles').update({
                current_streak: currentStreak,
                longest_streak: longestStreak,
                total_flow_days: totalFlowDays,
                total_xp: estimatedXP,
                level: level,
                last_activity_date: new Date().toISOString()
            }).eq('id', userId);

            if (updateError) throw updateError;

            const stats: GamificationStats = {
                currentStreak,
                longestStreak,
                totalFlowDays,
                level,
                xp: estimatedXP
            };

            // 6. Check Achievements
            const newUnlocks = await this.checkAchievements(userId, stats) || [];

            return { stats, newUnlocks };

        } catch (e) {
            console.error("Gamification Sync Error", e);
            return null;
        }
    },

    async getUserAchievements(userId: string) {
        const { data, error } = await supabase
            .from('user_achievements')
            .select('*, achievement:achievements(*)')
            .eq('user_id', userId);

        if (error) return [];
        return data.map(d => ({
            ...d.achievement,
            unlocked_at: d.unlocked_at
        }));
    }
};
