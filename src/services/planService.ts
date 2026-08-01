import { supabase } from './supabase';
import { generatePlanContent } from './caramelService';
import { ClinicalLoopService } from './clinicalLoopService';

export interface QuarterlyPlanPhase {
    title: string;
    tag: string;
    focus: string;
    bullets: string[];
    description?: string; // legado — planos gerados antes da reformatação
}

export interface QuarterlyPlanData {
    id?: string;
    calories: number;
    macros: { protein: number; carbs: number; fats: number };
    optimization_tag: string;
    phases: QuarterlyPlanPhase[];
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

    // Generate a new plan using Caramel and save it
    async generatePlan(userId: string, onboardingId?: string): Promise<QuarterlyPlanData> {
        // 1. Fetch User Profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError || !profile) throw new Error("Profile not found");

        // 2. Fetch onboarding data if provided
        let onboardingData = null;
        if (onboardingId) {
            const { data, error } = await supabase
                .from('nutritionist_onboarding')
                .select('data')
                .eq('id', onboardingId)
                .single();

            if (!error && data) {
                onboardingData = data.data;
            }
        }

        // 3. Generate Plan with AI (using onboarding data if available)
        const planContent = await generatePlanContent(profile, onboardingData);

        // 4. Archive old active plans
        await supabase
            .from('quarterly_plans')
            .update({ status: 'archived' })
            .eq('user_id', userId)
            .eq('status', 'active');

        // 5. Save new plan
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
                end_date: endDate.toISOString(),
                onboarding_id: onboardingId || null
            })
            .select()
            .single();

        if (saveError) throw saveError;

        // 6. Persiste a sugestão da IA (loop fechado) e registra a conduta de macros.
        //    A conduta via RPC atualiza profiles E grava no ledger imutável numa só
        //    transação, vinculada ao report de origem (source_report_id).
        let reportId: string | null = null;
        try {
            reportId = await ClinicalLoopService.saveAiReport({
                patient_id:        userId,
                report_type:       'plan_suggestion',
                model:             'caramelo-fenomeno',
                content:           `Plano IA — ${planContent.calories} kcal | P ${planContent.macros.protein}g · C ${planContent.macros.carbs}g · G ${planContent.macros.fats}g`,
                structured_output: { ...planContent, plan_id: newPlan.id },
                input_snapshot:    { profile, onboarding: onboardingData },
            });
        } catch (e) {
            console.error('Falha ao persistir plan_suggestion:', e);
        }

        try {
            await ClinicalLoopService.applyMacroConduct(
                userId,
                {
                    calories: planContent.calories,
                    protein:  planContent.macros.protein,
                    carbs:    planContent.macros.carbs,
                    fats:     planContent.macros.fats,
                },
                { sourceReportId: reportId, rationale: 'Plano nutricional gerado pela IA' }
            );
        } catch (e) {
            // Fallback: garante que o dashboard reflita as metas mesmo se a RPC falhar
            console.error('applyMacroConduct falhou, usando update direto:', e);
            await supabase
                .from('profiles')
                .update({
                    target_calories: planContent.calories,
                    target_protein: planContent.macros.protein,
                    target_carbs: planContent.macros.carbs,
                    target_fats: planContent.macros.fats
                })
                .eq('id', userId);
        }

        return {
            id: newPlan.id,
            ...newPlan.content,
            start_date: newPlan.start_date,
            end_date: newPlan.end_date
        };
    }
};
