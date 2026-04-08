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
import { AppRoutes } from './routes';
import { LandingPage } from './routes/LandingPage';

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
const GLP1Onboarding = React.lazy(() => lazyRetry(() => import('./components/GLP1Onboarding'), 'GLP1Onboarding'));
const GLP1Dashboard = React.lazy(() => lazyRetry(() => import('./components/GLP1Dashboard'), 'GLP1Dashboard'));
const GLP1Consulta = React.lazy(() => lazyRetry(() => import('./components/GLP1Consulta'), 'GLP1Consulta'));
const AgendarConsulta = React.lazy(() => lazyRetry(() => import('./components/AgendarConsulta'), 'AgendarConsulta'));
const MinhasConsultas = React.lazy(() => lazyRetry(() => import('./components/MinhasConsultas'), 'MinhasConsultas'));
const PatientConsultaPage = React.lazy(() => lazyRetry(() => import('./components/PatientConsultaPage'), 'PatientConsultaPage'));

import type { Consultation } from './lib/scheduling';

const App: React.FC = () => {
  const { user, profile, loading, profileLoading } = useAuth();
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [stats, setStats] = useState<DailyStats>(INITIAL_STATS);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [isPortalRoute, setIsPortalRoute] = useState(false);
  const [videoConsultation, setVideoConsultation] = useState<Consultation | null>(null);

  // Check if current path is a portal route (/medico/* or /admin/*) or landing page
  useEffect(() => {
    const checkPath = () => {
      const path = window.location.pathname;
      setIsPortalRoute(
        path.startsWith('/medico') ||
        path.startsWith('/admin') ||
        path.startsWith('/influencer') ||
        path.startsWith('/convite') ||
        path.startsWith('/i/') ||
        path === '/' ||
        path === ''
      );
    };

    checkPath();

    // Listen for navigation events (popstate)
    window.addEventListener('popstate', checkPath);
    return () => window.removeEventListener('popstate', checkPath);
  }, []);

  // Handle Theme Toggle
  const [darkMode, setDarkMode] = useState(false);

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
      if (user && profile) {
        NotificationService.checkReminders(user.id, {
          meals_per_day: profile.meals_per_day,
          eating_window_start: profile.eating_window_start,
          eating_window_end: profile.eating_window_end,
        });
      } else {
        NotificationService.checkReminders();
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user, profile]);

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

  // If on a portal route, render the AppRoutes component
  if (isPortalRoute) {
    return <AppRoutes />;
  }

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
            onMealLogged={handleLogMeal}
          />
        )}

        {/* GLP-1 Module */}
        {view === AppView.GLP1_ONBOARDING && (
          <GLP1Onboarding
            onComplete={() => setView(AppView.GLP1_DASHBOARD)}
            onClose={() => setView(AppView.PROFILE)}
            onNavigate={setView}
          />
        )}

        {view === AppView.GLP1_DASHBOARD && (
          <GLP1Dashboard
            onBack={() => setView(AppView.PROFILE)}
            onNavigate={setView}
          />
        )}

        {view === AppView.GLP1_CONSULTA && (
          <GLP1Consulta
            onBack={() => setView(AppView.GLP1_DASHBOARD)}
          />
        )}

        {/* Telemedicine — Real Scheduling Flow */}
        {view === AppView.AGENDAR_CONSULTA && (
          <AgendarConsulta
            onBack={() => setView(AppView.GLP1_DASHBOARD)}
            onBooked={(_c: Consultation) => setView(AppView.MINHAS_CONSULTAS)}
            onNavigate={setView}
          />
        )}

        {view === AppView.MINHAS_CONSULTAS && (
          <MinhasConsultas
            onBack={() => setView(AppView.PROFILE)}
            onEnterConsulta={(c: Consultation) => {
              setVideoConsultation(c);
              setView(AppView.CONSULTA_VIDEO);
            }}
            onNavigate={setView}
          />
        )}

        {view === AppView.CONSULTA_VIDEO && videoConsultation && (
          <PatientConsultaPage
            consultationId={videoConsultation.id}
            roomId={videoConsultation.room_id}
            doctorName={(videoConsultation.doctors as any)?.name || 'Médico'}
            onEnd={() => {
              setVideoConsultation(null);
              setView(AppView.MINHAS_CONSULTAS);
            }}
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