import { supabase } from './supabase';
import { generatePlanContent } from './geminiService';

export interface QuarterlyPlanData {
    id?: string;
    calories: number;
    macros: { protein: number; carbs: number; fats: number };
    optimization_tag: string;
    phases: Array<{ title: string; tag: string; description: string }>;
    start_date?: string;
    end_date?: string;
}

export const PlanService = {
    // Fetch the active plan for the user
    async getActivePlan(userId: string): Promise<QuarterlyPlanData | null> {
        const { data, error } = await supabase
            .from('quarterly_plans')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // No rows found
            console.error('Error fetching plan:', error);
            return null;
        }

        // Transform DB content (jsonb) to app interface
        return {
            id: data.id,
            ...data.content,
            start_date: data.start_date,
            end_date: data.end_date
        };
    },

    // Generate a new plan using Gemini and save it
    async generatePlan(userId: string): Promise<QuarterlyPlanData> {
        // 1. Fetch User Profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError || !profile) throw new Error("Profile not found");

        // 2. Generate Plan with AI
        const planContent = await generatePlanContent(profile);

        // 3. Archive old active plans
        await supabase
            .from('quarterly_plans')
            .update({ status: 'archived' })
            .eq('user_id', userId)
            .eq('status', 'active');

        // 4. Save new plan
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3);

        const { data: newPlan, error: saveError } = await supabase
            .from('quarterly_plans')
            .insert({
                user_id: userId,
                content: planContent,
                status: 'active',
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString()
            })
            .select()
            .single();

        if (saveError) throw saveError;

        return {
            id: newPlan.id,
            ...newPlan.content,
            start_date: newPlan.start_date,
            end_date: newPlan.end_date
        };
    }
};
