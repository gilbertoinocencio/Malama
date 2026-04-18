import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { MealSuggestion } from '../services/coachService';
import { MealSuggestionService } from '../services/mealSuggestionService';
import { MealService } from '../services/mealService';
import { useAuth } from '../contexts/AuthContext';
import { Meal } from '../types';

interface MealSuggestionsCarouselProps {
  onMealLogged?: (meal: Meal) => void;
}

export const MealSuggestionsCarousel: React.FC<MealSuggestionsCarouselProps> = ({ onMealLogged }) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState(0);
  const [pendingLog, setPendingLog] = useState<MealSuggestion | null>(null);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    if (user) {
      loadSuggestions();
    }
  }, [user]);

  const loadSuggestions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const dailySuggestions = await MealSuggestionService.getTodaySuggestions(user.id);
      // Filter only suggestions that haven't been rejected or already logged
      const pending = dailySuggestions.filter((s) => s.accepted !== false && !s.logged);
      setSuggestions(pending);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = (offset: number, velocity: number) => {
    const swipeThreshold = 100;
    if (Math.abs(offset) > swipeThreshold || Math.abs(velocity) > 500) {
      if (offset > 0) {
        handlePrevious();
      } else {
        handleNext();
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < suggestions.length - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    }
    setPendingLog(null);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
    setPendingLog(null);
  };

  const handleAccept = async () => {
    const current = suggestions[currentIndex];
    if (!current.id) return;

    await MealSuggestionService.acceptSuggestion(current.id);
    setPendingLog(current);
  };

  const handleReject = async () => {
    const current = suggestions[currentIndex];
    if (!current.id) return;

    await MealSuggestionService.rejectSuggestion(current.id);
    setPendingLog(null);

    const newSuggestions = suggestions.filter((_, i) => i !== currentIndex);
    setSuggestions(newSuggestions);

    if (currentIndex >= newSuggestions.length && newSuggestions.length > 0) {
      setCurrentIndex(newSuggestions.length - 1);
    }
  };

  const handleLogNow = async () => {
    if (!pendingLog || !user) return;
    setLogging(true);

    try {
      const meal: Meal = {
        id: '',
        name: pendingLog.meal_name,
        timestamp: new Date(),
        calories: pendingLog.calories || 0,
        macros: {
          protein: pendingLog.protein || 0,
          carbs: pendingLog.carbs || 0,
          fats: pendingLog.fats || 0,
        },
        type: 'manual',
        items: pendingLog.ingredients?.map((ing: any) => ({
          name: ing.name,
          quantity: ing.quantity,
          calories: 0,
        })),
      };

      const mealId = await MealService.logMeal(meal, user.id);

      if (pendingLog.id) {
        await MealSuggestionService.markAsLogged(pendingLog.id, mealId);
      }

      // Remove from carousel (already logged)
      const newSuggestions = suggestions.filter((_, i) => i !== currentIndex);
      setSuggestions(newSuggestions);
      if (currentIndex >= newSuggestions.length && newSuggestions.length > 0) {
        setCurrentIndex(newSuggestions.length - 1);
      }
      setPendingLog(null);

      onMealLogged?.({ ...meal, id: mealId });
    } catch (error) {
      console.error('Error logging suggestion:', error);
    } finally {
      setLogging(false);
    }
  };

  const handleLogLater = () => {
    setPendingLog(null);
    handleNext();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-md animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-3xl p-6 border border-orange-200 dark:border-orange-700">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="size-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-3xl">
              restaurant
            </span>
          </div>
          <h3 className="text-lg font-bold text-Malama-main dark:text-white">
            Todas as sugestões revisadas!
          </h3>
          <p className="text-sm text-Malama-muted dark:text-gray-400">
            Volte amanhã para novas recomendações de refeições.
          </p>
        </div>
      </div>
    );
  }

  const current = suggestions[currentIndex];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-3xl p-6 border border-orange-200 dark:border-orange-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-orange-500 flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-white text-[24px]">
              restaurant
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-Malama-main dark:text-white">
              Sugestões de Hoje
            </h3>
            <p className="text-xs text-Malama-muted dark:text-gray-400">
              {currentIndex + 1} de {suggestions.length} refeições
            </p>
          </div>
        </div>

        {/* Navigation Dots */}
        <div className="flex gap-1.5">
          {suggestions.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
                setPendingLog(null);
              }}
              className={`
                h-2 rounded-full transition-all
                ${index === currentIndex
                  ? 'w-6 bg-orange-500'
                  : 'w-2 bg-orange-300 dark:bg-orange-700'
                }
              `}
            />
          ))}
        </div>
      </div>

      {/* Carousel */}
      <div className="relative h-[480px] overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }: PanInfo) => {
              handleSwipe(offset.x, velocity.x);
            }}
            className="absolute w-full h-full"
          >
            <div className="h-full overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin scrollbar-thumb-orange-300 dark:scrollbar-thumb-orange-700 scrollbar-track-transparent">
              <MealCard suggestion={current} accepted={pendingLog?.id === current.id} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Actions */}
      <AnimatePresence mode="wait">
        {pendingLog?.id === current.id ? (
          <motion.div
            key="log-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex gap-3 mt-4"
          >
            <button
              onClick={handleLogLater}
              className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-surface-dark
                text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-800
                active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">schedule</span>
              <span>Registrar Depois</span>
            </button>
            <button
              onClick={handleLogNow}
              disabled={logging}
              className="flex-1 py-3.5 rounded-2xl bg-Malama-petrol dark:bg-primary text-white font-bold
                shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 transition-all
                flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {logging ? (
                <span className="size-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
              )}
              <span>{logging ? 'Registrando...' : 'Registrar Agora'}</span>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="default-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex gap-3 mt-4"
          >
            <button
              onClick={handleReject}
              className="flex-1 py-3.5 rounded-2xl border-2 border-red-200 dark:border-red-700 bg-white dark:bg-surface-dark
                text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/20
                active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
              <span>Rejeitar</span>
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 py-3.5 rounded-2xl bg-green-500 dark:bg-green-600 text-white font-bold
                shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 transition-all
                flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>Aceitar</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe Hint */}
      <p className="text-center text-xs text-Malama-muted dark:text-gray-500 mt-3">
        Arraste para os lados ou use os botões
      </p>
    </div>
  );
};

