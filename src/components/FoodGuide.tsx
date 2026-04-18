import React, { useState, useEffect, useCallback } from 'react';
import { AppView } from '../types';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { FoodService, FoodItem as ServiceFoodItem } from '../services/foodService';
import { MealService } from '../services/mealService';
import { MealSuggestionsCarousel } from './MealSuggestionsCarousel';
import { supabase } from '../services/supabase';

interface FoodGuideProps {
    onBack: () => void;
    onNavigate: (view: AppView) => void;
    onMealLogged?: (meal: import('../types').Meal) => void;
}

type BudgetTier = 'economic' | 'balanced' | 'premium';
type MacroCategory = 'proteins' | 'carbs' | 'fats';

// Map UI budget tier keys to DB tier values
const tierMap: Record<BudgetTier, string> = {
    economic: 'budget',
    balanced: 'balanced',
    premium: 'premium',
};

// Map UI category keys to DB category values
const categoryMap: Record<MacroCategory, string> = {
    proteins: 'protein',
    carbs: 'carbs',
    fats: 'fats',
};

interface UiFoodItem {
    name: string;
    description: string;
    priceTier: number;
    quality: number;
    image: string;
    category: string;
    tier: string;
    calories: number;
    macros: { p: number; c: number; f: number };
    swapping?: boolean;
}

const mapDbToUi = (f: ServiceFoodItem): UiFoodItem => ({
    name: f.name,
    description: `${f.calories || 0} kcal / 100g`,
    priceTier: f.tier === 'budget' ? 1 : f.tier === 'balanced' ? 2 : 3,
    quality: f.quality_score || 3,
    image: f.image_url || 'https://via.placeholder.com/150',
    category: f.category,
    tier: f.tier,
    calories: f.calories || 0,
    macros: f.macros || { p: 0, c: 0, f: 0 },
    swapping: false,
});

