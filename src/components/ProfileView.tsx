import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Copy, Check, TrendingUp, Clock, DollarSign, HelpCircle } from 'lucide-react';
import { BodyScanner } from './BodyScanner';
import { BodyProgressTimeline } from './BodyProgressTimeline';
import { MetricsChart } from './MetricsChart';
import { WeightLogModal } from './WeightLogModal';
import { FAQSection } from './support/FAQSection';
import { ContactSupportModal } from './support/ContactSupportModal';
import { AppView } from '../types';
import { USER_AVATAR, LANGUAGES } from '../constants';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { GamificationService, GamificationStats } from '../services/gamificationService';
import { MealService } from '../services/mealService';
import { supabase } from '../services/supabase';
import type { InfluencerRecord } from '../contexts/AuthContext';

// =====================================================
// InfluencerCard — métricas e link de indicação
// =====================================================
const InfluencerCard: React.FC<{ influencerRecord: InfluencerRecord; influencerLink: string }> = ({
  influencerRecord,
  influencerLink,
}) => {
  const [copied, setCopied] = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fmtCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(influencerLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPass.length < 8) { setPassMsg({ type: 'error', text: 'Mínimo 8 caracteres.' }); return; }
    if (newPass !== confirmPass) { setPassMsg({ type: 'error', text: 'As senhas não coincidem.' }); return; }
    setSavingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setSavingPass(false);
    if (error) {
      setPassMsg({ type: 'error', text: error.message });
    } else {
      setPassMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
      setNewPass(''); setConfirmPass(''); setShowChangePass(false);
    }
  };

  return (
    <section className="w-full px-6 mb-6 space-y-3">
      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <TrendingUp className="w-5 h-5 text-[#2ECC71]" />, label: 'Indicações', value: String(influencerRecord.total_referrals ?? 0) },
          { icon: <Clock className="w-5 h-5 text-[#2ECC71]" />, label: 'Pendente', value: fmtCurrency(influencerRecord.pending_amount ?? 0) },
          { icon: <DollarSign className="w-5 h-5 text-[#2ECC71]" />, label: 'Total ganho', value: fmtCurrency(influencerRecord.total_earned ?? 0) },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-white dark:bg-[#1a2630] border border-nura-border dark:border-gray-800 rounded-xl p-4 text-center">
            <div className="flex justify-center mb-2">{icon}</div>
            <p className="text-nura-main dark:text-white font-bold text-base leading-tight">{value}</p>
            <p className="text-nura-muted dark:text-gray-400 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Link de indicação */}
      <div className="bg-white dark:bg-[#1a2630] border border-nura-border dark:border-gray-800 rounded-2xl p-5">
        <p className="text-sm font-bold text-nura-main dark:text-white mb-1">Seu link de indicação</p>
        <p className="text-xs text-nura-muted dark:text-gray-400 mb-3">
          Compartilhe este link. A cada novo usuário cadastrado, você ganha{' '}
          <span className="text-[#2ECC71] font-semibold">{fmtCurrency(influencerRecord.commission_per_referral ?? 0)}</span>.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 bg-nura-bg dark:bg-white/5 border border-nura-border dark:border-white/10 rounded-lg px-3 py-2 text-xs text-nura-muted dark:text-gray-300 truncate">
            {influencerLink}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 border border-nura-border dark:border-white/10 rounded-lg text-xs text-nura-muted dark:text-gray-300 hover:bg-nura-bg dark:hover:bg-white/5 transition whitespace-nowrap"
          >
            {copied ? <Check className="w-4 h-4 text-[#2ECC71]" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Alterar senha */}
      <div className="bg-white dark:bg-[#1a2630] border border-nura-border dark:border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-nura-main dark:text-white">Alterar senha</p>
          <button
            onClick={() => setShowChangePass(v => !v)}
            className="text-[#2ECC71] text-sm hover:underline"
          >
            {showChangePass ? 'Cancelar' : 'Alterar'}
          </button>
        </div>

        {showChangePass && (
          <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Nova senha (mínimo 8 caracteres)"
                className="w-full pr-10 px-3 py-2.5 bg-nura-bg dark:bg-white/5 border border-nura-border dark:border-white/10 rounded-lg text-nura-main dark:text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
              />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-nura-muted dark:text-gray-400">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              placeholder="Confirmar nova senha"
              className="w-full px-3 py-2.5 bg-nura-bg dark:bg-white/5 border border-nura-border dark:border-white/10 rounded-lg text-nura-main dark:text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent outline-none"
            />
            {passMsg && (
              <p className={`text-sm px-3 py-2 rounded-lg border ${passMsg.type === 'success'
                ? 'text-[#2ECC71] bg-green-400/10 border-green-400/20'
                : 'text-red-400 bg-red-400/10 border-red-400/20'
                }`}>{passMsg.text}</p>
            )}
            <button
              type="submit" disabled={savingPass}
              className="w-full py-2.5 bg-[#2ECC71] hover:bg-[#27ae60] text-white font-semibold rounded-xl transition disabled:opacity-50"
            >
              {savingPass ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

interface ProfileViewProps {
  onNavClick: (view: AppView) => void;
  onSettingsClick: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

interface HeatmapDay {
  date: string;
  score: number;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onNavClick,
  onSettingsClick,
  isDarkMode,
  onToggleTheme
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { profile, user, signOut, influencerRecord } = useAuth();

  const influencerLink = influencerRecord
    ? `${window.location.origin}/i/${influencerRecord.referral_token}`
    : '';

  const [showBodyScanner, setShowBodyScanner] = useState(false);
  const [showBodyProgress, setShowBodyProgress] = useState(false);
  const [showMetricsChart, setShowMetricsChart] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [gamification, setGamification] = useState<GamificationStats | null>(null);
  const [totalMeals, setTotalMeals] = useState(0);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  // Load stats when user OR profile changes
  useEffect(() => {
    if (user) loadProfileStats();
  }, [user, profile]);

  // Avatar upload handler - stores as base64 in profile directly
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(language === 'pt' ? 'Por favor, selecione uma imagem válida.' : 'Please select a valid image.');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert(language === 'pt' ? 'A imagem deve ter no máximo 2MB.' : 'Image must be at most 2MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      console.log('[ProfileView] Uploading avatar...', file.name);

      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;

        console.log('[ProfileView] Image converted to base64, updating profile...');

        // Update profile with new avatar URL (base64 data URI)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: base64 })
          .eq('id', user.id);

        if (updateError) {
          console.error('[ProfileView] Profile update error:', updateError);
          alert(language === 'pt' ? 'Erro ao atualizar perfil.' : 'Error updating profile.');
        } else {
          console.log('[ProfileView] Profile updated with new avatar');
          // Update local profile state immediately
          window.location.reload();
        }
        setUploadingAvatar(false);
      };
      reader.onerror = () => {
        console.error('[ProfileView] Failed to read file');
        alert(language === 'pt' ? 'Erro ao processar imagem.' : 'Error processing image.');
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('[ProfileView] Avatar upload error:', error);
      alert(language === 'pt' ? 'Erro ao processar imagem.' : 'Error processing image.');
      setUploadingAvatar(false);
    }
  };

  const loadProfileStats = async () => {
    if (!user) {
      console.log('[ProfileView] No user, skipping stats load');
      return;
    }
    console.log('[ProfileView] Loading stats for user:', user.id);
    console.log('[ProfileView] Profile data:', profile);
    setLoading(true);
    try {
      // 1) Gamification stats (streak, flow days, level)
      console.log('[ProfileView] Fetching gamification stats...');
      const stats = await GamificationService.updateStats(user.id);
      console.log('[ProfileView] Gamification stats received:', stats);
      if (stats) {
        setGamification({
          currentStreak: stats.currentStreak || 0,
          totalFlowDays: stats.totalFlowDays || 0,
          level: stats.level || 'seed',
        });
      } else {
        // Initialize with empty stats if none exist
        console.log('[ProfileView] No gamification stats, using defaults');
        setGamification({
          currentStreak: 0,
          totalFlowDays: 0,
          level: 'seed',
        });
      }

      // 2) Total meals ever logged
      console.log('[ProfileView] Fetching total meals...');
      const { count } = await supabase
        .from('meals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      console.log('[ProfileView] Total meals:', count);
      setTotalMeals(count || 0);

      // 3) Heatmap: last 84 days (12 weeks)
      console.log('[ProfileView] Fetching heatmap data...');
      const since = new Date();
      since.setDate(since.getDate() - 84);
      const { data: flowData } = await supabase
        .from('flow_stats')
        .select('date, flow_score')
        .eq('user_id', user.id)
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true });

      console.log('[ProfileView] Heatmap data received:', flowData);
      setHeatmapData(
        (flowData || []).map((r: any) => ({ date: r.date, score: r.flow_score || 0 }))
      );
    } catch (e) {
      console.error('[ProfileView] Error loading profile stats:', e);
      // Set default values on error
      setGamification({
        currentStreak: 0,
        totalFlowDays: 0,
        level: 'seed',
      });
      setTotalMeals(0);
      setHeatmapData([]);
    } finally {
      setLoading(false);
      console.log('[ProfileView] Stats loading complete');
    }
  };

  // Calculate consistency: flow days / total tracked days (with NaN protection)
  const consistencyPercent = React.useMemo(() => {
    if (!gamification || !gamification.totalFlowDays) return 0;
    const totalDays = Math.max(heatmapData.length, 1);
    const percent = Math.round((gamification.totalFlowDays / totalDays) * 100);
    return isNaN(percent) ? 0 : Math.min(percent, 100);
  }, [gamification, heatmapData.length]);

  // Real heatmap from flow_stats (12 cols × 7 rows)
  const renderHeatmap = () => {
    const cols = 12;
    const rows = 7;
    const totalCells = cols * rows;
    const today = new Date();
    const grid = [];

    for (let c = 0; c < cols; c++) {
      const colCells = [];
      for (let r = 0; r < rows; r++) {
        const dayIndex = c * rows + r;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - (totalCells - 1 - dayIndex));
        const dateStr = targetDate.toISOString().split('T')[0];

        const entry = heatmapData.find(d => d.date === dateStr);
        const score = entry?.score || 0;

        let intensity = 'bg-nura-pastel-orange dark:bg-gray-700';
        if (score >= 85) intensity = 'bg-nura-petrol dark:bg-primary';
        else if (score >= 70) intensity = 'bg-nura-petrol/80 dark:bg-primary/80';
        else if (score >= 50) intensity = 'bg-nura-petrol/60 dark:bg-primary/60';
        else if (score >= 30) intensity = 'bg-nura-petrol/40 dark:bg-primary/40';
        else if (score > 0) intensity = 'bg-nura-petrol/20 dark:bg-primary/20';

        colCells.push(
          <div key={`${c}-${r}`} className={`w-3 h-3 rounded-[2px] ${intensity}`}></div>
        );
      }
      grid.push(
        <div key={c} className="flex flex-col gap-1.5">
          {colCells}
        </div>
      );
    }
    return grid;
  };

  // Achievements based on real gamification data
  const getAchievements = () => {
    const achievements = [];

    if (gamification) {
      if (gamification.currentStreak >= 3) {
        achievements.push({
          icon: 'local_fire_department',
          color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
          title: `🔥 ${gamification.currentStreak}-Day Streak`,
          subtitle: `${gamification.currentStreak} ${t.quarterlyPlan.days} in Flow`,
        });
      }

      if (gamification.totalFlowDays >= 7) {
        achievements.push({
          icon: 'eco',
          color: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
          title: 'Green Flow',
          subtitle: `${gamification.totalFlowDays} ${t.profile.flowDays}`,
        });
      }

      const levelMap: Record<string, { icon: string; color: string; title: string }> = {
        seed: { icon: 'spa', color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400', title: '🌱 Seed' },
        root: { icon: 'nest_eco_leaf', color: 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400', title: '🌿 Root' },
        stem: { icon: 'forest', color: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400', title: '🌾 Stem' },
        flower: { icon: 'local_florist', color: 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400', title: '🌸 Flower' },
        fruit: { icon: 'nutrition', color: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400', title: '🍎 Fruit' },
      };

      const lvl = levelMap[gamification.level] || levelMap.seed;
      achievements.push({
        icon: lvl.icon,
        color: lvl.color,
        title: `Level: ${lvl.title}`,
        subtitle: `${gamification.totalFlowDays} ${t.profile.flowDays}`,
      });
    }

    if (totalMeals >= 10) {
      achievements.push({
        icon: 'restaurant_menu',
        color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        title: 'Meal Master',
        subtitle: `${totalMeals} ${t.profile.meals}`,
      });
    }

    return achievements;
  };

  const achievements = getAchievements();

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden bg-nura-bg dark:bg-background-dark font-display text-nura-main dark:text-white animate-fade-in transition-colors duration-300">

      {/* Header */}
      <header className="flex items-center justify-between p-4 pt-12 pb-2">
        <h2 className="text-3xl font-serif italic text-nura-main dark:text-white flex-1">{t.profile.title}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleTheme}
            className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-nura-main dark:text-white" style={{ fontSize: '24px' }}>
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <button
            onClick={onSettingsClick}
            className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-nura-main dark:text-white" style={{ fontSize: '24px' }}>settings</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32">
        {/* Profile Info */}
        <section className="flex flex-col items-center pt-6 pb-8 px-4">
          <div className="relative mb-4 group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
            <div
              className={`bg-center bg-no-repeat bg-cover aspect-square rounded-full h-28 w-28 ring-4 ring-white dark:ring-[#1a2630] shadow-sm transition-all ${uploadingAvatar ? 'opacity-50' : 'hover:opacity-90'}`}
              style={{ backgroundImage: `url("${profile?.avatar_url || USER_AVATAR}")` }}
            >
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nura-petrol dark:border-primary"></div>
                </div>
              )}
            </div>
            {/* Camera overlay on hover */}
            {!uploadingAvatar && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
              </div>
            )}
            <div className="absolute bottom-1 right-1 bg-nura-petrol dark:bg-primary text-white rounded-full p-1 border-2 border-white dark:border-[#101a22]">
              <span className="material-symbols-outlined block text-[16px] leading-none">edit</span>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <h1 className="text-nura-main dark:text-white text-2xl font-bold leading-tight tracking-tight text-center">
            {profile?.display_name || profile?.email || t.dashboard.defaultUser}
          </h1>
          <p className="text-nura-muted dark:text-gray-400 text-sm font-medium mt-1">
            {profile?.goal ? t.profile.goals[profile.goal as keyof typeof t.profile.goals] : t.profile.defineProfile}
          </p>
        </section>

        {/* Language Selector */}
        <section className="w-full px-6 mb-6">
          <div className="bg-white dark:bg-[#1a2630] rounded-2xl p-4 shadow-sm border border-nura-border dark:border-gray-800 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-nura-petrol dark:text-primary">translate</span>
                <span className="text-sm font-bold text-nura-main dark:text-white">{t.profile.language}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code as 'en' | 'pt' | 'es')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${language === lang.code
                    ? 'bg-nura-petrol dark:bg-primary text-white shadow-md'
                    : 'bg-nura-bg dark:bg-white/5 text-nura-muted dark:text-gray-400 hover:bg-nura-petrol/10 dark:hover:bg-primary/10'
                    }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Heatmap Section */}
        <section className="w-full px-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-nura-main dark:text-white text-lg font-bold leading-tight">{t.profile.flowStatus}</h3>
            <span className="text-nura-petrol dark:text-primary text-xs font-semibold uppercase tracking-wider">{t.profile.last3Months}</span>
          </div>
          <div className="bg-white dark:bg-[#1a2630] p-5 rounded-2xl shadow-sm border border-nura-border dark:border-gray-800 overflow-x-auto no-scrollbar transition-colors">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-nura-petrol dark:border-primary"></div>
              </div>
            ) : heatmapData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="material-symbols-outlined text-nura-muted dark:text-gray-500 mb-2" style={{ fontSize: '48px' }}>calendar_month</span>
                <p className="text-sm font-medium text-nura-main dark:text-white mb-1">{t.profile.noDataYet || 'Nenhum dado ainda'}</p>
                <p className="text-xs text-nura-muted dark:text-gray-400 max-w-[200px]">
                  {language === 'pt'
                    ? 'Registre suas refeições para ver seu progresso aqui.'
                    : 'Log your meals to see your progress here.'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex gap-1 min-w-fit">
                  {/* Grid */}
                  <div className="flex gap-1.5 h-[100px]">
                    {renderHeatmap()}
                  </div>
                </div>
                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-4">
                  <span className="text-[10px] text-nura-muted dark:text-gray-400 font-medium">{t.profile.low}</span>
                  <div className="w-2 h-2 rounded-[1px] bg-nura-pastel-orange dark:bg-gray-700"></div>
                  <div className="w-2 h-2 rounded-[1px] bg-nura-petrol/40 dark:bg-primary/40"></div>
                  <div className="w-2 h-2 rounded-[1px] bg-nura-petrol dark:bg-primary"></div>
                  <span className="text-[10px] text-nura-muted dark:text-gray-400 font-medium">{t.profile.high}</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Stats Section */}
        <section className="w-full px-6 mb-8">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-[#1a2630] rounded-xl shadow-sm border border-nura-border dark:border-gray-800 h-28 transition-colors">
              <span className="material-symbols-outlined text-nura-petrol dark:text-primary mb-2" style={{ fontSize: '24px' }}>calendar_today</span>
              <p className="text-2xl font-bold text-nura-main dark:text-white leading-none">
                {loading ? '—' : gamification?.totalFlowDays || 0}
              </p>
              <p className="text-xs text-center text-nura-muted dark:text-gray-400 mt-1 font-medium">{t.profile.flowDays}</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-[#1a2630] rounded-xl shadow-sm border border-nura-border dark:border-gray-800 h-28 transition-colors">
              <span className="material-symbols-outlined text-nura-petrol dark:text-primary mb-2" style={{ fontSize: '24px' }}>restaurant_menu</span>
              <p className="text-2xl font-bold text-nura-main dark:text-white leading-none">
                {loading ? '—' : totalMeals}
              </p>
              <p className="text-xs text-center text-nura-muted dark:text-gray-400 mt-1 font-medium">{t.profile.meals}</p>
            </div>
            <div
              onClick={() => onNavClick(AppView.QUARTERLY_ANALYSIS)}
              className="flex flex-col items-center justify-center p-4 bg-white dark:bg-[#1a2630] rounded-xl shadow-sm border border-nura-border dark:border-gray-800 h-28 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors relative overflow-hidden group"
            >
              <div className="absolute top-1 right-1">
                <span className="material-symbols-outlined text-gray-300 text-xs">arrow_outward</span>
              </div>
              <span className="material-symbols-outlined text-nura-petrol dark:text-primary mb-2" style={{ fontSize: '24px' }}>trending_up</span>
              <p className="text-2xl font-bold text-nura-main dark:text-white leading-none">
                {loading ? '—' : `${consistencyPercent}%`}
              </p>
              <p className="text-xs text-center text-nura-muted dark:text-gray-400 mt-1 font-medium">{t.profile.consistency}</p>
            </div>
          </div>
        </section>

        {/* Quick Actions / Integration */}
        <section className="w-full px-6 mb-8 flex flex-col gap-3">
          <div
            onClick={() => onNavClick(AppView.DAILY_JOURNAL)}
            className="w-full bg-gradient-to-r from-nura-petrol/10 to-transparent dark:from-primary/20 dark:to-transparent rounded-2xl p-4 flex items-center justify-between border border-nura-petrol/20 dark:border-primary/20 cursor-pointer hover:bg-nura-petrol/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-nura-petrol dark:text-primary shadow-sm border border-nura-border dark:border-transparent">
                <span className="material-symbols-outlined filled" style={{ fontVariationSettings: "'FILL' 1" }}>book</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-nura-main dark:text-white">Diário Pessoal</span>
                <span className="text-xs text-nura-muted dark:text-gray-400">Suas anotações, evoluções e reflexões</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-nura-petrol dark:text-primary group-hover:translate-x-1 transition-transform">chevron_right</span>
          </div>

          <div
            onClick={() => onNavClick(AppView.INTEGRATIONS)}
            className="w-full bg-gradient-to-r from-nura-petrol/5 to-transparent dark:from-primary/20 dark:to-transparent rounded-2xl p-4 flex items-center justify-between border border-nura-petrol/10 dark:border-primary/20 cursor-pointer hover:bg-nura-petrol/5 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-nura-petrol dark:text-primary shadow-sm border border-nura-border dark:border-transparent">
                <span className="material-symbols-outlined filled" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-nura-main dark:text-white">{t.profile.integrations}</span>
                <span className="text-xs text-nura-muted dark:text-gray-400">Strava, Apple Health, Garmin...</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-nura-petrol dark:text-primary group-hover:translate-x-1 transition-transform">chevron_right</span>
          </div>

          {/* Teleconsulta */}
          <div
            onClick={() => onNavClick(AppView.AGENDAR_CONSULTA)}
            className="w-full bg-gradient-to-r from-emerald-500/10 to-transparent dark:from-emerald-500/20 dark:to-transparent rounded-2xl p-4 flex items-center justify-between border border-emerald-500/20 dark:border-emerald-500/20 cursor-pointer hover:bg-emerald-500/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm border border-nura-border dark:border-transparent">
                <span className="material-symbols-outlined">videocam</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-nura-main dark:text-white">Teleconsulta médica</span>
                <span className="text-xs text-nura-muted dark:text-gray-400">Agendar consulta com especialista</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">chevron_right</span>
          </div>

          {/* Minhas Consultas */}
          <div
            onClick={() => onNavClick(AppView.MINHAS_CONSULTAS)}
            className="w-full bg-gradient-to-r from-nura-petrol/5 to-transparent dark:from-primary/20 dark:to-transparent rounded-2xl p-4 flex items-center justify-between border border-nura-petrol/10 dark:border-primary/20 cursor-pointer hover:bg-nura-petrol/5 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-nura-petrol dark:text-primary shadow-sm border border-nura-border dark:border-transparent">
                <span className="material-symbols-outlined">event_note</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-nura-main dark:text-white">Minhas consultas</span>
                <span className="text-xs text-nura-muted dark:text-gray-400">Histórico, receitas e avaliações</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-nura-petrol dark:text-primary group-hover:translate-x-1 transition-transform">chevron_right</span>
          </div>
        </section>

        {/* GLP-1 Program Banner - Simplified: just shows status, no navigation */}
        {profile?.glp1_mode && (
          <section className="w-full px-6 mb-8">
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 border border-green-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-4">
                <div className="size-14 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">💊</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-nura-main dark:text-white font-bold text-sm">Programa GLP-1</h3>
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full">Ativo</span>
                  </div>
                  <p className="text-nura-muted dark:text-gray-400 text-xs leading-relaxed">
                    {profile.glp1_medication || 'GLP-1'} — Veja todos os detalhes na aba <span className="font-semibold text-green-600 dark:text-green-400">Início</span>
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Support Section */}
        <section className="w-full px-6 mb-8">
          <div
            onClick={() => setShowSupportModal(true)}
            className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 border border-blue-500/20 rounded-2xl p-4 cursor-pointer hover:border-blue-500/40 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="size-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
                <HelpCircle className="w-7 h-7 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-nura-main dark:text-white font-bold text-sm mb-1">Central de Ajuda</h3>
                <p className="text-nura-muted dark:text-gray-400 text-xs leading-relaxed">FAQ, tutoriais e suporte ao vivo</p>
              </div>
              <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 group-hover:translate-x-1 transition-transform">chevron_right</span>
            </div>
          </div>
        </section>

        {/* Corpo & Métricas */}
        <section className="w-full px-6 mb-8">
          <h3 className="text-nura-main dark:text-white text-base font-bold mb-3">Corpo & Métricas</h3>
          <div className="bg-white dark:bg-[#1a2630] rounded-2xl border border-nura-border dark:border-gray-800 overflow-hidden shadow-sm">

            {/* Body Scan row */}
            <div
              onClick={() => setShowBodyProgress(true)}
              className="flex items-center gap-4 p-4 border-b border-nura-border dark:border-gray-800 cursor-pointer hover:bg-nura-bg dark:hover:bg-white/5 transition-colors group"
            >
              <div className="size-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.12)' }}>
                <span className="material-symbols-outlined text-[22px]" style={{ color: '#8b5cf6' }}>photo_camera</span>
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold text-nura-main dark:text-white block">Body Scan AI</span>
                <span className="text-xs text-nura-muted dark:text-gray-400">Fotos + análise de composição corporal</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowBodyScanner(true); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
                  style={{ background: '#8b5cf6' }}
                >
                  <span className="material-symbols-outlined text-sm leading-none">add_photo_alternate</span>
                </button>
                <span className="material-symbols-outlined text-nura-muted dark:text-gray-500 group-hover:translate-x-0.5 transition-transform">chevron_right</span>
              </div>
            </div>

            {/* Weight log row */}
            <div
              onClick={() => setShowWeightModal(true)}
              className="flex items-center gap-4 p-4 border-b border-nura-border dark:border-gray-800 cursor-pointer hover:bg-nura-bg dark:hover:bg-white/5 transition-colors group"
            >
              <div className="size-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(26,154,175,0.12)' }}>
                <span className="material-symbols-outlined text-[22px]" style={{ color: '#1a9aaf' }}>monitor_weight</span>
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold text-nura-main dark:text-white block">Registrar Peso</span>
                <span className="text-xs text-nura-muted dark:text-gray-400">Histórico de peso com tendência</span>
              </div>
              <span className="material-symbols-outlined text-nura-muted dark:text-gray-500 group-hover:translate-x-0.5 transition-transform">chevron_right</span>
            </div>

            {/* Metrics chart row */}
            <div
              onClick={() => setShowMetricsChart(true)}
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-nura-bg dark:hover:bg-white/5 transition-colors group"
            >
              <div className="size-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.12)' }}>
                <span className="material-symbols-outlined text-[22px]" style={{ color: '#10b981' }}>insights</span>
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold text-nura-main dark:text-white block">Gráficos de Evolução</span>
                <span className="text-xs text-nura-muted dark:text-gray-400">Peso, gordura, músculo e medidas</span>
              </div>
              <span className="material-symbols-outlined text-nura-muted dark:text-gray-500 group-hover:translate-x-0.5 transition-transform">chevron_right</span>
            </div>
          </div>
        </section>

        {/* Achievements Section */}
        <section className="w-full px-6 mb-8">
          <h3 className="text-nura-main dark:text-white text-lg font-bold leading-tight mb-4">{t.profile.recentAchievements}</h3>
          <div className="flex flex-col gap-3">
            {achievements.length === 0 ? (
              <div className="text-center py-8 text-nura-muted dark:text-gray-500 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-3xl">emoji_events</span>
                <span className="text-sm">{t.quarterlyPlan.noData}</span>
              </div>
            ) : (
              achievements.map((ach, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-white dark:bg-[#1a2630] rounded-xl border border-nura-border dark:border-gray-800 transition-colors shadow-sm dark:shadow-none">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full ${ach.color}`}>
                    <span className="material-symbols-outlined">{ach.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-nura-main dark:text-white">{ach.title}</h4>
                    <p className="text-sm text-nura-muted dark:text-gray-400">{ach.subtitle}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Influencer Card — visível apenas para usuários influenciadores */}
        {influencerRecord && (
          <InfluencerCard influencerRecord={influencerRecord} influencerLink={influencerLink} />
        )}

        {/* Sign Out */}
        <section className="w-full px-6 pb-4">
          <button
            onClick={() => signOut()}
            className="w-full py-3 rounded-xl border border-red-200 dark:border-red-900/30 text-red-500 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            {t.profile.signOut}
          </button>
        </section>
      </main>

      {/* Body Scanner Modal */}
      {showBodyScanner && (
        <BodyScanner
          onClose={() => setShowBodyScanner(false)}
          onScanComplete={() => {
            setShowBodyScanner(false);
            setShowBodyProgress(true);
          }}
        />
      )}

      {/* Body Progress Timeline Modal */}
      {showBodyProgress && (
        <BodyProgressTimeline
          onClose={() => setShowBodyProgress(false)}
          onNewScan={() => {
            setShowBodyProgress(false);
            setShowBodyScanner(true);
          }}
        />
      )}

      {/* Metrics Chart Modal */}
      {showMetricsChart && (
        <MetricsChart
          onClose={() => setShowMetricsChart(false)}
          onLogWeight={() => {
            setShowMetricsChart(false);
            setShowWeightModal(true);
          }}
        />
      )}

      {/* Weight Log Modal */}
      {showWeightModal && (
        <WeightLogModal
          onClose={() => setShowWeightModal(false)}
        />
      )}

      {/* Support Modal */}
      {showSupportModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSupportModal(false)} />
          <motion.div
            className="relative w-full max-w-2xl bg-nura-bg dark:bg-background-dark rounded-t-3xl max-h-[90vh] overflow-y-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="sticky top-0 bg-nura-bg dark:bg-background-dark pt-3 pb-2 px-6 border-b border-nura-border dark:border-white/10">
              <div className="w-10 h-1 bg-nura-border dark:bg-slate-600 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-nura-main dark:text-white">Central de Ajuda</h3>
                <button
                  onClick={() => setShowSupportModal(false)}
                  className="p-2 rounded-lg hover:bg-nura-main/5 dark:hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-nura-muted dark:text-slate-400">close</span>
                </button>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="p-6">
              <FAQSection onContactSupport={() => {
                setShowSupportModal(false);
                setShowContactModal(true);
              }} />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Contact Support Modal */}
      <ContactSupportModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSuccess={() => setShowContactModal(false)}
      />
    </div>
  );
};