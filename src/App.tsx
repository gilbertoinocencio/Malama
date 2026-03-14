import React, { useState, useEffect, Suspense } from 'react';
import { Layout } from './components/Layout';
import { FlowDashboard } from './components/FlowDashboard'; // Critical: Keep eager
import { LoginView } from './components/LoginView'; // Critical: Keep eager
import { AppView, DailyStats, Meal } from './types';
import { INITIAL_STATS } from './constants';
import { useAuth } from './contexts/AuthContext';
import { MealService } from './services/mealService';
import { StatsService } from './services/statsService';
import { NotificationService } from './services/notificationService';

// Lazy Load Non-Critical Views
// import { MealLogger } from './components/MealLogger';
const SocialFeed = React.lazy<React.ComponentType<any>>(() => import('./components/SocialFeed').then(m => ({ default: (m as any).SocialFeed || (m as any).default })));
const MealLogger = React.lazy<React.ComponentType<any>>(() => import('./components/MealLogger').then(m => ({ default: (m as any).MealLogger || (m as any).default })));
const FoodGuide = React.lazy<React.ComponentType<any>>(() => import('./components/FoodGuide').then(m => ({ default: (m as any).FoodGuide || (m as any).default })));
const SocialShare = React.lazy<React.ComponentType<any>>(() => import('./components/SocialShare').then(m => ({ default: (m as any).SocialShare || (m as any).default })));
const QuarterlyPlan = React.lazy<React.ComponentType<any>>(() => import('./components/QuarterlyPlan').then(m => ({ default: (m as any).QuarterlyPlan || (m as any).default })));
const PlanProgressShare = React.lazy<React.ComponentType<any>>(() => import('./components/PlanProgressShare').then(m => ({ default: (m as any).PlanProgressShare || (m as any).default })));
const ProfileConfig = React.lazy<React.ComponentType<any>>(() => import('./components/ProfileConfig').then(m => ({ default: (m as any).ProfileConfig || (m as any).default })));
const ProfileView = React.lazy<React.ComponentType<any>>(() => import('./components/ProfileView').then(m => ({ default: (m as any).ProfileView || (m as any).default })));
const HydrationSocial = React.lazy<React.ComponentType<any>>(() => import('./components/HydrationSocial').then(m => ({ default: (m as any).HydrationSocial || (m as any).default })));
const QuarterlyAnalysis = React.lazy<React.ComponentType<any>>(() => import('./components/QuarterlyAnalysis').then(m => ({ default: (m as any).QuarterlyAnalysis || (m as any).default })));
const DailyJournal = React.lazy<React.ComponentType<any>>(() => import('./components/DailyJournal').then(m => ({ default: (m as any).DailyJournal || (m as any).default })));
const PlanRenewal = React.lazy<React.ComponentType<any>>(() => import('./components/PlanRenewal').then(m => ({ default: (m as any).PlanRenewal || (m as any).default })));
const RefinePlan = React.lazy<React.ComponentType<any>>(() => import('./components/RefinePlan').then(m => ({ default: (m as any).RefinePlan || (m as any).default })));
const FlowAdaptation = React.lazy<React.ComponentType<any>>(() => import('./components/FlowAdaptation').then(m => ({ default: (m as any).FlowAdaptation || (m as any).default })));
const VisualEvolution = React.lazy<React.ComponentType<any>>(() => import('./components/VisualEvolution').then(m => ({ default: (m as any).VisualEvolution || (m as any).default })));
const VisualShare = React.lazy<React.ComponentType<any>>(() => import('./components/VisualShare').then(m => ({ default: (m as any).VisualShare || (m as any).default })));
const Integrations = React.lazy<React.ComponentType<any>>(() => import('./components/Integrations').then(m => ({ default: (m as any).Integrations || (m as any).default })));

const App: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [stats, setStats] = useState<DailyStats>(INITIAL_STATS);
  const [meals, setMeals] = useState<Meal[]>([]);

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

  // Fetch Stats on Load
  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    try {
      const dailyStats = await StatsService.getDailyStats(user.id);
      setStats(dailyStats);

      const dailyMeals = await MealService.getMeals(user.id);
      setMeals(dailyMeals);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

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

  // Onboarding Flow: User exists but hasn't set up profile
  if (!profile?.goal) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <ProfileConfig
          onBack={() => { }}
          onFinish={() => window.location.reload()}
          isOnboarding={true}
        />
      </Suspense>
    );
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
            onFabClick={() => setView(AppView.DAILY_JOURNAL)}
            onShareClick={() => setView(AppView.SHARE)}
            onNavClick={setView}
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