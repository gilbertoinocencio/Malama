import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { MealSuggestion } from '../services/coachService';
import { MealSuggestionService } from '../services/mealSuggestionService';
import { useAuth } from '../contexts/AuthContext';

export const MealSuggestionsCarousel: React.FC = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState(0);

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
      // Filter only suggestions that haven't been logged or rejected
      const pending = dailySuggestions.filter((s) => s.accepted === null || s.accepted === true);
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
        // Swipe right - previous
        handlePrevious();
      } else {
        // Swipe left - next
        handleNext();
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < suggestions.length - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleAccept = async () => {
    const current = suggestions[currentIndex];
    if (!current.id) return;

    await MealSuggestionService.acceptSuggestion(current.id);
    handleNext();
  };

  const handleReject = async () => {
    const current = suggestions[currentIndex];
    if (!current.id) return;

    await MealSuggestionService.rejectSuggestion(current.id);

    // Remove from list
    const newSuggestions = suggestions.filter((_, i) => i !== currentIndex);
    setSuggestions(newSuggestions);

    if (currentIndex >= newSuggestions.length && newSuggestions.length > 0) {
      setCurrentIndex(newSuggestions.length - 1);
    }
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
          <h3 className="text-lg font-bold text-nura-main dark:text-white">
            Todas as sugestões revisadas!
          </h3>
          <p className="text-sm text-nura-muted dark:text-gray-400">
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
            <h3 className="text-lg font-bold text-nura-main dark:text-white">
              Sugestões de Hoje
            </h3>
            <p className="text-xs text-nura-muted dark:text-gray-400">
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
      <div className="relative h-[420px] overflow-hidden">
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
            className="absolute w-full"
          >
            <MealCard suggestion={current} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-4">
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
      </div>

      {/* Swipe Hint */}
      <p className="text-center text-xs text-nura-muted dark:text-gray-500 mt-3">
        Arraste para os lados ou use os botões
      </p>
    </div>
  );
};

// Meal Card Component
interface MealCardProps {
  suggestion: MealSuggestion;
}

const MealCard: React.FC<MealCardProps> = ({ suggestion }) => {
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
    <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 shadow-lg border border-nura-border dark:border-gray-700 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-orange-500 text-[20px]">
              {getMealIcon(suggestion.meal_time)}
            </span>
            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
              {getMealLabel(suggestion.meal_time)}
            </span>
          </div>
          <h4 className="text-xl font-bold text-nura-main dark:text-white leading-tight">
            {suggestion.meal_name}
          </h4>
        </div>
        <div className="text-right">
          <span className="text-xs text-nura-muted dark:text-gray-500">Horário</span>
          <p className="text-lg font-bold text-nura-petrol dark:text-primary">
            {suggestion.suggested_hour}
          </p>
        </div>
      </div>

      {/* Description */}
      {suggestion.description && (
        <p className="text-sm text-nura-muted dark:text-gray-300 leading-relaxed">
          {suggestion.description}
        </p>
      )}

      {/* Macros */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-nura-pastel-orange/30 dark:bg-orange-900/20 rounded-xl p-2.5 text-center">
          <span className="text-xs text-nura-muted dark:text-gray-500 block mb-0.5">Calorias</span>
          <span className="text-base font-bold text-nura-main dark:text-white">{suggestion.calories}</span>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2.5 text-center">
          <span className="text-xs text-nura-muted dark:text-gray-500 block mb-0.5">Proteína</span>
          <span className="text-base font-bold text-nura-main dark:text-white">{suggestion.protein}g</span>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-2.5 text-center">
          <span className="text-xs text-nura-muted dark:text-gray-500 block mb-0.5">Carbs</span>
          <span className="text-base font-bold text-nura-main dark:text-white">{suggestion.carbs}g</span>
        </div>
        <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-2.5 text-center">
          <span className="text-xs text-nura-muted dark:text-gray-500 block mb-0.5">Gordura</span>
          <span className="text-base font-bold text-nura-main dark:text-white">{suggestion.fats}g</span>
        </div>
      </div>

      {/* Ingredients */}
      {suggestion.ingredients && suggestion.ingredients.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-bold text-nura-main dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">shopping_basket</span>
            Ingredientes:
          </h5>
          <ul className="grid grid-cols-2 gap-2">
            {suggestion.ingredients.map((ing: any, index: number) => (
              <li key={index} className="text-xs text-nura-muted dark:text-gray-300 flex items-start gap-1.5">
                <span className="material-symbols-outlined text-orange-500 text-[14px] mt-0.5">check</span>
                <span>
                  <span className="font-semibold">{ing.name}</span> - {ing.quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reasoning */}
      {suggestion.reasoning && (
        <div className="bg-nura-pastel-orange/20 dark:bg-primary/10 border border-orange-200 dark:border-orange-700 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-orange-500 text-[18px] mt-0.5">
              lightbulb
            </span>
            <p className="text-xs text-nura-muted dark:text-gray-300 leading-relaxed">
              <span className="font-semibold text-nura-main dark:text-white">Por quê agora?</span> {suggestion.reasoning}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealSuggestionsCarousel;
