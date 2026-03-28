import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIResponse, MealItem } from '../types';
import { analyzeTextLog } from '../services/geminiService';
import { useLanguage } from '../i18n';

interface NuraAiScanProps {
    data: AIResponse;
    imageUri: string;
    onConfirm: (finalData: AIResponse) => void;
    onBack: () => void;
}

// Recalculate totals from items — pure function, no side effects
const recalcTotals = (items: MealItem[]): { calories: number; macros: { p: number; c: number; f: number } } => {
    const calories = Math.round(items.reduce((s, i) => s + (i.calories || 0), 0));
    const p = Math.round(items.reduce((s, i) => s + (i.protein || 0), 0));
    const c = Math.round(items.reduce((s, i) => s + (i.carbs || 0), 0));
    const f = Math.round(items.reduce((s, i) => s + (i.fats || 0), 0));
    return { calories, macros: { p, c, f } };
};

export const NuraAiScan: React.FC<NuraAiScanProps> = ({
    data,
    imageUri,
    onConfirm,
    onBack
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [items, setItems] = useState<MealItem[]>(() => data.items.map(i => ({ ...i })));
    const [foodName, setFoodName] = useState(data.foodName);
    const [confirming, setConfirming] = useState(false);
    const [lookingUp, setLookingUp] = useState<number | null>(null); // index of item being looked up
    const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { language } = useLanguage();

    // Derive totals from items (no useEffect needed)
    const { calories, macros } = recalcTotals(items);

    // Original items for ratio-based weight scaling
    const originalItems = useRef<MealItem[]>(data.items.map(i => ({ ...i })));

    const updateItem = useCallback((index: number, field: keyof MealItem, value: any) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: value };

            // Scale macros proportionally when weight changes
            if (field === 'weightGrams' && typeof value === 'number') {
                const orig = originalItems.current[index];
                if (orig && orig.weightGrams) {
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

    // Lookup nutritional data for a new/renamed item via Gemini
    const lookupItemNutrition = useCallback(async (index: number, name: string, weightGrams: number) => {
        setLookingUp(index);
        try {
            const result = await analyzeTextLog(`${name} ${weightGrams}g`, language);
            // Use the first item's macros from the result
            const found = result.items?.[0];
            if (found) {
                setItems(prev => {
                    const newItems = [...prev];
                    newItems[index] = {
                        ...newItems[index],
                        name: found.name || name,
                        weightGrams: weightGrams,
                        calories: found.calories || 0,
                        protein: found.protein || 0,
                        carbs: found.carbs || 0,
                        fats: found.fats || 0,
                    };
                    // Also update the original ref so weight scaling works for this new item
                    originalItems.current[index] = { ...newItems[index] };
                    return newItems;
                });
            }
        } catch (e) {
            console.error('Nutrition lookup failed:', e);
        } finally {
            setLookingUp(null);
        }
    }, [language]);

    // Debounced name change — triggers nutrition lookup after 1.2s of no typing
    const handleNameChange = useCallback((index: number, newName: string) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], name: newName };
            return newItems;
        });
        if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
        lookupTimerRef.current = setTimeout(() => {
            const trimmed = newName.trim();
            if (trimmed && trimmed !== 'Novo Item') {
                const currentWeight = items[index]?.weightGrams || 100;
                lookupItemNutrition(index, trimmed, currentWeight);
            }
        }, 1200);
    }, [items, lookupItemNutrition]);

    const addItem = () => {
        const newItem: MealItem = {
            name: '',
            weightGrams: 100,
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0
        };
        setItems(prev => [...prev, newItem]);
        originalItems.current.push({ ...newItem });
        // Go to edit mode automatically
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
            const finalData: AIResponse = {
                foodName,
                calories,
                macros,
                items,
                message: data.message,
            };
            onConfirm(finalData);
        } catch (e) {
            console.error('Confirm failed:', e);
            setConfirming(false);
        }
    };

    // Calculate width percentages for macro bars
    const totalMacros = macros.p + macros.c + macros.f;
    const getPercent = (val: number) => totalMacros > 0 ? (val / totalMacros) * 100 : 0;

    return (
        <div className="flex flex-col h-full bg-[#F8F9FA] dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-hidden">
            {/* Header */}
            <header className="flex items-center px-6 py-4 justify-between shrink-0 z-30 bg-white dark:bg-surface-dark shadow-sm">
                <button
                    onClick={onBack}
                    className="flex size-10 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-gray-100 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </button>
                <h2 className="text-slate-900 dark:text-white text-base font-bold tracking-tight uppercase">NURA AI SCAN</h2>
                <button className="flex size-10 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                    <span className="material-symbols-outlined text-2xl">more_vert</span>
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 pb-32 pt-4">
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
                            <div className="relative w-full aspect-[4/5] rounded-[32px] overflow-hidden shadow-2xl shadow-black/10">
                                <img
                                    src={imageUri}
                                    alt="Meal Scan"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>

                                {/* AI Badge */}
                                <div className="absolute top-4 left-4">
                                    <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/20">
                                        <span className="material-symbols-outlined text-[#0CC2C2] text-sm animate-pulse">auto_awesome</span>
                                        <span className="text-[10px] font-black text-[#0CC2C2] tracking-widest uppercase">AI Detected</span>
                                    </div>
                                </div>

                                {/* Overlapping Info Card */}
                                <div className="absolute bottom-4 left-4 right-4">
                                    <div className="bg-white/95 dark:bg-[#1A2C33]/95 backdrop-blur-xl p-5 rounded-[24px] border border-white/40 dark:border-white/10 shadow-xl flex items-center justify-between">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-widest">REFEIÇÃO</span>
                                            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight truncate">
                                                {foodName}
                                            </h1>
                                        </div>
                                        <div className="bg-[#0CC2C2] size-12 rounded-full flex items-center justify-center shadow-lg shadow-[#0CC2C2]/40 shrink-0">
                                            <span className="material-symbols-outlined text-white text-2xl font-bold">check</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Nutrition Stats */}
                            <div className="mt-8">
                                <div className="flex items-end justify-between border-b border-gray-200 dark:border-white/10 pb-6 mb-6">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Energy</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-light text-slate-900 dark:text-white">{calories}</span>
                                            <span className="text-lg font-medium text-slate-400 tracking-tight">kcal</span>
                                        </div>
                                    </div>
                                    <div className="relative size-16">
                                        <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="16" fill="none" className="stroke-gray-100 dark:stroke-white/5" strokeWidth="2" />
                                            <circle 
                                                cx="18" cy="18" r="16" fill="none" 
                                                className="stroke-[#0CC2C2]" 
                                                strokeWidth="3.5" 
                                                strokeDasharray="100 100" 
                                                strokeDashoffset="25"
                                                strokeLinecap="round" 
                                            />
                                        </svg>
                                    </div>
                                </div>

                                {/* Macros Grid */}
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">PROTEIN</span>
                                        <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tighter">{macros.p}g</span>
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${getPercent(macros.p)}%` }}
                                                className="h-full bg-[#0CC2C2] rounded-full" 
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">CARBS</span>
                                        <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tighter">{macros.c}g</span>
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${getPercent(macros.c)}%` }}
                                                className="h-full bg-orange-400 rounded-full" 
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">FAT</span>
                                        <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tighter">{macros.f}g</span>
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${getPercent(macros.f)}%` }}
                                                className="h-full bg-purple-400 rounded-full" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
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
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Editar Ingredientes</h3>
                                <button 
                                    onClick={addItem}
                                    className="text-xs font-bold text-[#0CC2C2] flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    ADICIONAR
                                </button>
                            </div>

                            {items.map((item, idx) => (
                                <div key={idx} className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <input
                                            value={item.name}
                                            onChange={(e) => handleNameChange(idx, e.target.value)}
                                            className="bg-transparent border-none p-0 text-slate-900 dark:text-white font-bold focus:ring-0 w-full"
                                            placeholder="Nome do ingrediente"
                                        />
                                        {lookingUp === idx && (
                                            <div className="w-5 h-5 border-2 border-[#0CC2C2] border-t-transparent rounded-full animate-spin shrink-0 mr-2" />
                                        )}
                                        <button
                                            onClick={() => removeItem(idx)}
                                            className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                                        >
                                            <span className="material-symbols-outlined text-xl">delete</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-5 gap-2">
                                        <div className="col-span-1 flex flex-col gap-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">GRAMAS</label>
                                            <input
                                                type="number"
                                                value={item.weightGrams || 0}
                                                onChange={(e) => updateItem(idx, 'weightGrams', parseInt(e.target.value) || 0)}
                                                className="bg-gray-50 dark:bg-white/5 border-none rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:ring-[#0CC2C2]/50"
                                            />
                                        </div>
                                        <div className="col-span-1 flex flex-col gap-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">KCAL</label>
                                            <input
                                                type="number"
                                                value={item.calories || 0}
                                                onChange={(e) => updateItem(idx, 'calories', parseInt(e.target.value) || 0)}
                                                className="bg-gray-50 dark:bg-white/5 border-none rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:ring-[#0CC2C2]/50"
                                            />
                                        </div>
                                        <div className="col-span-1 flex flex-col gap-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PROT</label>
                                            <input
                                                type="number"
                                                value={item.protein || 0}
                                                onChange={(e) => updateItem(idx, 'protein', parseInt(e.target.value) || 0)}
                                                className="bg-gray-50 dark:bg-white/5 border-none rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:ring-[#0CC2C2]/50"
                                            />
                                        </div>
                                        <div className="col-span-1 flex flex-col gap-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">CARB</label>
                                            <input
                                                type="number"
                                                value={item.carbs || 0}
                                                onChange={(e) => updateItem(idx, 'carbs', parseInt(e.target.value) || 0)}
                                                className="bg-gray-50 dark:bg-white/5 border-none rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:ring-[#0CC2C2]/50"
                                            />
                                        </div>
                                        <div className="col-span-1 flex flex-col gap-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">FAT</label>
                                            <input
                                                type="number"
                                                value={item.fats || 0}
                                                onChange={(e) => updateItem(idx, 'fats', parseInt(e.target.value) || 0)}
                                                className="bg-gray-50 dark:bg-white/5 border-none rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:ring-[#0CC2C2]/50"
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
            <div className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-[#0A1214]/90 backdrop-blur-xl border-t border-gray-100 dark:border-white/5 px-6 pt-4 pb-10 z-40">
                <div className="flex gap-4 max-w-md mx-auto">
                    {!isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex-1 h-16 rounded-[20px] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold hover:bg-gray-50 transition-all active:scale-95"
                            >
                                Editar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={confirming}
                                className="flex-[2] h-16 rounded-[20px] bg-[#0CC2C2] text-white font-black shadow-lg shadow-[#0CC2C2]/30 flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {confirming ? (
                                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined font-black">check</span>
                                        Confirmar
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(false)}
                            className="w-full h-16 rounded-[20px] bg-[#0CC2C2] text-white font-black shadow-lg shadow-[#0CC2C2]/30 flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined font-black">save</span>
                            Salvar Alterações
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
