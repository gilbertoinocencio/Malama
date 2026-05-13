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
    is_vegetarian?: boolean; // true se não contiver carne animal
    is_vegan?: boolean; // true se não contiver nenhum produto animal
    regions?: string[]; // ['nacional', 'norte', 'nordeste', etc.]
}

// Alimentos que NÃO são vegetarianos (contêm carne/peixe)
const NON_VEGETARIAN_FOODS = [
    'sardinha', 'frango', 'carne', 'tilápia', 'salmão', 'picanha',
    'camarão', 'fígado', 'peixe', 'frutos do mar', 'atum', 'bacalhau'
];

// Alimentos que NÃO são veganos (contêm produtos animais: ovos, laticínios, mel)
const NON_VEGAN_FOODS = [
    ...NON_VEGETARIAN_FOODS,
    'ovo', 'leite', 'queijo', 'manteiga', 'whey', 'iogurte',
    'creme', 'requeijão', 'coalhada', 'mel', 'gelatina'
];

/**
 * Verifica se um alimento é vegetariano
 */
function isVegetarianFood(name: string): boolean {
    const lowerName = name.toLowerCase();
    return !NON_VEGETARIAN_FOODS.some(meat => lowerName.includes(meat));
}

/**
 * Verifica se um alimento é vegano
 */
function isVeganFood(name: string): boolean {
    const lowerName = name.toLowerCase();
    return !NON_VEGAN_FOODS.some(animal => lowerName.includes(animal));
}

/**
 * Filtra alimentos baseado nas restrições alimentares do usuário
 */