// Meal Card Component
interface MealCardProps {
  suggestion: MealSuggestion;
  accepted?: boolean;
}

const MealCard: React.FC<MealCardProps> = ({ suggestion, accepted }) => {
  const getMealIcon = (mealTime: string): string => {
    const icons: Record<string, string> = {
      breakfast: 'bakery_dining',
      morning_snack: 'coffee',
      lunch: 'restaurant',
      afternoon_snack: 'nutrition',
      dinner: 'dinner_dining',
      evening_snack: 'local_cafe',
      pre_workout: 'fitness_center',
      post_workout: 'sports_gymnastics',
    };
    return icons[mealTime] || 'restaurant';
  };

  const getMealLabel = (mealTime: string): string => {
    const labels: Record<string, string> = {
      breakfast: 'Café da Manhã',
      morning_snack: 'Lanche da Manhã',
      lunch: 'Almoço',
      afternoon_snack: 'Lanche da Tarde',
      dinner: 'Jantar',
      evening_snack: 'Ceia',
      pre_workout: 'Pré-Treino',
      post_workout: 'Pós-Treino',
    };
    return labels[mealTime] || mealTime;
  };

  return (
    <div className={`bg-white dark:bg-surface-dark rounded-2xl p-5 shadow-lg border transition-colors
      ${accepted
        ? 'border-green-400 dark:border-green-600 ring-2 ring-green-300 dark:ring-green-700'
        : 'border-Malama-border dark:border-gray-700'
      }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-orange-500 text-[20px]">
              {getMealIcon(suggestion.meal_time)}
            </span>
            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
              {getMealLabel(suggestion.meal_time)}
            </span>
            {accepted && (
              <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Aceita
              </span>
            )}
          </div>
          <h4 className="text-xl font-bold text-Malama-main dark:text-white leading-tight">
            {suggestion.meal_name}
          </h4>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <span className="text-xs text-Malama-muted dark:text-gray-500">Horário</span>
          <p className="text-lg font-bold text-Malama-petrol dark:text-primary">
            {suggestion.suggested_hour}
          </p>
        </div>
      </div>

      {/* Description */}
      {suggestion.description && (
        <p className="text-sm text-Malama-muted dark:text-gray-300 leading-relaxed mb-3">
          {suggestion.description}
        </p>
      )}

      {/* Macros */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-Malama-pastel-orange/30 dark:bg-orange-900/20 rounded-xl p-2.5 text-center">
          <span className="text-[10px] text-Malama-muted dark:text-gray-500 block mb-0.5">Calorias</span>
          <span className="text-base font-bold text-Malama-main dark:text-white">{suggestion.calories}</span>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2.5 text-center">
          <span className="text-[10px] text-Malama-muted dark:text-gray-500 block mb-0.5">Proteína</span>
          <span className="text-base font-bold text-Malama-main dark:text-white">{suggestion.protein}g</span>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-2.5 text-center">
          <span className="text-[10px] text-Malama-muted dark:text-gray-500 block mb-0.5">Carbs</span>
          <span className="text-base font-bold text-Malama-main dark:text-white">{suggestion.carbs}g</span>
        </div>
        <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-2.5 text-center">
          <span className="text-[10px] text-Malama-muted dark:text-gray-500 block mb-0.5">Gordura</span>
          <span className="text-base font-bold text-Malama-main dark:text-white">{suggestion.fats}g</span>
        </div>
      </div>

      {/* Ingredients */}
      {suggestion.ingredients && suggestion.ingredients.length > 0 && (
        <div className="mb-3">
          <h5 className="text-sm font-bold text-Malama-main dark:text-white flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[18px]">shopping_basket</span>
            Ingredientes:
          </h5>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5">
            {suggestion.ingredients.map((ing: any, index: number) => (
              <li key={index} className="text-xs text-Malama-muted dark:text-gray-300 flex items-start gap-1.5">
                <span className="material-symbols-outlined text-orange-500 text-[14px] mt-0.5 flex-shrink-0">check</span>
                <span className="leading-snug">
                  <span className="font-semibold">{ing.name}</span> - {ing.quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reasoning */}
      {suggestion.reasoning && (
        <div className="bg-Malama-pastel-orange/20 dark:bg-primary/10 border border-orange-200 dark:border-orange-700 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-orange-500 text-[18px] mt-0.5 flex-shrink-0">
              lightbulb
            </span>
            <p className="text-xs text-Malama-muted dark:text-gray-300 leading-relaxed">
              <span className="font-semibold text-Malama-main dark:text-white">Por quê agora?</span> {suggestion.reasoning}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealSuggestionsCarousel;
