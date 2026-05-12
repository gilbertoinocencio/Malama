import React, { useState, useRef } from 'react';
import { Meal, MealItem, MicroNutrients } from '../types';
import { lookupSingleItem } from '../services/geminiService';

interface DailyMealsListProps {
  meals: Meal[];
  onDeleteMeal?: (id: string) => void;
  onEditMeal?: (meal: Meal) => void;
}

export const DailyMealsList: React.FC<DailyMealsListProps> = ({ meals, onDeleteMeal, onEditMeal }) => {
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [lookingUp, setLookingUp] = useState<number | null>(null);
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLookupRef = useRef<{ idx: number; name: string } | null>(null);

  if (!meals || meals.length === 0) return null;

  const today = new Date().toDateString();
  const todaysMeals = meals.filter(m => new Date(m.timestamp).toDateString() === today);

  if (todaysMeals.length === 0) return null;

  const formatTime = (dateStr: Date | string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const getMealIcon = (type: string) => {
    switch (type) {

      case 'ai-photo': return 'photo_camera';
      case 'ai-voice': return 'mic';
      case 'manual': return 'edit_note';
      case 'ai-chat':
      default: return 'smart_toy';
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedMeals(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta refeição?')) {
      onDeleteMeal?.(id);
    }
  };

  const handleSaveEdit = () => {
    if (editingMeal && onEditMeal) {
      // Recalcular macros totais based on edited items
      const newCalories = editingMeal.items?.reduce((acc, it) => acc + (Number(it.calories) || 0), 0) || 0;
      const newP = editingMeal.items?.reduce((acc, it) => acc + (Number(it.protein) || 0), 0) || 0;
      const newC = editingMeal.items?.reduce((acc, it) => acc + (Number(it.carbs) || 0), 0) || 0;
      const newF = editingMeal.items?.reduce((acc, it) => acc + (Number(it.fats) || 0), 0) || 0;

      const hasItems = (editingMeal.items?.length ?? 0) > 0;
      const finalMeal: Meal = {
        ...editingMeal,
        calories: hasItems ? newCalories : editingMeal.calories,
        macros: {
          protein: hasItems ? newP : editingMeal.macros.protein,
          carbs:   hasItems ? newC : editingMeal.macros.carbs,
          fats:    hasItems ? newF : editingMeal.macros.fats,
        }
      };

      onEditMeal(finalMeal);
      setEditingMeal(null);
    }
  };

  const lookupForItem = async (idx: number, name: string, weightGrams?: number) => {
    if (!name.trim()) return;
    setLookingUp(idx);
    pendingLookupRef.current = null;
    try {
      const grams = weightGrams && weightGrams > 0 ? weightGrams : 100;
      const result = await lookupSingleItem(name.trim(), grams);
      setEditingMeal(prev => {
        if (!prev) return prev;
        const items = [...(prev.items || [])];
        items[idx] = {
          ...items[idx],
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fats: result.fats,
          weightGrams: grams,
        };
        return { ...prev, items };
      });
    } catch {
      // silent fail — user can fill in manually
    } finally {
      setLookingUp(null);
    }
  };

  const handleItemChange = (idx: number, field: keyof MealItem, value: string) => {
    if (!editingMeal) return;
    const itemsCpy = [...(editingMeal.items || [])];
    const item = itemsCpy[idx];

    if (field === 'name') {
      itemsCpy[idx] = { ...item, name: value };
      setEditingMeal({ ...editingMeal, items: itemsCpy });
      if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
      pendingLookupRef.current = { idx, name: value };
      nameTimerRef.current = setTimeout(() => {
        if (pendingLookupRef.current?.idx === idx && pendingLookupRef.current.name === value) {
          lookupForItem(idx, value, item.weightGrams);
        }
      }, 800);
      return;
    }

    if (field === 'weightGrams') {
      const newWeight = parseFloat(value);
      if (!isNaN(newWeight) && newWeight > 0 && (item.weightGrams ?? 0) > 0) {
        const ratio = newWeight / item.weightGrams!;
        const scaleMicros = (micros?: MicroNutrients): MicroNutrients | undefined => {
          if (!micros) return undefined;
          const scaled: MicroNutrients = {};
          for (const key in micros) {
            const v = (micros as Record<string, number>)[key];
            (scaled as Record<string, number>)[key] = Math.round(v * ratio * 10) / 10;
          }
          return scaled;
        };
        itemsCpy[idx] = {
          ...item,
          weightGrams: newWeight,
          calories: Math.round(item.calories * ratio),
          protein:  item.protein  != null ? Math.round(item.protein  * ratio * 10) / 10 : undefined,
          carbs:    item.carbs    != null ? Math.round(item.carbs    * ratio * 10) / 10 : undefined,
          fats:     item.fats     != null ? Math.round(item.fats     * ratio * 10) / 10 : undefined,
          micros:   scaleMicros(item.micros),
        };
      } else {
        itemsCpy[idx] = { ...item, weightGrams: isNaN(newWeight) ? undefined : newWeight };
      }
    } else if (field === 'calories' || field === 'protein' || field === 'carbs' || field === 'fats') {
      const num = parseFloat(value);
      itemsCpy[idx] = { ...item, [field]: isNaN(num) ? undefined : num };
    } else {
      itemsCpy[idx] = { ...item, [field]: value };
    }

    setEditingMeal({ ...editingMeal, items: itemsCpy });
  };

  const handleNameBlur = (idx: number) => {
    if (pendingLookupRef.current?.idx === idx) {
      if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
      const { name } = pendingLookupRef.current;
      const weight = editingMeal?.items?.[idx]?.weightGrams;
      lookupForItem(idx, name, weight);
    }
  };

  return (
    <div className="px-6 mb-4 mt-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-Malama-main dark:text-white text-lg font-bold">Refeições de Hoje</h2>
      </div>
      
      <div className="bg-white dark:bg-surface-dark rounded-xl p-5 shadow-sm border border-Malama-border dark:border-transparent transition-colors duration-300 flex flex-col gap-6">
        {todaysMeals.map((meal, index) => (
          <div key={meal.id} className="flex flex-col gap-3 relative">
            {index !== todaysMeals.length - 1 && (
              <div className="absolute left-[19px] top-10 bottom-[-24px] w-[2px] bg-Malama-border dark:bg-white/5 z-0" />
            )}

            {/* Cabeçalho da refeição */}
            <div className="flex items-start gap-4 relative z-10 w-full group">
              <div 
                className="size-10 rounded-full bg-Malama-bg dark:bg-white/5 border border-Malama-border dark:border-white/10 flex items-center justify-center shrink-0 cursor-pointer"
                onClick={() => toggleExpand(meal.id)}
              >
                <span className="material-symbols-outlined text-Malama-petrol dark:text-primary text-[20px]">
                  {getMealIcon(meal.type)}
                </span>
              </div>
              
              <div className="flex-1 min-w-0 pt-0.5" onClick={() => toggleExpand(meal.id)}>
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-Malama-main dark:text-white font-bold text-base truncate pr-2 capitalize cursor-pointer">
                    {formatTime(meal.timestamp)} - {meal.name || 'Refeição'}
                  </h3>
                  <div className="flex gap-2 items-center opacity-0 group-hover:opacity-100 transition-opacity absolute right-6 top-0 bg-white dark:bg-surface-dark px-2 rounded-lg shadow-sm">
                    <button onClick={(e) => { e.stopPropagation(); setEditingMeal({...meal}); }} className="text-Malama-petrol dark:text-primary p-1 hover:bg-Malama-petrol/10 rounded">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(meal.id); }} className="text-red-500 p-1 hover:bg-red-500/10 rounded">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                  <span className="material-symbols-outlined text-Malama-muted text-sm cursor-pointer ml-auto">
                    {expandedMeals[meal.id] ? 'expand_less' : 'expand_more'}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 cursor-pointer">
                  <span className="text-sm font-bold text-Malama-petrol dark:text-primary shrink-0">
                    {meal.calories} <span className="text-[10px] font-normal uppercase tracking-wider">kcal</span>
                  </span>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-medium text-Malama-muted dark:text-slate-500">P <strong className="text-Malama-main dark:text-slate-300">{meal.macros.protein}g</strong></span>
                    <span className="text-[10px] font-medium text-Malama-muted dark:text-slate-500">C <strong className="text-Malama-main dark:text-slate-300">{meal.macros.carbs}g</strong></span>
                    <span className="text-[10px] font-medium text-Malama-muted dark:text-slate-500">G <strong className="text-Malama-main dark:text-slate-300">{meal.macros.fats}g</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Listagem colapsável de Itens (Estilo Compacto) */}
            {expandedMeals[meal.id] && meal.items && meal.items.length > 0 && (
              <div className="ml-[56px] flex flex-col gap-1.5 relative z-10 animate-fade-in-up">
                {meal.items.map((item, idx) => (
                  <div key={idx} className="bg-Malama-bg dark:bg-surface-dark rounded-md p-2 border border-transparent hover:border-Malama-petrol/10 dark:hover:border-primary/10 transition-colors text-xs text-Malama-muted dark:text-slate-400">
                    <span className="font-semibold text-Malama-main dark:text-white">
                      {item.weightGrams ? `${item.weightGrams}g` : item.quantity ? item.quantity : '1x'} {item.name}
                    </span>
                    <span className="opacity-80">
                      : {item.protein || 0}g proteína, {item.carbs || 0}g carbo, {item.fats || 0}g gord
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal de Edição (Manual Simple Layout) */}
      {editingMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-Malama-border dark:border-white/5 flex items-center justify-between bg-Malama-bg dark:bg-white/5">
              <h3 className="font-bold text-Malama-main dark:text-white">Editar Refeição</h3>
              <button onClick={() => setEditingMeal(null)} className="text-Malama-muted hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto no-scrollbar flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm font-semibold text-Malama-main dark:text-white">
                Nome da Refeição
                <input 
                  type="text" 
                  value={editingMeal.name} 
                  onChange={e => setEditingMeal({...editingMeal, name: e.target.value})}
                  className="bg-Malama-bg dark:bg-surface-dark border border-Malama-border dark:border-white/10 rounded-xl px-4 py-2 text-Malama-main dark:text-white focus:border-Malama-petrol dark:focus:border-primary outline-none transition-colors"
                />
              </label>

              <div className="flex flex-col gap-3 mt-2">
                <h4 className="text-xs font-bold text-Malama-muted dark:text-slate-400 uppercase tracking-wider">Itens</h4>
                {editingMeal.items?.map((item, idx) => (
                  <div key={idx} className="p-3 bg-Malama-bg dark:bg-surface-dark rounded-xl border border-Malama-border dark:border-white/5 flex flex-col gap-2 relative">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Nome do ingrediente"
                        value={item.name}
                        onChange={e => handleItemChange(idx, 'name', e.target.value)}
                        onBlur={() => handleNameBlur(idx)}
                        className="bg-white dark:bg-surface-dark w-full border border-Malama-border dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-Malama-main dark:text-white outline-none pr-7"
                      />
                      {lookingUp === idx && (
                        <span className="material-symbols-outlined text-primary text-sm absolute right-2 top-1/2 -translate-y-1/2 animate-spin">progress_activity</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="text-[9px] text-Malama-muted uppercase font-bold">Peso/Qtd (g)</span>
                        <input 
                          type="number" 
                          value={item.weightGrams || ''} 
                          onChange={e => handleItemChange(idx, 'weightGrams', e.target.value)}
                          className="bg-white dark:bg-surface-dark w-full border border-Malama-border dark:border-white/10 rounded-lg px-2 py-1 text-xs text-Malama-main dark:text-white outline-none"
                        />
                      </div>
                      <div className="flex-[0.8] flex flex-col gap-1">
                        <span className="text-[9px] text-accent-protein uppercase font-bold">Prot (g)</span>
                        <input 
                          type="number" 
                          value={item.protein || ''} 
                          onChange={e => handleItemChange(idx, 'protein', e.target.value)}
                          className="bg-white dark:bg-surface-dark w-full border border-Malama-border dark:border-white/10 rounded-lg px-2 py-1 text-xs text-Malama-main dark:text-white outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="text-[9px] text-accent-carbs uppercase font-bold">Carbo (g)</span>
                        <input 
                          type="number" 
                          value={item.carbs || ''} 
                          onChange={e => handleItemChange(idx, 'carbs', e.target.value)}
                          className="bg-white dark:bg-surface-dark w-full border border-Malama-border dark:border-white/10 rounded-lg px-2 py-1 text-xs text-Malama-main dark:text-white outline-none"
                        />
                      </div>
                      <div className="flex-[0.8] flex flex-col gap-1">
                        <span className="text-[9px] text-accent-fat uppercase font-bold">Gord (g)</span>
                        <input 
                          type="number" 
                          value={item.fats || ''} 
                          onChange={e => handleItemChange(idx, 'fats', e.target.value)}
                          className="bg-white dark:bg-surface-dark w-full border border-Malama-border dark:border-white/10 rounded-lg px-2 py-1 text-xs text-Malama-main dark:text-white outline-none"
                        />
                      </div>
                    </div>
                    {/* Delete Item Button */}
                    <button 
                      onClick={() => setEditingMeal({...editingMeal, items: editingMeal.items?.filter((_, i) => i !== idx)})}
                      className="absolute -top-2 -right-2 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full p-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))}

                <button 
                  onClick={() => setEditingMeal({...editingMeal, items: [...(editingMeal.items || []), { name: '', calories: 0 }]})}
                  className="w-full py-2 border-2 border-dashed border-Malama-petrol/30 dark:border-primary/30 text-Malama-petrol dark:text-primary font-semibold text-xs rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">add</span> Adicionar Item
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-Malama-bg dark:bg-white/5 border-t border-Malama-border dark:border-white/5">
              <button
                onClick={handleSaveEdit}
                disabled={lookingUp !== null}
                className="w-full bg-Malama-petrol dark:bg-primary text-white font-bold h-12 rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lookingUp !== null ? 'Buscando nutrição...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
