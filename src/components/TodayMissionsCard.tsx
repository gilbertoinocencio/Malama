import React, { useState, useEffect } from 'react';
import { CoachService, DailyMission } from '../services/coachService';
import { useAuth } from '../contexts/AuthContext';
import { AppView } from '../types';

interface TodayMissionsCardProps {
  onNavClick?: (view: AppView) => void;
  onFabClick?: () => void;
}

export const TodayMissionsCard: React.FC<TodayMissionsCardProps> = ({ onNavClick, onFabClick }) => {
  const { user } = useAuth();
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMissions();
    }
  }, [user]);

  const loadMissions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await CoachService.syncMissionsProgress(user.id);
      const todayMissions = await CoachService.getTodayMissions(user.id);
      setMissions(todayMissions);
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMissionClick = async (mission: DailyMission) => {
    if (!user) return;
    
    // Se a missão for baseada em meta/progresso, navega para a ação correta
    if (mission.mission_type === 'hydration') {
      if (onNavClick) onNavClick(AppView.HYDRATION);
      return;
    }
    
    if (mission.mission_type === 'protein_intake' || mission.mission_type === 'meal_timing') {
      if (onFabClick) onFabClick();
      return;
    }

    if (mission.mission_type === 'checkin') {
      // Como não temos um view específico para checkin aqui (ou é aberto via Fab),
      // enviamos o usuário para o diário ou deixamos ele completar via botão se for o caso.
      // Neste caso, vamos apenas tentar completar diretamente por enquanto, ou se tiver checkin modal, abrilo.
    }

    // Para missões simples (exercício, sono, custom) que só exigem um 'check' manual:
    if (!mission.completed && mission.id) {
      try {
        await CoachService.completeMission(user.id, mission.id);
        await loadMissions(); // Reload to get updated state
      } catch (error) {
        console.error('Error completing mission:', error);
      }
    }
  };

  const completedCount = missions.filter((m) => m.completed).length;
  const totalCount = missions.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-md animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-nura-petrol/5 to-nura-pastel-orange/10 dark:from-primary/5 dark:to-primary/10 rounded-3xl p-6 border border-nura-petrol/20 dark:border-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-nura-petrol dark:bg-primary flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-white text-[24px]">
              task_alt
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-nura-main dark:text-white">
              Missões de Hoje
            </h3>
            <p className="text-xs text-nura-muted dark:text-gray-400">
              {completedCount}/{totalCount} completas
            </p>
          </div>
        </div>

        {/* XP Badge */}
        {completedCount > 0 && (
          <div className="flex items-center gap-1.5 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1.5 rounded-full">
            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-[16px]">
              stars
            </span>
            <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
              +{missions.filter((m) => m.completed).reduce((sum, m) => sum + m.xp_reward, 0)} XP
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-5">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-nura-petrol to-green-500 dark:from-primary dark:to-green-400 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Missions List */}
      <div className="space-y-3">
        {missions.map((mission) => (
          <MissionItem
            key={mission.id}
            mission={mission}
            onComplete={() => handleMissionClick(mission)}
          />
        ))}
      </div>

      {/* All Complete Celebration */}
      {completedCount === totalCount && totalCount > 0 && (
        <div className="mt-5 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            Todas as missões completas!
          </p>
          <p className="text-xs text-green-700 dark:text-green-400 mt-1">
            Você está arrasando hoje!
          </p>
        </div>
      )}
    </div>
  );
};

// Mission Item Component
interface MissionItemProps {
  mission: DailyMission;
  onComplete: () => void;
}

const MissionItem: React.FC<MissionItemProps> = ({ mission, onComplete }) => {
  const getIcon = (type: string): string => {
    const icons: Record<string, string> = {
      hydration: 'water_drop',
      protein_intake: 'egg',
      checkin: 'psychology',
      exercise: 'fitness_center',
      sleep: 'bedtime',
      meal_timing: 'restaurant',
      custom: 'star',
    };
    return icons[type] || 'check_circle';
  };

  const progressPercentage = mission.target_value
    ? Math.min(Math.round((mission.current_value / mission.target_value) * 100), 100)
    : mission.completed
    ? 100
    : 0;

  return (
    <button
      type="button"
      onClick={onComplete}
      disabled={mission.completed}
      className={`
        w-full flex items-center gap-4 p-4 rounded-2xl transition-all
        ${
          mission.completed
            ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700'
            : 'bg-white dark:bg-surface-dark border-2 border-nura-border dark:border-gray-700 hover:border-nura-petrol/50 dark:hover:border-primary/50 active:scale-[0.98]'
        }
      `}
    >
      {/* Icon */}
      <div
        className={`
          size-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
          ${
            mission.completed
              ? 'bg-green-500 dark:bg-green-600'
              : 'bg-nura-petrol/10 dark:bg-primary/10'
          }
        `}
      >
        <span
          className={`
            material-symbols-outlined text-2xl
            ${mission.completed ? 'text-white' : 'text-nura-petrol dark:text-primary'}
          `}
        >
          {mission.completed ? 'check_circle' : getIcon(mission.mission_type)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 text-left">
        <h4
          className={`
            text-sm font-bold mb-1
            ${
              mission.completed
                ? 'text-green-800 dark:text-green-300 line-through'
                : 'text-nura-main dark:text-white'
            }
          `}
        >
          {mission.title}
        </h4>

        {mission.description && (
          <p className="text-xs text-nura-muted dark:text-gray-400 mb-2">
            {mission.description}
          </p>
        )}

        {/* Progress */}
        {mission.target_value && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`
                  h-full transition-all duration-300 rounded-full
                  ${
                    mission.completed
                      ? 'bg-green-500'
                      : 'bg-nura-petrol dark:bg-primary'
                  }
                `}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-nura-muted dark:text-gray-400">
              {mission.current_value}/{mission.target_value} {mission.unit}
            </span>
          </div>
        )}
      </div>

      {/* XP Badge */}
      <div
        className={`
          flex items-center gap-1 px-2.5 py-1 rounded-full flex-shrink-0
          ${
            mission.completed
              ? 'bg-green-200 dark:bg-green-800'
              : 'bg-yellow-100 dark:bg-yellow-900/30'
          }
        `}
      >
        <span
          className={`
            material-symbols-outlined text-[14px]
            ${
              mission.completed
                ? 'text-green-700 dark:text-green-300'
                : 'text-yellow-600 dark:text-yellow-400'
            }
          `}
        >
          stars
        </span>
        <span
          className={`
            text-xs font-bold
            ${
              mission.completed
                ? 'text-green-700 dark:text-green-300'
                : 'text-yellow-700 dark:text-yellow-300'
            }
          `}
        >
          {mission.xp_reward}
        </span>
      </div>
    </button>
  );
};

export default TodayMissionsCard;