export const FoodGuide: React.FC<FoodGuideProps> = ({ onBack, onNavigate, onMealLogged }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [budgetTier, setBudgetTier] = useState<BudgetTier>('balanced');
    const [activeCategory, setActiveCategory] = useState<MacroCategory>('proteins');
    const [foods, setFoods] = useState<UiFoodItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [mealCount, setMealCount] = useState(0);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const [userRestrictions, setUserRestrictions] = useState<string[]>([]);
    const [userRegion, setUserRegion] = useState<string>('');
    const [dailyMealTarget, setDailyMealTarget] = useState(4);

    // Carregar perfil completo do usuário (restrições + região + localização + refeições por dia)
    useEffect(() => {
        const loadUserProfile = async () => {
            if (!user) return;
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('dietary_restrictions, region, state, country, meals_per_day')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    // Carregar restrições
                    if (profile.dietary_restrictions) {
                        setUserRestrictions(profile.dietary_restrictions);
                        console.log(`🥗 Restrições do usuário: ${profile.dietary_restrictions.join(', ')}`);
                    }

                    // Carregar meta de refeições por dia
                    if (profile.meals_per_day) {
                        setDailyMealTarget(profile.meals_per_day);
                        console.log(`🍽️ Meta de refeições do usuário: ${profile.meals_per_day}/dia`);
                    }

                    // Carregar localização (prioriza estado se existir)
                    // O estado pode vir da geolocalização GPS ou do perfil manual
                    const location = profile.state || profile.region;
                    if (location) {
                        setUserRegion(location);
                        const regionNames: Record<string, string> = {
                            'norte': 'Norte',
                            'nordeste': 'Nordeste',
                            'centro-oeste': 'Centro-Oeste',
                            'sudeste': 'Sudeste',
                            'sul': 'Sul',
                            'AC': 'Acre', 'AM': 'Amazonas', 'AP': 'Amapá', 'PA': 'Pará', 'RO': 'Rondônia', 'RR': 'Roraima', 'TO': 'Tocantins',
                            'AL': 'Alagoas', 'BA': 'Bahia', 'CE': 'Ceará', 'MA': 'Maranhão', 'PB': 'Paraíba', 'PE': 'Pernambuco', 'PI': 'Piauí', 'RN': 'Rio Grande do Norte', 'SE': 'Sergipe',
                            'DF': 'Distrito Federal', 'GO': 'Goiás', 'MS': 'Mato Grosso do Sul', 'MT': 'Mato Grosso',
                            'ES': 'Espírito Santo', 'MG': 'Minas Gerais', 'RJ': 'Rio de Janeiro', 'SP': 'São Paulo',
                            'PR': 'Paraná', 'RS': 'Rio Grande do Sul', 'SC': 'Santa Catarina'
                        };
                        const displayName = regionNames[location] || location;
                        console.log(`📍 Localização do usuário: ${displayName}`);

                        // Se tem estado (UF), é geolocalização GPS
                        if (profile.state && profile.state.length === 2) {
                            console.log('🛰️ Localização via GPS detectada!');
                        }
                    } else {
                        console.log('📍 Nenhuma localização definida, mostrando alimentos nacionais');
                    }
                }
            } catch (e) {
                console.warn('⚠️ Não foi possível carregar perfil do usuário:', e);
            }
        };
        loadUserProfile();
    }, [user]);

    // Load foods when filters change
    const loadFoods = useCallback(async () => {
        setLoading(true);
        try {
            await FoodService.seedInitialFoods();

            const dbCategory = categoryMap[activeCategory];
            const dbTier = tierMap[budgetTier];

            console.log(`🔍 Carregando alimentos: categoria=${dbCategory}, tier=${dbTier}`);
            const data = await FoodService.getFoodsByFilter(dbCategory, dbTier, userRestrictions, userRegion);

            console.log(`✅ ${data.length} alimentos carregados`);
            setFoods(data.map(mapDbToUi));

            if (data.length === 0) {
                console.warn('⚠️ Nenhum alimento encontrado. Verifique se a tabela food_guide_items foi criada no Supabase.');
            }
        } catch (e: any) {
            console.error('❌ Erro ao carregar alimentos:', e);
            if (e.message?.includes('food_guide_items')) {
                console.error('🚨 Tabela food_guide_items não existe! Execute o arquivo supabase-food-guide-setup.sql no Supabase.');
            }
        } finally {
            setLoading(false);
        }
    }, [activeCategory, budgetTier, userRestrictions, userRegion]);

    useEffect(() => {
        loadFoods();
    }, [loadFoods]);

    // Load today's meal count
    useEffect(() => {
        const loadMealCount = async () => {
            if (!user) return;
            try {
                const meals = await MealService.getMeals(user.id);
                setMealCount(meals.length);
            } catch (e) {
                console.error('Error loading meal count:', e);
            }
        };
        loadMealCount();
    }, [user]);

    // Swap handler - agora respeita restrições E região do usuário
    const handleSwap = async (idx: number) => {
        const item = foods[idx];
        // Mark as swapping for animation
        setFoods(prev => prev.map((f, i) => i === idx ? { ...f, swapping: true } : f));

        try {
            const alt = await FoodService.getSwapAlternative(
                item.name,
                item.category,
                item.tier,
                userRestrictions
            );
            if (alt) {
                // Small delay for visual feedback
                await new Promise(r => setTimeout(r, 300));
                setFoods(prev => prev.map((f, i) => i === idx ? mapDbToUi(alt) : f));
            } else {
                // No alternative found, revert
                setFoods(prev => prev.map((f, i) => i === idx ? { ...f, swapping: false } : f));
            }
        } catch (e) {
            console.error('Swap error:', e);
            setFoods(prev => prev.map((f, i) => i === idx ? { ...f, swapping: false } : f));
        }
    };

    const priceTierDisplay = (tier: number) => '$'.repeat(tier);

    const macroIcons: Record<MacroCategory, string> = {
        proteins: 'egg_alt',
        carbs: 'grain',
        fats: 'opacity',
    };

    // Dynamic AI insight based on budget tier
    const getInsightText = () => {
        const insights: Record<BudgetTier, string> = {
            economic: t.foodGuide.insightEconomic || `Com foco <b>Econômico</b>, priorizamos fontes de alta densidade proteica que cabem no bolso: ovos, sardinha e arroz com feijão.`,
            balanced: t.foodGuide.insightBalanced || `Com o perfil <b>Equilibrado</b>, combinamos custo-benefício com qualidade nutricional. Frango, batata doce e abacate são seus aliados.`,
            premium: t.foodGuide.aiInsightText,
        };
        return insights[budgetTier];
    };

    return (
        <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto bg-Malama-bg dark:bg-background-dark font-display text-Malama-main dark:text-white animate-fade-in transition-colors duration-300">

            {/* Header */}
            <header className="sticky top-0 z-50 bg-Malama-bg/90 dark:bg-background-dark/90 backdrop-blur-md px-6 py-4 flex items-center justify-between transition-colors">
                <button
                    onClick={onBack}
                    className="text-Malama-petrol dark:text-white flex items-center justify-center p-2 -ml-2 rounded-full hover:bg-Malama-pastel-orange dark:hover:bg-gray-800 transition-colors"
                >
                    <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                </button>
                <h1 className="text-Malama-petrol dark:text-white text-lg font-bold tracking-tight">{t.foodGuide.title}</h1>
                <button className="text-Malama-muted dark:text-gray-400 p-2 -mr-2 rounded-full hover:bg-Malama-pastel-orange dark:hover:bg-gray-800 transition-colors">
                    <span className="material-symbols-outlined text-[24px]">tune</span>
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col px-6 pb-32">

                {/* Hero Text */}
                <div className="pt-4 pb-4">
                    <h2 className="text-Malama-petrol dark:text-white text-[32px] font-extrabold leading-[1.1] tracking-tight mb-2">
                        {t.foodGuide.heroTitle.split('\\n').map((line: string, i: number) => (
                            <React.Fragment key={i}>
                                {i > 0 && <br />}
                                {line}
                            </React.Fragment>
                        ))}
                    </h2>
                    <p className="text-Malama-muted dark:text-gray-400 text-sm font-medium">
                        {t.foodGuide.heroSubtitle}
                    </p>
                </div>

                {/* Meal Suggestions Carousel */}
                <div className="mb-6">
                    <MealSuggestionsCarousel onMealLogged={(meal) => {
                        setMealCount(prev => prev + 1);
                        onMealLogged?.(meal);
                    }} />
                </div>

                {/* Budget Tier Selector */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2.5 px-1">
                        <span className="text-xs font-bold text-Malama-petrol dark:text-white uppercase tracking-wider flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                            {t.foodGuide.weeklyBudget}
                        </span>
                        <span className="text-xs text-Malama-muted dark:text-gray-400">{t.foodGuide.filteredByAi}</span>
                    </div>
                    <div className="flex p-1 bg-Malama-pastel-orange dark:bg-gray-800 rounded-xl border border-Malama-border dark:border-gray-700">
                        {(['economic', 'balanced', 'premium'] as BudgetTier[]).map((tier) => (
                            <button
                                key={tier}
                                onClick={() => setBudgetTier(tier)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${budgetTier === tier
                                    ? 'text-Malama-petrol dark:text-white bg-white dark:bg-gray-700 shadow-sm font-bold ring-1 ring-black/5 dark:ring-white/10'
                                    : 'text-Malama-muted dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {t.foodGuide[tier]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Macro Category Pills */}
                <div className="flex gap-3 overflow-x-auto hide-scrollbar mb-8 -mx-6 px-6 py-1">
                    {(['proteins', 'carbs', 'fats'] as MacroCategory[]).map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-transform hover:scale-105 active:scale-95 ${activeCategory === cat
                                ? 'bg-Malama-petrol dark:bg-primary text-white shadow-lg shadow-Malama-petrol/20 dark:shadow-primary/20'
                                : 'bg-Malama-pastel-orange dark:bg-gray-800 text-Malama-petrol dark:text-gray-200 border border-transparent dark:border-gray-700'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{macroIcons[cat]}</span>
                            <span className={`text-sm ${activeCategory === cat ? 'font-bold' : 'font-medium'}`}>
                                {cat === 'proteins' ? t.foodGuide.proteins : cat === 'carbs' ? t.foodGuide.carbohydrates : t.foodGuide.fatsLabel}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Indicador de Filtros Ativos */}
                {(userRestrictions.length > 0 || userRegion) && (
                    <div className="mb-6 space-y-2">
                        {/* Indicador de Localização/Região */}
                        {userRegion && (
                            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px]">
                                        {userRegion.length === 2 ? 'my_location' : 'location_on'}
                                    </span>
                                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                        {userRegion.length === 2 ? '🛰️ GPS: ' : '📍 Região: '}
                                        {userRegion.charAt(0).toUpperCase() + userRegion.slice(1)}
                                    </span>
                                    {userRegion.length === 2 && (
                                        <span className="text-[10px] text-blue-500 dark:text-blue-400 ml-1">
                                            (atualização automática)
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Indicador de Restrições */}
                        {userRestrictions.length > 0 && (
                            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[18px]">shield_person</span>
                                    <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                                        Filtro ativo: {userRestrictions.join(', ')}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* AI Insight Card */}
                <div className="mb-8 p-5 rounded-2xl bg-gradient-to-br from-[#E3F2FD] to-[#F1F8E9] dark:from-[#1e3a4c] dark:to-[#1a2e22] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <span className="material-symbols-outlined text-[80px] text-Malama-petrol dark:text-primary">auto_awesome</span>
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-Malama-petrol dark:text-primary text-[20px]">auto_awesome</span>
                            <span className="text-Malama-petrol dark:text-primary text-xs font-bold uppercase tracking-wider">{t.foodGuide.aiInsightLabel}</span>
                        </div>
                        <p className="text-Malama-petrol dark:text-white text-base font-medium leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: getInsightText().replace(/<b>/g, '<strong>').replace(/<\/b>/g, '</strong>') }}
                        />
                    </div>
                </div>

                {/* Food List */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-Malama-petrol dark:text-white text-xl font-bold tracking-tight capitalize">
                            {activeCategory === 'proteins' ? t.foodGuide.proteins : activeCategory === 'carbs' ? t.foodGuide.carbohydrates : t.foodGuide.fatsLabel}
                        </h3>
                        <span className="text-xs text-Malama-muted dark:text-gray-400 font-medium">
                            {foods.length} {foods.length === 1 ? 'item' : 'itens'}
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent"></div></div>
                    ) : foods.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 flex flex-col items-center gap-4">
                            <span className="material-symbols-outlined text-3xl">search_off</span>
                            <div className="space-y-2">
                                <p className="text-sm">{t.foodGuide.noFoods || 'Nenhum item encontrado para este filtro.'}</p>
                                <p className="text-xs text-Malama-petrol/60 dark:text-gray-500 px-4">
                                    Se esta é a primeira vez usando o Food Guide, execute o arquivo{' '}
                                    <code className="bg-Malama-pastel-orange dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                                        supabase-food-guide-setup.sql
                                    </code>{' '}
                                    no Supabase SQL Editor.
                                </p>
                                <button
                                    onClick={() => {
                                        loadFoods();
                                    }}
                                    className="mt-2 px-4 py-2 bg-Malama-petrol/10 dark:bg-primary/10 text-Malama-petrol dark:text-primary text-sm font-medium rounded-lg hover:bg-Malama-petrol/20 dark:hover:bg-primary/20 transition-colors"
                                >
                                    🔄 Tentar novamente
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {foods.map((item, idx) => (
                                <div
                                    key={`${item.name}-${idx}`}
                                    className={`group flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-Malama-border dark:border-gray-800 hover:shadow-md transition-all duration-300 ${item.swapping ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}
                                >
                                    {/* Main Row */}
                                    <div
                                        className="flex items-center p-2 pr-4 cursor-pointer"
                                        onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                                    >
                                        {/* Food Image */}
                                        <div className="size-16 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden relative mr-4">
                                            <div
                                                className="absolute inset-0 bg-cover bg-center"
                                                style={{ backgroundImage: `url('${item.image}')` }}
                                            />
                                        </div>

                                        {/* Food Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-Malama-petrol dark:text-white text-base font-bold truncate">{item.name}</h4>
                                                <span className="text-[10px] font-bold text-Malama-petrol dark:text-white bg-Malama-petrol/5 dark:bg-white/10 px-1.5 py-0.5 rounded border border-Malama-petrol/10 dark:border-white/10">
                                                    {priceTierDisplay(item.priceTier)}
                                                </span>
                                            </div>
                                            <p className="text-Malama-muted dark:text-gray-400 text-xs mt-0.5">{item.description}</p>
                                            {/* Macro Mini-Bar */}
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[11px] font-semibold text-accent-protein">P {item.macros.p}g</span>
                                                <span className="text-[11px] font-semibold text-accent-carbs">C {item.macros.c}g</span>
                                                <span className="text-[11px] font-semibold text-accent-fat">F {item.macros.f}g</span>
                                            </div>
                                        </div>

                                        {/* Swap Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSwap(idx);
                                            }}
                                            className="shrink-0 ml-3 flex flex-col items-center justify-center size-10 rounded-xl bg-Malama-pastel-orange dark:bg-gray-800 text-Malama-petrol dark:text-white hover:bg-Malama-petrol/10 hover:text-Malama-petrol dark:hover:bg-primary/10 dark:hover:text-primary transition-all group-hover:scale-105 active:scale-95"
                                            title={t.foodGuide.swap}
                                        >
                                            <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${item.swapping ? 'animate-spin' : ''}`}>swap_horiz</span>
                                        </button>
                                    </div>

                                    {/* Expanded Detail */}
                                    {expandedIdx === idx && (
                                        <div className="px-4 pb-4 pt-1 border-t border-Malama-border/50 dark:border-gray-800 animate-fade-in">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs text-Malama-muted dark:text-gray-400 uppercase tracking-wider font-bold">
                                                    {t.foodGuide.per100g || 'Por 100g'}
                                                </span>
                                                <span className="text-sm font-bold text-Malama-petrol dark:text-primary">{item.calories} kcal</span>
                                            </div>
                                            {/* Macro Bars */}
                                            <div className="flex flex-col gap-2">
                                                {[
                                                    { label: t.macros.prot, value: item.macros.p, max: 35, color: 'bg-accent-protein' },
                                                    { label: t.macros.carb, value: item.macros.c, max: 70, color: 'bg-accent-carbs' },
                                                    { label: t.macros.fat, value: item.macros.f, max: 100, color: 'bg-accent-fat' },
                                                ].map((macro) => (
                                                    <div key={macro.label} className="flex items-center gap-3">
                                                        <span className="text-xs font-medium text-Malama-muted dark:text-gray-400 w-10">{macro.label}</span>
                                                        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${macro.color} transition-all duration-500`}
                                                                style={{ width: `${Math.min((macro.value / macro.max) * 100, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-bold text-Malama-petrol dark:text-white w-8 text-right">{macro.value}g</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Quick Log Button */}
                                            <button
                                                onClick={() => onNavigate(AppView.LOG)}
                                                className="mt-4 w-full py-2.5 rounded-xl bg-Malama-petrol/10 dark:bg-primary/10 text-Malama-petrol dark:text-primary text-sm font-bold flex items-center justify-center gap-2 hover:bg-Malama-petrol/20 dark:hover:bg-primary/20 transition-colors active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                                {t.foodGuide.logThis || 'Registrar este alimento'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </main>

            {/* Bottom CTA - Dynamic Meal Progress */}
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-[360px] px-6">
                <button
                    onClick={() => onNavigate(AppView.LOG)}
                    className="w-full flex items-center justify-between px-6 py-4 bg-Malama-petrol dark:bg-primary text-white rounded-2xl shadow-xl shadow-Malama-petrol/30 dark:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <div className="flex flex-col items-start">
                        <span className="text-xs font-medium text-white/80 uppercase tracking-wider">{t.foodGuide.currentMeal}</span>
                        <span className="text-lg font-bold">{mealCount}/{dailyMealTarget} {t.foodGuide.completed}</span>
                    </div>
                    {/* Progress Ring */}
                    <div className="relative size-10 flex items-center justify-center">
                        <svg className="size-10 -rotate-90" viewBox="0 0 36 36">
                            <path
                                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="3"
                            />
                            <path
                                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="white"
                                strokeWidth="3"
                                strokeDasharray={`${(mealCount / dailyMealTarget) * 100}, 100`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <span className="absolute material-symbols-outlined text-[16px]">arrow_forward</span>
                    </div>
                </button>
            </div>
        </div>
    );
};
