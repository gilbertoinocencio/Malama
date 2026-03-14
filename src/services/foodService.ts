import { supabase } from './supabase';

export interface FoodItem {
    id?: string;
    name: string;
    category: 'protein' | 'carbs' | 'fats';
    tier: 'budget' | 'balanced' | 'premium';
    calories?: number;
    macros?: { p: number; c: number; f: number };
    image_url?: string;
    quality_score?: number; // 1-4
}

export const FoodService = {
    async getFoods(): Promise<FoodItem[]> {
        const { data, error } = await supabase
            .from('food_guide_items')
            .select('*');

        if (error) {
            console.error('Error fetching foods:', error);
            return [];
        }
        return data;
    },

    async getFoodsByFilter(category: string, tier: string): Promise<FoodItem[]> {
        const { data, error } = await supabase
            .from('food_guide_items')
            .select('*')
            .eq('category', category)
            .eq('tier', tier);

        if (error) {
            console.error('Error fetching filtered foods:', error);
            return [];
        }
        return data;
    },

    // Swap: get a random alternative from same category+tier, excluding current
    async getSwapAlternative(currentName: string, category: string, tier: string): Promise<FoodItem | null> {
        const { data, error } = await supabase
            .from('food_guide_items')
            .select('*')
            .eq('category', category)
            .eq('tier', tier)
            .neq('name', currentName);

        if (error || !data || data.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * data.length);
        return data[randomIndex];
    },

    // Seed function to populate DB if empty
    async seedInitialFoods() {
        const initialFoods: FoodItem[] = [
            // ═══════════════════════════════════════
            // PROTEINS
            // ═══════════════════════════════════════
            // Budget
            { name: 'Ovos', category: 'protein', tier: 'budget', calories: 155, macros: { p: 13, c: 1, f: 11 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400' },
            { name: 'Sardinha em lata', category: 'protein', tier: 'budget', calories: 208, macros: { p: 25, c: 0, f: 11 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1611171711912-e3f6b536f532?w=400' },
            { name: 'Fígado bovino', category: 'protein', tier: 'budget', calories: 135, macros: { p: 20, c: 4, f: 4 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=400' },
            // Balanced
            { name: 'Frango (peito)', category: 'protein', tier: 'balanced', calories: 165, macros: { p: 31, c: 0, f: 4 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400' },
            { name: 'Carne moída', category: 'protein', tier: 'balanced', calories: 250, macros: { p: 26, c: 0, f: 15 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400' },
            { name: 'Tilápia', category: 'protein', tier: 'balanced', calories: 128, macros: { p: 26, c: 0, f: 3 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1510130113581-a4f1f5e35285?w=400' },
            // Premium
            { name: 'Salmão', category: 'protein', tier: 'premium', calories: 208, macros: { p: 20, c: 0, f: 13 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=400' },
            { name: 'Picanha', category: 'protein', tier: 'premium', calories: 250, macros: { p: 25, c: 0, f: 16 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400' },
            { name: 'Camarão', category: 'protein', tier: 'premium', calories: 99, macros: { p: 24, c: 0, f: 1 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400' },
            { name: 'Whey Protein', category: 'protein', tier: 'premium', calories: 120, macros: { p: 25, c: 3, f: 1 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1593095948071-474c5cc2c1cf?w=400' },

            // ═══════════════════════════════════════
            // CARBS
            // ═══════════════════════════════════════
            // Budget
            { name: 'Arroz branco', category: 'carbs', tier: 'budget', calories: 130, macros: { p: 3, c: 28, f: 0 }, quality_score: 2, image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
            { name: 'Macarrão', category: 'carbs', tier: 'budget', calories: 131, macros: { p: 5, c: 25, f: 1 }, quality_score: 2, image_url: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400' },
            { name: 'Banana', category: 'carbs', tier: 'budget', calories: 89, macros: { p: 1, c: 23, f: 0 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400' },
            // Balanced
            { name: 'Batata doce', category: 'carbs', tier: 'balanced', calories: 86, macros: { p: 2, c: 20, f: 0 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1596097635121-14b63b7a7c19?w=400' },
            { name: 'Aveia', category: 'carbs', tier: 'balanced', calories: 389, macros: { p: 17, c: 66, f: 7 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400' },
            { name: 'Mandioca', category: 'carbs', tier: 'balanced', calories: 160, macros: { p: 1, c: 38, f: 0 }, quality_score: 2, image_url: 'https://images.unsplash.com/photo-1599839575338-31b11ae53f8a?w=400' },
            // Premium
            { name: 'Quinoa', category: 'carbs', tier: 'premium', calories: 120, macros: { p: 4, c: 21, f: 2 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
            { name: 'Arroz integral', category: 'carbs', tier: 'premium', calories: 111, macros: { p: 3, c: 23, f: 1 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1536304993881-460587544b2b?w=400' },
            { name: 'Pão integral artesanal', category: 'carbs', tier: 'premium', calories: 247, macros: { p: 13, c: 41, f: 4 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' },

            // ═══════════════════════════════════════
            // FATS
            // ═══════════════════════════════════════
            // Budget
            { name: 'Azeite de oliva', category: 'fats', tier: 'budget', calories: 884, macros: { p: 0, c: 0, f: 100 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcdbf41?w=400' },
            { name: 'Amendoim', category: 'fats', tier: 'budget', calories: 567, macros: { p: 26, c: 16, f: 49 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1567892320421-1c657571ea4a?w=400' },
            { name: 'Manteiga', category: 'fats', tier: 'budget', calories: 717, macros: { p: 1, c: 0, f: 81 }, quality_score: 2, image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400' },
            // Balanced
            { name: 'Abacate', category: 'fats', tier: 'balanced', calories: 160, macros: { p: 2, c: 9, f: 15 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1523049673856-356ccc615d82?w=400' },
            { name: 'Coco ralado', category: 'fats', tier: 'balanced', calories: 354, macros: { p: 3, c: 15, f: 33 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1580984969071-a8da8c4e7b17?w=400' },
            { name: 'Pasta de amendoim', category: 'fats', tier: 'balanced', calories: 588, macros: { p: 25, c: 20, f: 50 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400' },
            // Premium
            { name: 'Nozes', category: 'fats', tier: 'premium', calories: 654, macros: { p: 15, c: 14, f: 65 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1533230678252-c65f97371131?w=400' },
            { name: 'Castanha-do-pará', category: 'fats', tier: 'premium', calories: 656, macros: { p: 14, c: 12, f: 66 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400' },
            { name: 'Azeite trufado', category: 'fats', tier: 'premium', calories: 884, macros: { p: 0, c: 0, f: 100 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcdbf41?w=400' },
        ];

        // Check if empty
        const { count } = await supabase.from('food_guide_items').select('*', { count: 'exact', head: true });

        if (count === 0) {
            const { error } = await supabase.from('food_guide_items').insert(initialFoods);
            if (error) console.error("Error seeding foods:", error);
        }
    }
};
