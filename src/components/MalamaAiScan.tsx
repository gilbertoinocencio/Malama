import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIResponse, MealItem } from '../types';
import { lookupSingleItem } from '../services/geminiService';
import { useLanguage } from '../i18n';

interface MalamaAiScanProps {
    data: AIResponse | null;
    imageUri: string;
    onConfirm: (finalData: AIResponse) => void;
    onBack: () => void;
    isLoading?: boolean;
}

const Shimmer = ({ className }: { className: string }) => (
    <div className={`animate-pulse bg-stone-200 rounded-lg ${className}`} />
);

const MALAMA_RED = '#7d4a3c';
const BG_CREAM = '#FDFBF9';

const recalcTotals = (items: MealItem[]): { calories: number; macros: { p: number; c: number; f: number } } => {
    const calories = Math.round(items.reduce((s, i) => s + (i.calories || 0), 0));
    const p = Math.round(items.reduce((s, i) => s + (i.protein || 0), 0));
    const c = Math.round(items.reduce((s, i) => s + (i.carbs || 0), 0));
    const f = Math.round(items.reduce((s, i) => s + (i.fats || 0), 0));
    return { calories, macros: { p, c, f } };
};

export const MalamaAiScan: React.FC<MalamaAiScanProps> = ({
    data,
    imageUri,
    onConfirm,
    onBack,
    isLoading = false,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [items, setItems] = useState<MealItem[]>(() => data?.items.map((i: MealItem) => ({ ...i })) ?? []);
    const [foodName, setFoodName] = useState(data?.foodName ?? '');
    const [confirming, setConfirming] = useState(false);
    const [lookingUp, setLookingUp] = useState<number | null>(null);
    const [lookupError, setLookupError] = useState<number | null>(null);
    const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingLookupRef = useRef<{ index: number; name: string; weight: number } | null>(null);
    const { language } = useLanguage();

    const { calories, macros } = recalcTotals(items);
    const originalItems = useRef<MealItem[]>(data?.items.map((i: MealItem) => ({ ...i })) ?? []);

    // Sync state when data arrives after loading
    useEffect(() => {
        if (data && !isLoading) {
            setItems(data.items.map((i: MealItem) => ({ ...i })));
            setFoodName(data.foodName);
            originalItems.current = data.items.map((i: MealItem) => ({ ...i }));
        }
    }, [data, isLoading]);

    const weightLookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const updateItem = useCallback((index: number, field: keyof MealItem, value: any) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: value };

            if (field === 'weightGrams' && typeof value === 'number') {
                const orig = originalItems.current[index];
                if (orig && orig.weightGrams && orig.calories > 0) {
                    const ratio = value / orig.weightGrams;
                    newItems[index].calories = Math.round((orig.calories || 0) * ratio);
                    newItems[index].protein = Math.round((orig.protein || 0) * ratio);
                    newItems[index].carbs = Math.round((orig.carbs || 0) * ratio);
                    newItems[index].fats = Math.round((orig.fats || 0) * ratio);
                }
            }
            return newItems;
        });
    }, []);

    const lookupItemNutrition = useCallback(async (index: number, name: string, weightGrams: number) => {
        pendingLookupRef.current = null;
        setLookingUp(index);
        setLookupError(null);
        try {
            const result = await lookupSingleItem(name, weightGrams, language);
            if (result.calories > 0) {
                setItems(prev => {
                    const newItems = [...prev];
                    // Respect whatever weight the user currently has in the field
                    const currentWeight = newItems[index].weightGrams || weightGrams;
                    const scale = currentWeight / weightGrams;
                    newItems[index] = {
                        ...newItems[index],
                        calories: Math.round(result.calories * scale),
                        protein: Math.round(result.protein * scale),
                        carbs: Math.round(result.carbs * scale),
                        fats: Math.round(result.fats * scale),
                    };
                    // Store per-lookup-weight reference so future weight changes can scale correctly
                    originalItems.current[index] = {
                        ...newItems[index],
                        weightGrams,
                        calories: Math.round(result.calories),
                        protein: Math.round(result.protein),
                        carbs: Math.round(result.carbs),
                        fats: Math.round(result.fats),
                    };
                    return newItems;
                });
            } else {
                setLookupError(index);
            }
        } catch (e) {
            console.error('Nutrition lookup failed:', e);
            setLookupError(index);
        } finally {
            setLookingUp(null);
        }
    }, [language]);

    const handleNameChange = useCallback((index: number, newName: string) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], name: newName };
            return newItems;
        });
        setLookupError(null);
        if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
        const trimmed = newName.trim();
        if (trimmed) {
            const weight = items[index]?.weightGrams || 100;
            pendingLookupRef.current = { index, name: trimmed, weight };
            lookupTimerRef.current = setTimeout(() => {
                pendingLookupRef.current = null;
                lookupItemNutrition(index, trimmed, weight);
            }, 1200);
        } else {
            pendingLookupRef.current = null;
        }
    }, [items, lookupItemNutrition]);

    // Flush pending timer immediately when user leaves the name field
    const handleNameBlur = useCallback(() => {
        if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
        if (pendingLookupRef.current) {
            const { index, name, weight } = pendingLookupRef.current;
            lookupItemNutrition(index, name, weight);
        }
    }, [lookupItemNutrition]);

    // Weight field change: scale if item already has calories, otherwise trigger lookup
    const handleWeightChange = useCallback((index: number, newWeight: number) => {
        updateItem(index, 'weightGrams', newWeight);
        const item = items[index];
        if (item?.name?.trim() && (!item.calories || item.calories === 0)) {
            if (weightLookupTimerRef.current) clearTimeout(weightLookupTimerRef.current);
            weightLookupTimerRef.current = setTimeout(() => {
                lookupItemNutrition(index, item.name.trim(), newWeight);
            }, 600);
        }
    }, [items, updateItem, lookupItemNutrition]);

    const addItem = () => {
        const newItem: MealItem = { name: '', weightGrams: 100, calories: 0, protein: 0, carbs: 0, fats: 0 };
        setItems(prev => [...prev, newItem]);
        originalItems.current.push({ ...newItem });
        setIsEditing(true);
    };

    const removeItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
        originalItems.current = originalItems.current.filter((_, i) => i !== index);
    };

    const handleConfirm = async () => {
        if (confirming) return;
        setConfirming(true);
        try {
            const finalData: AIResponse = { foodName, calories, macros, items, message: data.message };
            onConfirm(finalData);
        } catch (e) {
            console.error('Confirm failed:', e);
            setConfirming(false);
        }
    };

    const totalMacros = macros.p + macros.c + macros.f;
    const getPercent = (val: number) => totalMacros > 0 ? (val / totalMacros) * 100 : 0;

    return (
        <div className="flex flex-col h-full font-body overflow-hidden" style={{ background: BG_CREAM }}>
            {/* Header */}
            <header className="flex items-center px-4 py-3 justify-between shrink-0 z-30" style={{ background: BG_CREAM, borderBottom: '1px solid #f5f5f4' }}>
                <div className="w-9"></div>
                <h2
                    className="text-base tracking-[0.2em] uppercase"
                    style={{ fontFamily: "'Playfair Display', serif", color: MALAMA_RED }}
                >
                    Malama Scan
                </h2>
                <button
                    onClick={onBack}
                    className="flex size-9 items-center justify-center rounded-full bg-stone-50 text-stone-400 hover:bg-stone-100 transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined text-xl">close</span>
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
                <AnimatePresence mode="wait">
                    {!isEditing ? (
                        <motion.div
                            key="summary"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col w-full max-w-md mx-auto"
                        >
                            {/* Image Card */}
                            <div className="relative w-full aspect-[4/3] rounded-[20px] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.08)] bg-stone-100 border border-stone-200">
                                <img
                                    src={imageUri}
                                    alt="Meal Scan"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                                {/* Loading overlay on image */}
                                {isLoading && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px]">
                                        <div className="w-10 h-10 border-[3px] border-white/30 border-t-white rounded-full animate-spin mb-2" />
                                        <p className="text-white text-xs font-light tracking-widest uppercase animate-pulse">Identificando...</p>
                                    </div>
                                )}

                                {/* Compact overlay strip at bottom of image */}
                                <div className="absolute bottom-0 inset-x-0 px-4 pb-3 pt-6">
                                    {isLoading ? (
                                        <Shimmer className="h-6 w-36" />
                                    ) : (
                                        <h1
                                            className="text-2xl text-white leading-tight drop-shadow-md"
                                            style={{ fontFamily: "'Playfair Display', serif" }}
                                        >
                                            {foodName}
                                        </h1>
                                    )}
                                </div>
                            </div>

                            {/* Compact stats bar */}
                            <div className="mt-3 bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                                <div className="flex items-stretch divide-x divide-stone-100">
                                    {/* Calories */}
                                    <div className="flex-[1.4] flex flex-col justify-center px-4 py-3">
                                        <span className="text-[10px] font-light text-stone-400 uppercase tracking-widest mb-0.5">Calorias</span>
                                        {isLoading ? (
                                            <Shimmer className="h-7 w-20 mt-1" />
                                        ) : (
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>{calories}</span>
                                                <span className="text-xs text-stone-400 font-light">kcal</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Macros */}
                                    {([
                                        { label: 'Prot', val: macros.p, color: MALAMA_RED },
                                        { label: 'Carb', val: macros.c, color: '#78716c' },
                                        { label: 'Gord', val: macros.f, color: '#a8a29e' },
                                    ] as const).map(({ label, val, color }) => (
                                        <div key={label} className="flex-1 flex flex-col justify-center items-center px-2 py-3">
                                            <span className="text-[10px] font-light text-stone-400 uppercase tracking-widest mb-0.5">{label}</span>
                                            {isLoading ? (
                                                <Shimmer className="h-6 w-10 mt-1" />
                                            ) : (
                                                <>
                                                    <span className="text-xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>{val}</span>
                                                    <div className="w-full mt-1.5 h-1 bg-stone-100 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${getPercent(val)}%` }}
                                                            className="h-full rounded-full"
                                                            style={{ background: color }}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Items breakdown */}
                            {!isLoading && items.length > 0 && (
                                <div className="mt-3 bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                                    {items.map((item: MealItem, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between px-4 py-3 border-b border-stone-50 last:border-0"
                                        >
                                            <div className="flex flex-col gap-0.5 min-w-0 pr-3">
                                                <span className="text-sm text-stone-800 truncate" style={{ fontFamily: "'Playfair Display', serif" }}>
                                                    {item.name}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {item.weightGrams != null && (
                                                        <span className="text-[11px] text-stone-400 font-light">{item.weightGrams}g</span>
                                                    )}
                                                    <span className="text-[11px] font-light" style={{ color: MALAMA_RED }}>{item.protein ?? 0}p</span>
                                                    <span className="text-[11px] text-stone-500 font-light">{item.carbs ?? 0}c</span>
                                                    <span className="text-[11px] text-stone-400 font-light">{item.fats ?? 0}g</span>
                                                </div>
                                            </div>
                                            <span className="text-sm text-stone-600 shrink-0 font-light">{item.calories} kcal</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="edit"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col w-full max-w-md mx-auto gap-4"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-3xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>Detalhes da Refeição</h3>
                                <button 
                                    onClick={addItem}
                                    className="text-base font-light flex items-center gap-1 bg-white px-4 py-2 rounded-full border border-stone-200 shadow-sm active:scale-95"
                                    style={{ color: MALAMA_RED }}
                                >
                                    <span className="material-symbols-outlined text-lg">add</span>
                                    Item
                                </button>
                            </div>

                            {items.map((item, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col gap-5">
                                    <div className={`flex items-center justify-between border-b pb-4 ${lookupError === idx ? 'border-red-200' : 'border-stone-50'}`}>
                                        <input
                                            value={item.name}
                                            onChange={(e) => handleNameChange(idx, e.target.value)}
                                            onBlur={handleNameBlur}
                                            className="bg-transparent border-none p-0 text-stone-800 text-2xl focus:ring-0 w-full"
                                            style={{ fontFamily: "'Playfair Display', serif" }}
                                            placeholder="Ingrediente..."
                                        />
                                        {lookingUp === idx && (
                                            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin shrink-0 mr-2" style={{ borderColor: MALAMA_RED, borderTopColor: 'transparent' }} />
                                        )}
                                        {lookupError === idx && lookingUp !== idx && (
                                            <button
                                                onClick={() => lookupItemNutrition(idx, item.name, item.weightGrams || 100)}
                                                className="shrink-0 mr-2 text-red-400 hover:text-red-600 transition-colors"
                                                title="Não foi possível buscar. Toque para tentar novamente."
                                            >
                                                <span className="material-symbols-outlined text-xl">refresh</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => removeItem(idx)}
                                            className="text-stone-300 hover:text-stone-500 transition-colors shrink-0"
                                        >
                                            <span className="material-symbols-outlined text-3xl">close</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-5 gap-3">
                                        {/* Grams */}
                                        <div className="col-span-1 flex flex-col gap-1.5">
                                            <label className="text-xs font-light text-stone-400 capitalize">Quant</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={item.weightGrams || 0}
                                                    onChange={(e) => handleWeightChange(idx, parseInt(e.target.value) || 0)}
                                                    className="w-full bg-stone-50 border border-stone-100 rounded-lg px-2 py-2.5 text-base text-stone-800 focus:ring-1"
                                                    style={{ outlineColor: MALAMA_RED }}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex flex-col gap-1.5">
                                            <label className="text-xs font-light text-stone-400 capitalize">Kcal</label>
                                            <input
                                                type="number"
                                                value={item.calories || 0}
                                                onChange={(e) => updateItem(idx, 'calories', parseInt(e.target.value) || 0)}
                                                className="w-full bg-stone-50 border border-stone-100 rounded-lg px-2 py-2.5 text-base text-stone-800 focus:ring-1"
                                                style={{ outlineColor: MALAMA_RED }}
                                            />
                                        </div>
                                        <div className="col-span-1 flex flex-col gap-1.5">
                                            <label className="text-xs font-light text-stone-400 capitalize">Prot</label>
                                            <input
                                                type="number"
                                                value={item.protein || 0}
                                                onChange={(e) => updateItem(idx, 'protein', parseInt(e.target.value) || 0)}
                                                className="w-full bg-stone-50 border border-stone-100 rounded-lg px-2 py-2.5 text-base text-stone-800 focus:ring-1"
                                                style={{ outlineColor: MALAMA_RED }}
                                            />
                                        </div>
                                        <div className="col-span-1 flex flex-col gap-1.5">
                                            <label className="text-xs font-light text-stone-400 capitalize">Carb</label>
                                            <input
                                                type="number"
                                                value={item.carbs || 0}
                                                onChange={(e) => updateItem(idx, 'carbs', parseInt(e.target.value) || 0)}
                                                className="w-full bg-stone-50 border border-stone-100 rounded-lg px-2 py-2.5 text-base text-stone-800 focus:ring-1"
                                                style={{ outlineColor: MALAMA_RED }}
                                            />
                                        </div>
                                        <div className="col-span-1 flex flex-col gap-1.5">
                                            <label className="text-xs font-light text-stone-400 capitalize">Gord</label>
                                            <input
                                                type="number"
                                                value={item.fats || 0}
                                                onChange={(e) => updateItem(idx, 'fats', parseInt(e.target.value) || 0)}
                                                className="w-full bg-stone-50 border border-stone-100 rounded-lg px-2 py-2.5 text-base text-stone-800 focus:ring-1"
                                                style={{ outlineColor: MALAMA_RED }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Controls */}
            <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-[#FDFBF9] via-[#FDFBF9]/95 to-transparent px-4 pb-8 pt-6 z-40">
                <div className="flex gap-3 max-w-md mx-auto">
                    {!isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                disabled={isLoading}
                                className="flex-1 py-3.5 rounded-2xl bg-white border border-stone-200 text-stone-600 text-base font-light hover:bg-stone-50 transition-all active:scale-[0.98] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Editar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={confirming || isLoading}
                                className="flex-[2] py-3.5 rounded-2xl text-white text-base font-light tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                                style={{ background: MALAMA_RED }}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                        Analisando...
                                    </>
                                ) : confirming ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>Registrar</>
                                )}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => { if (lookingUp === null) setIsEditing(false); }}
                            disabled={lookingUp !== null}
                            className="w-full py-3.5 rounded-2xl text-white text-base font-light tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
                            style={{ background: MALAMA_RED }}
                        >
                            {lookingUp !== null ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                    Buscando nutrição...
                                </>
                            ) : 'Salvar Alterações'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
