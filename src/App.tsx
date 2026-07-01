import React, { useState, useEffect, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';
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
import { glp1Service } from './services/glp1Service';
import { supabase } from './services/supabase';
import { lazyRetry } from './utils/lazyRetry';
import { AppRoutes } from './routes';
import { LandingPage } from './routes/LandingPage';
import { useIdleLogout } from './hooks/useIdleLogout';
import { PatientChatModal } from './components/PatientChatModal';
import { AccessBlockedScreen } from './components/AccessBlockedScreen';

// Lazy Load Non-Critical Views — lazyRetry auto-reloads on stale chunk errors
const CommunityFeed = React.lazy(() => lazyRetry(() => import('./components/community/feed/CommunityFeed').then(m => ({ default: m.CommunityFeed })), 'CommunityFeed'));
const CommunitySearch = React.lazy(() => lazyRetry(() => import('./components/community/search/CommunitySearch').then(m => ({ default: m.CommunitySearch })), 'CommunitySearch'));
const NotificationCenter = React.lazy(() => lazyRetry(() => import('./components/community/notifications/NotificationCenter').then(m => ({ default: m.NotificationCenter })), 'NotificationCenter'));
const CommunityProfileView = React.lazy(() => lazyRetry(() => import('./components/community/profile/CommunityProfile').then(m => ({ default: m.CommunityProfile })), 'CommunityProfile'));
const MealLogger = React.lazy(() => lazyRetry(() => import('./components/MealLogger'), 'MealLogger'));
const FoodGuide = React.lazy(() => lazyRetry(() => import('./components/FoodGuide'), 'FoodGuide'));
const SocialShare = React.lazy(() => lazyRetry(() => import('./components/SocialShare'), 'SocialShare'));
const QuarterlyPlan = React.lazy(() => lazyRetry(() => import('./components/QuarterlyPlan'), 'QuarterlyPlan'));
const PlanProgressShare = React.lazy(() => lazyRetry(() => import('./components/PlanProgressShare'), 'PlanProgressShare'));
const ProfileConfig = React.lazy(() => lazyRetry(() => import('./components/ProfileConfig'), 'ProfileConfig'));
const ProfileView = React.lazy(() => lazyRetry(() => import('./components/ProfileView'), 'ProfileView'));
const HydrationSocial = React.lazy(() => lazyRetry(() => import('./components/HydrationSocial'), 'HydrationSocial'));
const DailyJournal = React.lazy(() => lazyRetry(() => import('./components/DailyJournal'), 'DailyJournal'));
const FlowAdaptation = React.lazy(() => lazyRetry(() => import('./components/FlowAdaptation'), 'FlowAdaptation'));
const Integrations = React.lazy(() => lazyRetry(() => import('./components/Integrations'), 'Integrations'));
const GLP1Onboarding = React.lazy(() => lazyRetry(() => import('./components/GLP1Onboarding'), 'GLP1Onboarding'));
const GLP1Dashboard = React.lazy(() => lazyRetry(() => import('./components/GLP1Dashboard'), 'GLP1Dashboard'));
// GLP1Consulta (mock) desativado — consultas GLP-1 usam o fluxo real AgendarConsulta (médicos do banco + créditos B2B).
const AgendarConsulta = React.lazy(() => lazyRetry(() => import('./components/AgendarConsulta'), 'AgendarConsulta'));
const MinhasConsultas = React.lazy(() => lazyRetry(() => import('./components/MinhasConsultas'), 'MinhasConsultas'));
const PatientConsultaPage = React.lazy(() => lazyRetry(() => import('./components/PatientConsultaPage'), 'PatientConsultaPage'));

import type { Consultation } from './lib/scheduling';

// Deriva a chave do localStorage do Supabase a partir da URL (nível de módulo — calculado 1x)
const _supabaseStorageKey = (() => {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL || '';
    if (!url) return '';
    const ref = new URL(url).hostname.split('.')[0];
    return ref ? `sb-${ref}-auth-token` : '';
  } catch { return ''; }
})();

