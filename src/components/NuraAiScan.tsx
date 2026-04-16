import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIResponse, MealItem } from '../types';
import { lookupSingleItem } from '../services/geminiService';
import { useLanguage } from '../i18n';

interface NuraAiScanProps {
    data: AIResponse;
    imageUri: string;
    onConfirm: (finalData: AIResponse) => void;
    onBack: () => void;
}

const PETROL = '#1A6070';
const BG_CREAM = '#FDFBF9';

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
    const [lookingUp, setLookingUp] = useState<number | null>(null);
    const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { language } = useLanguage();

    const { calories, macros } = recalcTotals(items);
    const originalItems = useRef<MealItem[]>(data.items.map(i => ({ ...i })));

    const updateItem = useCallback((index: number, field: keyof MealItem, value: any) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: value };

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

    const lookupItemNutrition = useCallback(async (index: number, name: string, weightGrams: number) => {
        setLookingUp(index);
        try {
            const result = await lookupSingleItem(name, weightGrams, language);
            if (result.calories > 0) {
                setItems(prev => {
                    const newItems = [...prev];
                    newItems[index] = {
                        ...newItems[index],
                        weightGrams,
                        calories: Math.round(result.calories),
                        protein: Math.round(result.protein),
                        carbs: Math.round(result.carbs),
                        fats: Math.round(result.fats),
                    };
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
            <header className="flex items-center px-6 py-4 justify-between shrink-0 z-30" style={{ background: BG_CREAM, borderBottom: '1px solid #f5f5f4' }}>
                <button
                    onClick={onBack}
                    className="flex size-10 items-center justify-center rounded-full bg-stone-50 text-stone-500 hover:bg-stone-100 transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                </button>
                <h2 
                    className="text-stone-800 text-sm tracking-[0.2em] uppercase"
                    style={{ fontFamily: "'Playfair Display', serif", color: PETROL }}
                >
                    Nura Scan
                </h2>
                <button
                    onClick={onBack}
                    className="flex size-10 items-center justify-center rounded-full bg-stone-50 text-stone-400 hover:bg-stone-100 transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined text-xl">close</span>
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 pb-32 pt-6">
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
                            <div className="relative w-full aspect-[4/5] rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-stone-100 border border-stone-200">
                                <img
                                    src={imageUri}
                                    alt="Meal Scan"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/50 via-black/20 to-transparent"></div>

                                {/* Overlapping Info Card */}
                                <div className="absolute bottom-4 left-4 right-4">
                                    <div className="bg-white/95 backdrop-blur-xl p-5 rounded-2xl shadow-sm flex items-center justify-between border border-stone-100">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <span className="block text-[10px] font-light text-stone-400 mb-1 uppercase tracking-widest">REFEIÇÃO IDENTIFICADA</span>
                                            <h1 
                                                className="text-2xl text-stone-800 leading-tight truncate"
                                                style={{ fontFamily: "'Playfair Display', serif" }}
                                            >
                                                {foodName}
                                            </h1>
                                        </div>
                                        <div 
                                            className="size-12 rounded-full flex items-center justify-center shadow-sm shrink-0"
                                            style={{ background: PETROL }}
                                        >
                                            <span className="material-symbols-outlined text-white text-xl">done_all</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Nutrition Stats */}
                            <div className="mt-10 bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                                <div className="flex items-end justify-between border-b border-stone-100 pb-6 mb-6">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-light text-stone-400 uppercase tracking-widest mb-1">Total Calórico</span>
                                        <div className="flex items-baseline gap-1">
                                            <span 
                                                className="text-5xl text-stone-800"
                                                style={{ fontFamily: "'Playfair Display', serif" }}
                                            >
                                                {calories}
                                            </span>
                                            <span className="text-sm font-light text-stone-400 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>kcal</span>
                                        </div>
                                    </div>
                                    <div className="relative size-16">
                                        <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="16" fill="none" className="stroke-stone-100" strokeWidth="2" />
                                            <circle 
                                                cx="18" cy="18" r="16" fill="none" 
                                                stroke={PETROL}
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
                                        <span className="text-[10px] font-light text-stone-400 uppercase tracking-widest">Proteína</span>
                                        <span className="text-xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>{macros.p}g</span>
                                        <div className="h-1 w-full bg-stone-100 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${getPercent(macros.p)}%` }}
                                                className="h-full rounded-full"
                                                style={{ background: PETROL }} 
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-light text-stone-400 uppercase tracking-widest">Carbo</span>
                                        <span className="text-xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>{macros.c}g</span>
                                        <div className="h-1 w-full bg-stone-100 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${getPercent(macros.c)}%` }}
                                                className="h-full rounded-full"
                                                style={{ background: '#78716c' }} // stone-500
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-light text-stone-400 uppercase tracking-widest">Gordura</span>
                                        <span className="text-xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>{macros.f}g</span>
                                        <div className="h-1 w-full bg-stone-100 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${getPercent(macros.f)}%` }}
                                                className="h-full rounded-full"
                                                style={{ background: '#d6d3d1' }} // stone-300
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
                                <h3 className="text-xl text-stone-800" style={{ fontFamily: "'Playfair Display', serif" }}>Detalhes da Refeição</h3>
                                <button 
                                    onClick={addItem}
                                    className="text-xs font-light flex items-center gap-1 bg-white px-3 py-1.5 rounded-full border border-stone-200 shadow-sm active:scale-95"
                                    style={{ color: PETROL }}
                                >
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    Item
                                </button>
                            </div>

                            {items.map((item, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col gap-4">
                                    <div className="flex items-center justify-between border-b border-stone-50 pb-3">
                                        <input
                                            value={item.name}
                                            onChange={(e) => handleNameChange(idx, e.target.value)}
                                            className="bg-transparent border-none p-0 text-stone-800 text-lg focus:ring-0 w-full"
                                            style={{ fontFamily: "'Playfair Display', serif" }}
                                            placeholder="Ingrediente..."
                                        />
                                        {lookingUp === idx && (
                                            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin shrink-0 mr-2" style={{ borderColor: PETROL, borderTopColor: 'transparent' }} />
                                        )}
                                        <button
                                            onClick={() => removeItem(idx)}
                                            className="text-stone-300 hover:text-stone-500 transition-colors shrink-0"
                                        >
                                            <span className="material-symbols-outlined text-xl">close</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-5 gap-3">
                                        {/* Grams */}
                                        <div className="col-span-1 flex flex-col gap-1">
                                            <label className="text-[10px] font-light text-stone-400 capitalize">Quant</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={item.weightGrams || 0}
                                                    onChange={(e) => updateItem(idx, 'weightGrams', parseInt(e.target.value) || 0)}
                                                    className="w-full bg-stone-50 border border-stone-100 rounded-lg px-2 py-2 text-sm text-stone-800 focus:ring-1"
                                                    style={{ outlineColor: PETROL }}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex flex-col gap-1">
                                            <label className="text-[10px] font-light text-stone-400 capitalize">Kcal</label>
                                            <input
                                                type="number"
                                                value={item.calories || 0}
                                                onChange={(e) => updateItem(idx, 'calories', parseInt(e.target.value) || 0)}
                                                className="w-full bg-stone-50 border border-stone-100 rounded-lg px-2 py-2 text-sm text-stone-800 focus:ring-1"
                                                style={{ outlineColor: PETROL }}
                                            />
                                        </div>
                                        <div className="col-span-1 flex flex-col gap-1">
                                            <label className="text-[10px] font-light text-stone-400 capitalize">Prot</label>
                                            <input
                                                type="number"
                                                value={item.protein || 0}
                                                onChange={(e) => updateItem(idx, 'protein', parseInt(e.target.value) || 0)}
                                                className="w-full bg-stone-50 border border-stone-100 rounded-lg px-2 py-2 text-sm text-stone-800 focus:ring-1"
                                                style={{ outlineColor: PETROL }}
                                            />
                                        </div>
                                        <div className="col-span-1 flex flex-col gap-1">
                                            <label className="text-[10px] font-light text-stone-400 capitalize">Carb</label>
                                            <input
                                                type="number"
                                                value={item.carbs || 0}
                                                onChange={(e) => updateItem(idx, 'carbs', parseInt(e.target.value) || 0)}
                                                className="w-full bg-stone-50 border border-stone-100 rounded-lg px-2 py-2 text-sm text-stone-800 focus:ring-1"
                                                style={{ outlineColor: PETROL }}
                                            />
                                        </div>
                                        <div className="col-span-1 flex flex-col gap-1">
                                            <label className="text-[10px] font-light text-stone-400 capitalize">Gord</label>
                                            <input
                                                type="number"
                                                value={item.fats || 0}
                                                onChange={(e) => updateItem(idx, 'fats', parseInt(e.target.value) || 0)}
                                                className="w-full bg-stone-50 border border-stone-100 rounded-lg px-2 py-2 text-sm text-stone-800 focus:ring-1"
                                                style={{ outlineColor: PETROL }}
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
            <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-[#FDFBF9] via-[#FDFBF9]/90 to-transparent px-6 pb-10 pt-8 z-40">
                <div className="flex gap-4 max-w-md mx-auto">
                    {!isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex-1 py-4 rounded-2xl bg-white border border-stone-200 text-stone-600 text-base font-light hover:bg-stone-50 transition-all active:scale-[0.98] shadow-sm"
                            >
                                Editar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={confirming}
                                className="flex-[2] py-4 rounded-2xl text-white text-base font-light tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                                style={{ background: PETROL }}
                            >
                                {confirming ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Registrar
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(false)}
                            className="w-full py-4 rounded-2xl text-white text-base font-light tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]"
                            style={{ background: PETROL }}
                        >
                            Salvar Alterações
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
