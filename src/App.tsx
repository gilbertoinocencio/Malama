import React, { useState, useEffect, Suspense } from 'react';
import { Layout } from './components/Layout';
import { FlowDashboard } from './components/FlowDashboard'; // Critical: Keep eager
import { LoginView } from './components/LoginView'; // Critical: Keep eager
import { OnboardingFlow } from './components/onboarding-stitch/OnboardingFlow';
import { AppView, DailyStats, Meal } from './types';
import { INITIAL_STATS } from './constants';
import { useAuth } from './contexts/AuthContext';
import { MealService } from './services/mealService';
import { StatsService } from './services/statsService';
import { NotificationService } from './services/notificationService';
import { supabase } from './services/supabase';
import { lazyRetry } from './utils/lazyRetry';

// Lazy Load Non-Critical Views — lazyRetry auto-reloads on stale chunk errors
const SocialFeed = React.lazy(() => lazyRetry(() => import('./components/SocialFeed'), 'SocialFeed'));
const MealLogger = React.lazy(() => lazyRetry(() => import('./components/MealLogger'), 'MealLogger'));
const FoodGuide = React.lazy(() => lazyRetry(() => import('./components/FoodGuide'), 'FoodGuide'));
const SocialShare = React.lazy(() => lazyRetry(() => import('./components/SocialShare'), 'SocialShare'));
const QuarterlyPlan = React.lazy(() => lazyRetry(() => import('./components/QuarterlyPlan'), 'QuarterlyPlan'));
const PlanProgressShare = React.lazy(() => lazyRetry(() => import('./components/PlanProgressShare'), 'PlanProgressShare'));
const ProfileConfig = React.lazy(() => lazyRetry(() => import('./components/ProfileConfig'), 'ProfileConfig'));
const ProfileView = React.lazy(() => lazyRetry(() => import('./components/ProfileView'), 'ProfileView'));
const HydrationSocial = React.lazy(() => lazyRetry(() => import('./components/HydrationSocial'), 'HydrationSocial'));
const QuarterlyAnalysis = React.lazy(() => lazyRetry(() => import('./components/QuarterlyAnalysis'), 'QuarterlyAnalysis'));
const DailyJournal = React.lazy(() => lazyRetry(() => import('./components/DailyJournal'), 'DailyJournal'));
const PlanRenewal = React.lazy(() => lazyRetry(() => import('./components/PlanRenewal'), 'PlanRenewal'));
const RefinePlan = React.lazy(() => lazyRetry(() => import('./components/RefinePlan'), 'RefinePlan'));
const FlowAdaptation = React.lazy(() => lazyRetry(() => import('./components/FlowAdaptation'), 'FlowAdaptation'));
const VisualEvolution = React.lazy(() => lazyRetry(() => import('./components/VisualEvolution'), 'VisualEvolution'));
const VisualShare = React.lazy(() => lazyRetry(() => import('./components/VisualShare'), 'VisualShare'));
const Integrations = React.lazy(() => lazyRetry(() => import('./components/Integrations'), 'Integrations'));
const App: React.FC = () => {
  const { user, profile, loading, profileLoading } = useAuth();
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [stats, setStats] = useState<DailyStats>(INITIAL_STATS);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Default to false for the Original Light Mode Theme
  const [darkMode, setDarkMode] = useState(false);

  // Handle Theme Toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  // Notification Scheduler
  useEffect(() => {
    const interval = setInterval(() => {
      NotificationService.checkReminders();
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    if (!user || statsLoading) return;
    try {
      setStatsLoading(true);
      const [dailyStats, dailyMeals] = await Promise.all([
        StatsService.getDailyStats(user.id),
        MealService.getMeals(user.id),
      ]);
      setStats(dailyStats);
      setMeals(dailyMeals);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Refresh stats every time the user navigates to HOME
  useEffect(() => {
    if (user && profile?.onboarding_completed && view === AppView.HOME) {
      loadStats();
    }
  }, [user, profile?.onboarding_completed, view]);

  const handleLogMeal = (meal: Meal) => {
    // Optimistic Update
    setMeals(prev => [meal, ...prev]);
    setStats(prev => ({
      ...prev,
      consumedCalories: prev.consumedCalories + meal.calories,
      macros: {
        protein: prev.macros.protein + meal.macros.protein,
        carbs: prev.macros.carbs + meal.macros.carbs,
        fats: prev.macros.fats + meal.macros.fats,
      }
    }));
    setView(AppView.HOME);
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!user) return;
    const mealToDelete = meals.find(m => m.id === mealId);
    if (!mealToDelete) return;
    
    // Optimistic Update
    setMeals(prev => prev.filter(m => m.id !== mealId));
    setStats(prev => ({
      ...prev,
      consumedCalories: prev.consumedCalories - mealToDelete.calories,
      macros: {
        protein: prev.macros.protein - mealToDelete.macros.protein,
        carbs: prev.macros.carbs - mealToDelete.macros.carbs,
        fats: prev.macros.fats - mealToDelete.macros.fats,
      }
    }));
    
    try {
      await MealService.deleteMeal(mealId, user.id);
    } catch (e) {
      console.error(e);
      loadStats();
    }
  };

  const handleEditMeal = async (updatedMeal: Meal) => {
    if (!user) return;
    const oldMeal = meals.find(m => m.id === updatedMeal.id);
    if (!oldMeal) return;

    // Optimistic Update
    setMeals(prev => prev.map(m => m.id === updatedMeal.id ? updatedMeal : m));
    setStats(prev => ({
      ...prev,
      consumedCalories: prev.consumedCalories - oldMeal.calories + updatedMeal.calories,
      macros: {
        protein: prev.macros.protein - oldMeal.macros.protein + updatedMeal.macros.protein,
        carbs: prev.macros.carbs - oldMeal.macros.carbs + updatedMeal.macros.carbs,
        fats: prev.macros.fats - oldMeal.macros.fats + updatedMeal.macros.fats,
      }
    }));

    try {
      await MealService.updateMeal(updatedMeal.id, user.id, updatedMeal);
    } catch (e) {
      console.error(e);
      loadStats();
    }
  };

  // Loading Spinner Component for Suspense fallback
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-8">
      <div className="w-10 h-10 border-4 border-nura-petrol dark:border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // Initial Auth Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nura-bg dark:bg-background-dark">
        <div className="w-16 h-16 border-4 border-nura-petrol dark:border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }


  // Profile still loading from Supabase — show brief spinner (NOT onboarding)
  if (profileLoading || (!profile && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nura-bg dark:bg-background-dark">
        <div className="w-12 h-12 border-4 border-nura-petrol dark:border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Profile loaded but onboarding not completed
  if (!profile?.onboarding_completed) {
    return <OnboardingFlow onComplete={() => loadStats()} />;
  }

  return (
    <Layout
      activeView={view}
      onChangeView={setView}
      onFabClick={() => setView(AppView.LOG)}
    >
      <Suspense fallback={<LoadingSpinner />}>
        {view === AppView.HOME && (
          <FlowDashboard
            stats={stats}
            meals={meals}
            onFabClick={() => setView(AppView.DAILY_JOURNAL)}
            onShareClick={() => setView(AppView.SHARE)}
            onNavClick={setView}
            onDeleteMeal={handleDeleteMeal}
            onEditMeal={handleEditMeal}
            activeView={view}
            isDarkMode={darkMode}
            onToggleTheme={toggleTheme}
          />
        )}

        {view === AppView.FEED && (
          <SocialFeed
            onNavigate={setView}
            onFabClick={() => setView(AppView.LOG)}
            activeView={view}
            onBack={() => setView(AppView.HOME)}
          />
        )}

        {view === AppView.PLAN && (
          <QuarterlyPlan
            onBack={() => setView(AppView.HOME)}
            onNavigate={setView}
          />
        )}

        {view === AppView.PLAN_SHARE && (
          <PlanProgressShare onBack={() => setView(AppView.PLAN)} />
        )}

        {view === AppView.QUARTERLY_ANALYSIS && (
          <QuarterlyAnalysis
            onBack={() => setView(AppView.PROFILE)}
            onNavigate={setView}
          />
        )}

        {view === AppView.VISUAL_EVOLUTION && (
          <VisualEvolution
            onBack={() => setView(AppView.QUARTERLY_ANALYSIS)}
            onNavigate={setView}
          />
        )}

        {view === AppView.VISUAL_SHARE && (
          <VisualShare
            onBack={() => setView(AppView.VISUAL_EVOLUTION)}
          />
        )}

        {view === AppView.PLAN_RENEWAL && (
          <PlanRenewal
            onBack={() => setView(AppView.QUARTERLY_ANALYSIS)}
            onNavigate={setView}
          />
        )}

        {view === AppView.REFINE_PLAN && (
          <RefinePlan
            onBack={() => setView(AppView.PLAN_RENEWAL)}
            onNavigate={setView}
          />
        )}

        {view === AppView.FLOW_ADAPTATION && (
          <FlowAdaptation
            onBack={() => setView(AppView.HOME)}
            onNavigate={setView}
          />
        )}

        {view === AppView.DAILY_JOURNAL && (
          <DailyJournal
            onBack={() => setView(AppView.HOME)}
            onNavigate={setView}
          />
        )}

        {view === AppView.INTEGRATIONS && (
          <Integrations
            onBack={() => setView(AppView.PROFILE)}
          />
        )}

        {/* Main Profile View */}
        {view === AppView.PROFILE && (
          <ProfileView
            onNavClick={setView}
            onSettingsClick={() => setView(AppView.SETTINGS)}
            isDarkMode={darkMode}
            onToggleTheme={toggleTheme}
          />
        )}

        {/* Legacy Config/Settings View */}
        {view === AppView.SETTINGS && (
          <ProfileConfig
            onBack={() => setView(AppView.PROFILE)}
            onFinish={() => setView(AppView.PROFILE)}
          />
        )}

        {/* Hydration Template View */}
        {view === AppView.HYDRATION && (
          <HydrationSocial onBack={() => setView(AppView.HOME)} />
        )}

        {/* Food Guide */}
        {view === AppView.FOOD_GUIDE && (
          <FoodGuide
            onBack={() => setView(AppView.HOME)}
            onNavigate={setView}
          />
        )}

        {/* Overlays */}
        {view === AppView.LOG && (
          <MealLogger onLog={handleLogMeal} onClose={() => setView(AppView.HOME)} />
        )}

        {view === AppView.SHARE && (
          <SocialShare stats={stats} onClose={() => setView(AppView.HOME)} />
        )}
      </Suspense>

    </Layout>
  );
};

export default App;