export function filterFoodsByRestrictions(
    foods: FoodItem[],
    restrictions: string[]
): FoodItem[] {
    if (!restrictions || restrictions.length === 0) {
        return foods; // Sem restrições, retorna todos
    }

    const isVegetarian = restrictions.some(r =>
        r.toLowerCase().includes('vegetarian')
    );
    const isVegan = restrictions.some(r =>
        r.toLowerCase().includes('vegano') || r.toLowerCase().includes('vegan')
    );
    const isLactoseFree = restrictions.some(r =>
        r.toLowerCase().includes('lactose') || r.toLowerCase().includes('leite')
    );
    const isGlutenFree = restrictions.some(r =>
        r.toLowerCase().includes('glúten') || r.toLowerCase().includes('gluten')
    );

    return foods.filter(food => {
        const name = food.name.toLowerCase();

        // Vegetariano: remove carnes/peixes
        if (isVegetarian && !isVegetarianFood(food.name)) {
            return false;
        }

        // Vegano: remove todos produtos animais
        if (isVegan && !isVeganFood(food.name)) {
            return false;
        }

        // Sem lactose: remove laticínios
        if (isLactoseFree) {
            const dairyKeywords = ['leite', 'queijo', 'manteiga', 'iogurte', 'whey', 'creme'];
            if (dairyKeywords.some(keyword => name.includes(keyword))) {
                return false;
            }
        }

        // Sem glúten: remove trigo, cevada, centeio, aveia não certificada, pão, macarrão
        if (isGlutenFree) {
            const glutenKeywords = [
                'trigo', 'cevada', 'centeio', 'aveia', 'pão', 'macarrão',
                'pasta', 'farinha', 'biscoito', 'bolacha', 'cereal', 'granola',
                'panqueca', 'waffle', 'pizza', 'lasanha', 'ravioli', 'nhoque'
            ];
            if (glutenKeywords.some(keyword => name.includes(keyword))) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Filtra alimentos por região do Brasil
 * Prioriza alimentos regionais + nacionais
 */
export function filterFoodsByRegion(
    foods: FoodItem[],
    userRegion?: string
): FoodItem[] {
    if (!userRegion || userRegion === 'nacional') {
        return foods; // Sem região específica, retorna todos
    }

    const regionMap: Record<string, string> = {
        'AC': 'norte', 'AM': 'norte', 'AP': 'norte', 'PA': 'norte', 'RO': 'norte', 'RR': 'norte', 'TO': 'norte',
        'AL': 'nordeste', 'BA': 'nordeste', 'CE': 'nordeste', 'MA': 'nordeste', 'PB': 'nordeste',
        'PE': 'nordeste', 'PI': 'nordeste', 'RN': 'nordeste', 'SE': 'nordeste',
        'DF': 'centro-oeste', 'GO': 'centro-oeste', 'MS': 'centro-oeste', 'MT': 'centro-oeste',
        'ES': 'sudeste', 'MG': 'sudeste', 'RJ': 'sudeste', 'SP': 'sudeste',
        'PR': 'sul', 'RS': 'sul', 'SC': 'sul'
    };

    const normalizedRegion = regionMap[userRegion.toUpperCase()] || userRegion.toLowerCase();

    return foods.filter(food => {
        const foodRegions = food.regions || ['nacional'];

        // Sempre inclui alimentos nacionais
        if (foodRegions.includes('nacional')) {
            return true;
        }

        // Inclui alimentos da região do usuário
        if (foodRegions.includes(normalizedRegion)) {
            return true;
        }

        return false;
    });
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

    async getFoodsByFilter(
        category: string,
        tier: string,
        restrictions?: string[],
        userRegion?: string
    ): Promise<FoodItem[]> {
        const { data, error } = await supabase
            .from('food_guide_items')
            .select('*')
            .eq('category', category)
            .eq('tier', tier);

        if (error) {
            console.error('Error fetching filtered foods:', error);
            return [];
        }

        let filteredFoods = data;

        // Aplica filtro de região se fornecido
        if (userRegion) {
            console.log(`📍 Filtrando por região: ${userRegion}`);
            filteredFoods = filterFoodsByRegion(filteredFoods, userRegion);
            console.log(`✅ ${filteredFoods.length}/${data.length} alimentos após filtro regional`);
        }

        // Aplica filtro de restrições se fornecido
        if (restrictions && restrictions.length > 0) {
            console.log(`🥗 Aplicando restrições: ${restrictions.join(', ')}`);
            filteredFoods = filterFoodsByRestrictions(filteredFoods, restrictions);
            console.log(`✅ ${filteredFoods.length}/${data.length} alimentos após filtro de restrições`);
        }

        return filteredFoods;
    },

    // Swap: get a random alternative from same category+tier, excluding current
    // Agora respeita restrições alimentares
    async getSwapAlternative(
        currentName: string,
        category: string,
        tier: string,
        restrictions?: string[]
    ): Promise<FoodItem | null> {
        const { data, error } = await supabase
            .from('food_guide_items')
            .select('*')
            .eq('category', category)
            .eq('tier', tier)
            .neq('name', currentName);

        if (error || !data || data.length === 0) return null;

        // Filtra por restrições se necessário
        let candidates = data;
        if (restrictions && restrictions.length > 0) {
            candidates = filterFoodsByRestrictions(data, restrictions);
        }

        if (candidates.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * candidates.length);
        return candidates[randomIndex];
    },

    // Seed function to populate DB if empty
    async seedInitialFoods() {
        // Primeiro verificar se a tabela existe
        try {
            const { data: checkTable, error: tableError } = await supabase
                .from('food_guide_items')
                .select('id')
                .limit(1);

            // Se a tabela não existir, retornar sem erro
            if (tableError) {
                console.warn('⚠️ Tabela food_guide_items não encontrada. Execute o SQL de setup primeiro.');
                return;
            }
        } catch (error) {
            console.warn('⚠️ Não foi possível verificar a tabela food_guide_items:', error);
            return;
        }

        const initialFoods: FoodItem[] = [
            // ═══════════════════════════════════════════════
            // PROTEÍNAS — Budget
            // ═══════════════════════════════════════════════
            { name: 'Ovos',                 category: 'protein', tier: 'budget',   calories: 155, macros: { p: 13, c: 1,  f: 11 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400' },
            { name: 'Sardinha em lata',     category: 'protein', tier: 'budget',   calories: 208, macros: { p: 25, c: 0,  f: 11 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1611171711912-e3f6b536f532?w=400' },
            { name: 'Fígado bovino',        category: 'protein', tier: 'budget',   calories: 135, macros: { p: 20, c: 4,  f: 4  }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=400' },
            { name: 'Atum em lata',         category: 'protein', tier: 'budget',   calories: 116, macros: { p: 26, c: 0,  f: 1  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1560717789-0ac7c58ac90a?w=400' },
            { name: 'Frango (coxa)',        category: 'protein', tier: 'budget',   calories: 172, macros: { p: 26, c: 0,  f: 7  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c5?w=400' },
            { name: 'Lentilha',            category: 'protein', tier: 'budget',   calories: 116, macros: { p: 9,  c: 20, f: 0  }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1585485832068-c2b6c3f98487?w=400' },
            { name: 'Feijão carioca',      category: 'protein', tier: 'budget',   calories: 76,  macros: { p: 5,  c: 14, f: 0  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' },

            // PROTEÍNAS — Balanced
            { name: 'Frango (peito)',       category: 'protein', tier: 'balanced', calories: 165, macros: { p: 31, c: 0,  f: 4  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400' },
            { name: 'Carne moída',          category: 'protein', tier: 'balanced', calories: 250, macros: { p: 26, c: 0,  f: 15 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400' },
            { name: 'Tilápia',             category: 'protein', tier: 'balanced', calories: 128, macros: { p: 26, c: 0,  f: 3  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1510130113581-a4f1f5e35285?w=400' },
            { name: 'Peito de peru',        category: 'protein', tier: 'balanced', calories: 135, macros: { p: 29, c: 0,  f: 2  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?w=400' },
            { name: 'Músculo bovino',       category: 'protein', tier: 'balanced', calories: 155, macros: { p: 25, c: 0,  f: 5  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1546964124-0cce460e10e9?w=400' },
            { name: 'Queijo cottage',       category: 'protein', tier: 'balanced', calories: 98,  macros: { p: 11, c: 3,  f: 5  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1613545325278-f24b0cae1224?w=400' },
            { name: 'Atum em água',         category: 'protein', tier: 'balanced', calories: 110, macros: { p: 25, c: 0,  f: 1  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1560717789-0ac7c58ac90a?w=400' },

            // PROTEÍNAS — Premium
            { name: 'Salmão',              category: 'protein', tier: 'premium',  calories: 208, macros: { p: 20, c: 0,  f: 13 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=400' },
            { name: 'Picanha',             category: 'protein', tier: 'premium',  calories: 250, macros: { p: 25, c: 0,  f: 16 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400' },
            { name: 'Camarão',             category: 'protein', tier: 'premium',  calories: 99,  macros: { p: 24, c: 0,  f: 1  }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400' },
            { name: 'Whey Protein',        category: 'protein', tier: 'premium',  calories: 120, macros: { p: 25, c: 3,  f: 1  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1593095948071-474c5cc2c1cf?w=400' },
            { name: 'Filé mignon',         category: 'protein', tier: 'premium',  calories: 218, macros: { p: 21, c: 0,  f: 14 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400' },
            { name: 'Bacalhau',            category: 'protein', tier: 'premium',  calories: 82,  macros: { p: 18, c: 0,  f: 1  }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400' },
            { name: 'Carne seca magra',    category: 'protein', tier: 'premium',  calories: 198, macros: { p: 42, c: 0,  f: 3  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1529694157872-4e0c0f3b238b?w=400' },

            // ═══════════════════════════════════════════════
            // CARBOIDRATOS — Budget
            // ═══════════════════════════════════════════════
            { name: 'Arroz branco',        category: 'carbs',   tier: 'budget',   calories: 130, macros: { p: 3,  c: 28, f: 0  }, quality_score: 2, image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
            { name: 'Macarrão',            category: 'carbs',   tier: 'budget',   calories: 131, macros: { p: 5,  c: 25, f: 1  }, quality_score: 2, image_url: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400' },
            { name: 'Banana',              category: 'carbs',   tier: 'budget',   calories: 89,  macros: { p: 1,  c: 23, f: 0  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400' },
            { name: 'Batata inglesa',      category: 'carbs',   tier: 'budget',   calories: 77,  macros: { p: 2,  c: 17, f: 0  }, quality_score: 2, image_url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400' },
            { name: 'Feijão preto',        category: 'carbs',   tier: 'budget',   calories: 132, macros: { p: 9,  c: 24, f: 0  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1506484381205-f7945653044d?w=400' },
            { name: 'Tapioca',             category: 'carbs',   tier: 'budget',   calories: 98,  macros: { p: 0,  c: 24, f: 0  }, quality_score: 2, image_url: 'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=400' },
            { name: 'Cuscuz de milho',     category: 'carbs',   tier: 'budget',   calories: 112, macros: { p: 2,  c: 24, f: 1  }, quality_score: 2, image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },

            // CARBOIDRATOS — Balanced
            { name: 'Batata doce',         category: 'carbs',   tier: 'balanced', calories: 86,  macros: { p: 2,  c: 20, f: 0  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1596097635121-14b63b7a7c19?w=400' },
            { name: 'Aveia',               category: 'carbs',   tier: 'balanced', calories: 389, macros: { p: 17, c: 66, f: 7  }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400' },
            { name: 'Mandioca',            category: 'carbs',   tier: 'balanced', calories: 160, macros: { p: 1,  c: 38, f: 0  }, quality_score: 2, image_url: 'https://images.unsplash.com/photo-1599839575338-31b11ae53f8a?w=400' },
            { name: 'Inhame',              category: 'carbs',   tier: 'balanced', calories: 118, macros: { p: 2,  c: 28, f: 0  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400' },
            { name: 'Milho verde',         category: 'carbs',   tier: 'balanced', calories: 96,  macros: { p: 3,  c: 21, f: 1  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400' },
            { name: 'Grão de bico',        category: 'carbs',   tier: 'balanced', calories: 164, macros: { p: 9,  c: 27, f: 3  }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=400' },
            { name: 'Pão integral',        category: 'carbs',   tier: 'balanced', calories: 247, macros: { p: 9,  c: 41, f: 4  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' },

            // CARBOIDRATOS — Premium
            { name: 'Quinoa',              category: 'carbs',   tier: 'premium',  calories: 120, macros: { p: 4,  c: 21, f: 2  }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
            { name: 'Arroz integral',      category: 'carbs',   tier: 'premium',  calories: 111, macros: { p: 3,  c: 23, f: 1  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1536304993881-460587544b2b?w=400' },
            { name: 'Pão integral artesanal', category: 'carbs', tier: 'premium', calories: 247, macros: { p: 13, c: 41, f: 4  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' },
            { name: 'Macarrão integral',   category: 'carbs',   tier: 'premium',  calories: 124, macros: { p: 5,  c: 25, f: 1  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400' },
            { name: 'Granola natural',     category: 'carbs',   tier: 'premium',  calories: 471, macros: { p: 10, c: 63, f: 21 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1517093157656-b9eccef91cb1?w=400' },
            { name: 'Batata yacon',        category: 'carbs',   tier: 'premium',  calories: 54,  macros: { p: 1,  c: 13, f: 0  }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1596097635121-14b63b7a7c19?w=400' },
            { name: 'Macarrão de arroz',   category: 'carbs',   tier: 'premium',  calories: 109, macros: { p: 2,  c: 25, f: 0  }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400' },

            // ═══════════════════════════════════════════════
            // GORDURAS — Budget
            // ═══════════════════════════════════════════════
            { name: 'Azeite de oliva',     category: 'fats',    tier: 'budget',   calories: 884, macros: { p: 0,  c: 0,  f: 100 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcdbf41?w=400' },
            { name: 'Amendoim',            category: 'fats',    tier: 'budget',   calories: 567, macros: { p: 26, c: 16, f: 49 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1567892320421-1c657571ea4a?w=400' },
            { name: 'Manteiga',            category: 'fats',    tier: 'budget',   calories: 717, macros: { p: 1,  c: 0,  f: 81 }, quality_score: 2, image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400' },
            { name: 'Óleo de coco',        category: 'fats',    tier: 'budget',   calories: 862, macros: { p: 0,  c: 0,  f: 100 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1564303226-7f6f52b38e6e?w=400' },
            { name: 'Linhaça',             category: 'fats',    tier: 'budget',   calories: 534, macros: { p: 18, c: 29, f: 42 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1615485291234-9d694218aeb3?w=400' },
            { name: 'Gergelim',            category: 'fats',    tier: 'budget',   calories: 573, macros: { p: 17, c: 23, f: 50 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=400' },
            { name: 'Creme de leite',      category: 'fats',    tier: 'budget',   calories: 337, macros: { p: 2,  c: 3,  f: 35 }, quality_score: 2, image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400' },

            // GORDURAS — Balanced
            { name: 'Abacate',             category: 'fats',    tier: 'balanced', calories: 160, macros: { p: 2,  c: 9,  f: 15 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1523049673856-356ccc615d82?w=400' },
            { name: 'Coco ralado',         category: 'fats',    tier: 'balanced', calories: 354, macros: { p: 3,  c: 15, f: 33 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1580984969071-a8da8c4e7b17?w=400' },
            { name: 'Pasta de amendoim',   category: 'fats',    tier: 'balanced', calories: 588, macros: { p: 25, c: 20, f: 50 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400' },
            { name: 'Chia',                category: 'fats',    tier: 'balanced', calories: 486, macros: { p: 17, c: 42, f: 31 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400' },
            { name: 'Amêndoas',            category: 'fats',    tier: 'balanced', calories: 579, macros: { p: 21, c: 22, f: 50 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400' },
            { name: 'Castanha de caju',    category: 'fats',    tier: 'balanced', calories: 553, macros: { p: 18, c: 33, f: 44 }, quality_score: 3, image_url: 'https://images.unsplash.com/photo-1563209259-2a28e188c95e?w=400' },
            { name: 'Azeite extravirgem',  category: 'fats',    tier: 'balanced', calories: 884, macros: { p: 0,  c: 0,  f: 100 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcdbf41?w=400' },

            // GORDURAS — Premium
            { name: 'Nozes',               category: 'fats',    tier: 'premium',  calories: 654, macros: { p: 15, c: 14, f: 65 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1533230678252-c65f97371131?w=400' },
            { name: 'Castanha-do-pará',    category: 'fats',    tier: 'premium',  calories: 656, macros: { p: 14, c: 12, f: 66 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400' },
            { name: 'Macadâmia',           category: 'fats',    tier: 'premium',  calories: 718, macros: { p: 8,  c: 14, f: 76 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1602081957921-9137a5d6eaee?w=400' },
            { name: 'Pistache',            category: 'fats',    tier: 'premium',  calories: 562, macros: { p: 20, c: 28, f: 45 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=400' },
            { name: 'Tahine',              category: 'fats',    tier: 'premium',  calories: 595, macros: { p: 17, c: 21, f: 54 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400' },
            { name: 'Óleo MCT',            category: 'fats',    tier: 'premium',  calories: 760, macros: { p: 0,  c: 0,  f: 100 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1564303226-7f6f52b38e6e?w=400' },
            { name: 'Azeite trufado',      category: 'fats',    tier: 'premium',  calories: 884, macros: { p: 0,  c: 0,  f: 100 }, quality_score: 4, image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcdbf41?w=400' },
        ];

        // Busca os itens existentes e insere apenas os que faltam (safe para tabelas já populadas)
        const { data: existing } = await supabase
            .from('food_guide_items')
            .select('name, category, tier');

        const existingKeys = new Set(
            (existing || []).map((f: any) => `${f.name}|${f.category}|${f.tier}`)
        );

        const newItems = initialFoods.filter(
            f => !existingKeys.has(`${f.name}|${f.category}|${f.tier}`)
        );

        if (newItems.length > 0) {
            const { error } = await supabase.from('food_guide_items').insert(newItems);
            if (error) console.error('Error seeding new foods:', error);
            else console.log(`✅ ${newItems.length} novos alimentos adicionados ao guia.`);
        }
    }
};
