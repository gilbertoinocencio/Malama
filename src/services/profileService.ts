import { supabase } from './supabase';

export interface ProfileUpdates {
    display_name?: string;
    biotype?: 'ecto' | 'meso' | 'endo';
    goal?: 'aesthetic' | 'health' | 'performance';
    activity_level?: 'sedentary' | 'moderate' | 'intense';
    target_calories?: number;
    target_protein?: number;
    target_carbs?: number;
    target_fats?: number;
    weight?: number;
    height?: number;
    age?: number;
    gender?: 'male' | 'female';
}

export const ProfileService = {
    async updateProfile(userId: string, updates: ProfileUpdates) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    calculateTargets(
        weightKg: number,
        heightCm: number,
        age: number,
        gender: 'male' | 'female',
        activityLevel: 'sedentary' | 'moderate' | 'intense',
        goal: 'aesthetic' | 'health' | 'performance',
        biotype: 'ecto' | 'meso' | 'endo'
    ): { calories: number; protein: number; carbs: number; fats: number } {

        // Harris-Benedict BMR
        let bmr = 0;
        if (gender === 'male') {
            bmr = 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age);
        } else {
            bmr = 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age);
        }

        // Activity Multiplier
        const multipliers = {
            sedentary: 1.2,
            moderate: 1.55,
            intense: 1.725
        };
        let tdee = bmr * (multipliers[activityLevel] || 1.2);

        // Goal Adjustment
        if (goal === 'aesthetic') tdee -= 300; // Deficit for definition
        if (goal === 'performance') tdee += 200; // Surplus for fuel
        // Health = Maintenance

        // Macros (Simplified Split based on Biotype/Goal)
        // Ecto: High Carb
        // Meso: Balanced
        // Endo: Lower Carb

        let pSplit = 0.3;
        let cSplit = 0.4;
        let fSplit = 0.3;

        if (biotype === 'ecto') { cSplit = 0.5; pSplit = 0.25; fSplit = 0.25; }
        if (biotype === 'endo') { cSplit = 0.25; pSplit = 0.4; fSplit = 0.35; }

        const calories = Math.round(tdee);
        const protein = Math.round((calories * pSplit) / 4);
        const carbs = Math.round((calories * cSplit) / 4);
        const fats = Math.round((calories * fSplit) / 9);

        return { calories, protein, carbs, fats };
    }
};