const App: React.FC = () => {
  const { user, profile, loading, profileLoading } = useAuth();
  useIdleLogout(!!user);
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [communityProfileUserId, setCommunityProfileUserId] = useState<string | null>(null);
  const [communityComposerOpen, setCommunityComposerOpen] = useState(false);
  const [notifPostId, setNotifPostId] = useState<string | null>(null);
  const [stats, setStats] = useState<DailyStats>(INITIAL_STATS);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  // Corta o loop de onboarding causado pela race condition entre
  // refreshProfile() e onAuthStateChange no finishOnboarding.
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Bloqueio de acesso por inadimplência da empresa (decisão manual do admin).
  // null = ainda checando; true/false = resultado. Reativação reflete no próximo load.
  const [accessBlocked, setAccessBlocked] = useState<boolean | null>(null);

  const [isPortalRoute, setIsPortalRoute] = useState(() => {
    // No app nativo (Android/iOS via Capacitor), nunca mostrar landing page —
    // vai direto para o fluxo de autenticação nativo.
    if (Capacitor.isNativePlatform()) return false;

    const path = window.location.pathname;

    // /entrar is not a real route — never a portal
    if (path === '/entrar') return false;

    if (
      path.startsWith('/medico') ||
      path.startsWith('/admin') ||
      path.startsWith('/influencer') ||
      path.startsWith('/empresas') ||
      path.startsWith('/rh') ||
      path.startsWith('/convite') ||
      path.startsWith('/i/') ||
      path.startsWith('/listamedicos') ||
      path.startsWith('/listausuarios') ||
      path.startsWith('/listausu%C3%A1rios') ||
      path.startsWith('/listausuários') ||
      path.startsWith('/privacidade') ||
      path.startsWith('/privacy-policy') ||
      path.startsWith('/deletar-conta') ||
      path.startsWith('/delete-account') ||
      path.startsWith('/pitchdeck')
    ) return true;

    // For root path, show landing if no session OR if user came from waitlist Google OAuth
    if (path === '/' || path === '') {
      const hasSession = _supabaseStorageKey
        ? !!localStorage.getItem(_supabaseStorageKey)
        : false;
      const isWaitlistMode = !!localStorage.getItem('Malama_waitlist_mode');
      return !hasSession || isWaitlistMode;
    }

    return false;
  });
  const [videoConsultation, setVideoConsultation] = useState<Consultation | null>(null);
  const [openChat, setOpenChat] = useState<{ consultationId: string; doctorName: string } | null>(null);

  // Check if current path is a portal route (/medico/* or /admin/*) or landing page
  useEffect(() => {
    const isPortalPath = (path: string) =>
      path.startsWith('/medico') ||
      path.startsWith('/admin') ||
      path.startsWith('/influencer') ||
      path.startsWith('/empresas') ||
      path.startsWith('/rh') ||
      path.startsWith('/convite') ||
      path.startsWith('/i/') ||
      path.startsWith('/listamedicos') ||
      path.startsWith('/listausuarios') ||
      path.startsWith('/listausu%C3%A1rios') ||
      path.startsWith('/listausuários') ||
      path.startsWith('/privacidade') ||
      path.startsWith('/privacy-policy') ||
      path.startsWith('/deletar-conta') ||
      path.startsWith('/delete-account') ||
      path.startsWith('/pitchdeck');

    const checkPath = () => {
      // No app nativo, nunca redirecionar para landing page
      if (Capacitor.isNativePlatform()) {
        setIsPortalRoute(false);
        return;
      }

      const path = window.location.pathname;

      if (isPortalPath(path)) {
        setIsPortalRoute(true);
        return;
      }

      // For root path (/), only show portal/landing when there's no active session
      if (path === '/' || path === '') {
        const hasSession = _supabaseStorageKey
          ? !!localStorage.getItem(_supabaseStorageKey)
          : false;
        const isWaitlistMode = !!localStorage.getItem('Malama_waitlist_mode');
        setIsPortalRoute(!hasSession || isWaitlistMode);
        return;
      }

      // All other paths (/entrar, /strava/callback, etc.) — never a portal route
      setIsPortalRoute(false);
    };

    checkPath();

    // Listen for browser back/forward (popstate) AND React Router pushState/replaceState
    window.addEventListener('popstate', checkPath);

    const originalPush = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);

    window.history.pushState = (...args) => { originalPush(...args); checkPath(); };
    window.history.replaceState = (...args) => { originalReplace(...args); checkPath(); };

    return () => {
      window.removeEventListener('popstate', checkPath);
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
    };
  }, []);

  // When user authenticates, ensure we're not stuck showing the portal/landing
  useEffect(() => {
    if (user && isPortalRoute) {
      const path = window.location.pathname;
      const isPortalPath =
        path.startsWith('/medico') ||
        path.startsWith('/admin') ||
        path.startsWith('/influencer') ||
        path.startsWith('/empresas') ||
        path.startsWith('/rh') ||
        path.startsWith('/convite') ||
        path.startsWith('/i/') ||
        path.startsWith('/listamedicos') ||
        path.startsWith('/listausuarios') ||
        path.startsWith('/listausu%C3%A1rios') ||
        path.startsWith('/listausuários') ||
        path.startsWith('/privacidade') ||
        path.startsWith('/privacy-policy') ||
        path.startsWith('/pitchdeck');
      if (!isPortalPath) {
        setIsPortalRoute(false);
      }
    }
  }, [user, isPortalRoute]);

  // Clean up stale /entrar URL when user is already authenticated
  useEffect(() => {
    if (user && window.location.pathname === '/entrar') {
      window.history.replaceState({}, '', '/');
    }
  }, [user]);

  // Handle Theme Toggle — persisted in localStorage
  const [darkMode, setDarkMode] = useState(() => {
    // Initialize from localStorage, default to false (light mode)
    try { return localStorage.getItem('Malama_dark_mode') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('Malama_dark_mode', String(darkMode)); } catch {}
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
          glp1_mode: profile.glp1_mode,
          glp1_medication: profile.glp1_medication,
          glp1_current_dose_mg: profile.glp1_current_dose_mg,
          glp1_meal_schedule: profile.glp1_meal_schedule,
          glp1_application_schedule: profile.glp1_application_schedule,
        });
      } else {
        NotificationService.checkReminders();
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user, profile]);

  // Subscribe to Web Push when GLP-1 mode is active
  useEffect(() => {
    if (!user || !profile?.glp1_mode) return;
    glp1Service.subscribeToPush(user.id).catch(() => {});
  }, [user?.id, profile?.glp1_mode]);

  // Detectar callback do Strava em /strava/callback?code=xxx
  useEffect(() => {
    if (window.location.pathname !== '/strava/callback') return;

    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      window.history.replaceState({}, '', '/');
      return;
    }

    // Aguardar sessão do usuário estar disponível
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) {
        window.history.replaceState({}, '', '/');
        return;
      }

      const { error } = await supabase.functions.invoke('strava-oauth-callback', {
        body: { code },
        headers: { Authorization: `Bearer ${jwt}` },
      });

      // Limpar URL e navegar para Integrações para mostrar o status atualizado
      window.history.replaceState({}, '', '/');
      setView(AppView.INTEGRATIONS);

      if (error) console.error('Strava OAuth callback error:', error);
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Checa bloqueio de acesso por inadimplência sempre que o usuário muda.
  // Cobre todos os pontos de entrada (login, deep link, PWA) — App.tsx é o único entry do app.
  useEffect(() => {
    if (!user) { setAccessBlocked(null); return; }
    let cancelled = false;
    supabase
      .rpc('empresa_acesso_bloqueado', { p_user_id: user.id })
      .then(({ data, error }) => {
        if (cancelled) return;
        // Em caso de erro (ex.: RPC ainda não migrada), não bloqueia — falha aberta.
        setAccessBlocked(error ? false : !!data);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

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
    // AI-logged meals (chat, voice, photo) stay in their screen so the user can read the
    // nutritionist's feedback after confirming. Only manual/dashboard logs return to Home.
    // (Navigating away here would unmount MealLogger before the async feedback renders.)
    const isAiMeal = meal.type === 'ai-photo' || meal.type === 'ai-chat' || meal.type === 'ai-voice';
    if (!isAiMeal) {
      setView(AppView.HOME);
    }
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
      await loadStats();
    } catch (e) {
      console.error(e);
      loadStats();
    }
  };

  // Loading Spinner Component for Suspense fallback
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-8">
      <div className="w-10 h-10 border-4 border-Malama-petrol dark:border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // If on a portal route, render the AppRoutes component
  if (isPortalRoute) {
    return <AppRoutes />;
  }

  // Initial Auth Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-Malama-bg dark:bg-background-dark">
        <div className="w-16 h-16 border-4 border-Malama-petrol dark:border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  // Acesso bloqueado por inadimplência da empresa → trava de render (nenhum dado é tocado).
  if (accessBlocked === true) {
    return <AccessBlockedScreen />;
  }

  // Profile still loading from Supabase — show brief spinner (NOT onboarding)
  if (profileLoading || (!profile && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-Malama-bg dark:bg-background-dark">
        <div className="w-12 h-12 border-4 border-Malama-petrol dark:border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Profile loaded but onboarding not completed
  if (!profile?.onboarding_completed && !onboardingDone) {
    return <OnboardingFlow onComplete={() => { setOnboardingDone(true); loadStats(); }} />;
  }

  return (
  <>
    <Layout
      activeView={view}
      onChangeView={setView}
      onFabClick={() => view === AppView.FEED ? setCommunityComposerOpen(true) : setView(AppView.LOG)}
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
            onOpenChat={setOpenChat}
          />
        )}

        {view === AppView.FEED && (
          <CommunityFeed
            onNavigate={(v: AppView, userId?: string) => {
              if (v === AppView.COMMUNITY_PROFILE && userId) setCommunityProfileUserId(userId);
              setView(v);
            }}
            onBack={() => setView(AppView.HOME)}
            openComposer={communityComposerOpen}
            onComposerClose={() => setCommunityComposerOpen(false)}
            initialCommentsPostId={notifPostId}
            onInitialCommentsClose={() => setNotifPostId(null)}
          />
        )}

        {view === AppView.COMMUNITY_PROFILE && communityProfileUserId && (
          <CommunityProfileView
            userId={communityProfileUserId}
            onBack={() => setView(AppView.FEED)}
            onNavigate={setView}
          />
        )}

        {view === AppView.COMMUNITY_SEARCH && (
          <CommunitySearch
            onBack={() => setView(AppView.FEED)}
            onNavigate={(v: AppView, userId?: string) => {
              if (v === AppView.COMMUNITY_PROFILE && userId) setCommunityProfileUserId(userId);
              setView(v);
            }}
          />
        )}

        {view === AppView.NOTIFICATION_CENTER && (
          <NotificationCenter
            onBack={() => setView(AppView.FEED)}
            onNavigate={setView}
            onOpenPost={(postId) => { setNotifPostId(postId); setView(AppView.FEED); }}
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


        {/* Telemedicine — Real Scheduling Flow */}
        {view === AppView.AGENDAR_CONSULTA && (
          <AgendarConsulta
            onBack={() => setView(AppView.PROFILE)}
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
            onOpenChat={setOpenChat}
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

    {/* Chat pós-consulta — renderizado fora do Layout para persistir ao trocar de view */}
    {openChat && (
      <PatientChatModal
        consultationId={openChat.consultationId}
        doctorName={openChat.doctorName}
        onClose={() => setOpenChat(null)}
      />
    )}
  </>
  );
};

export default App;
