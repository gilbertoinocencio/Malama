import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n';
import { GamificationService } from '../services/gamificationService';
import { StatsService } from '../services/statsService';
import { PlanService, QuarterlyPlanData } from '../services/planService';
import { supabase } from '../services/supabase';

interface PlanProgressShareProps {
  onBack: () => void;
}

interface HeatmapDay {
  date: string;
  score: number;
}

export const PlanProgressShare: React.FC<PlanProgressShareProps> = ({ onBack }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { t } = useLanguage();

  const [flowScore, setFlowScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalFlowDays, setTotalFlowDays] = useState(0);
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [quarterProgress, setQuarterProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  const qp = t.quarterlyPlan;

  useEffect(() => {
    if (user) loadRealData();
  }, [user]);

  const loadRealData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1) Today's flow score
      const stats = await StatsService.getDailyStats(user.id);
      setFlowScore(stats.flowScore);

      // 2) Gamification: streak & flow days
      const gamification = await GamificationService.updateStats(user.id);
      if (gamification) {
        setStreak(gamification.currentStreak);
        setTotalFlowDays(gamification.totalFlowDays);
      }

      // 3) Heatmap: last 28 days of flow_stats
      const since = new Date();
      since.setDate(since.getDate() - 28);
      const { data: flowData } = await supabase
        .from('flow_stats')
        .select('date, flow_score')
        .eq('user_id', user.id)
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true });

      setHeatmapData(
        (flowData || []).map((r: any) => ({ date: r.date, score: r.flow_score }))
      );

      // 4) Quarterly plan progress
      const plan = await PlanService.getActivePlan(user.id);
      if (plan?.start_date && plan?.end_date) {
        const start = new Date(plan.start_date).getTime();
        const end = new Date(plan.end_date).getTime();
        const now = Date.now();
        const progress = Math.min(Math.max(((now - start) / (end - start)) * 100, 0), 100);
        setQuarterProgress(Math.round(progress));
      }
    } catch (e) {
      console.error('Error loading share data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (cardRef.current) {
      await new Promise(r => setTimeout(r, 100));
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#101e22'
      });
      const link = document.createElement('a');
      link.download = `nura-progress-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  // Build 28-day heatmap grid (4 weeks × 7 days)
  const renderHeatmapDots = () => {
    const totalDots = 28;
    const dots = [];
    const today = new Date();

    for (let i = 0; i < totalDots; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - (totalDots - 1 - i));
      const dateStr = targetDate.toISOString().split('T')[0];
      const entry = heatmapData.find(d => d.date === dateStr);
      const score = entry?.score || 0;

      let dotClass = 'w-2.5 h-2.5 rounded-full ';
      if (score >= 85) dotClass += 'bg-primary shadow-[0_0_8px_rgba(10,144,189,0.6)]';
      else if (score >= 60) dotClass += 'bg-primary/60';
      else if (score >= 30) dotClass += 'bg-primary/30';
      else dotClass += 'bg-[#1a2c32] border border-white/10';

      dots.push(<div key={i} className={dotClass}></div>);
    }
    return dots;
  };

  // Dynamic month label
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const capitalizedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);

  return (
    <div className="fixed inset-0 z-50 bg-[#05080a] flex justify-center items-center overflow-y-auto animate-fade-in font-display">

      {/* Phone Container / Capture Target */}
      <div
        ref={cardRef}
        className="relative w-full max-w-[430px] h-full min-h-screen flex flex-col bg-[#101e22] overflow-hidden shadow-2xl"
      >
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(10, 144, 189, 0.15) 0%, rgba(16, 30, 34, 0) 70%)' }}></div>

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={onBack}
            className="flex items-center justify-center size-10 rounded-full bg-black/20 text-white backdrop-blur-md hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col w-full h-full pb-24">

          {/* Header */}
          <header className="pt-12 pb-2 px-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-lg">water_drop</span>
              <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">{qp.myFlow}</p>
            </div>
            <h1 className="text-white text-3xl font-bold tracking-tight leading-tight">
              {qp.summaryOf}<br />{capitalizedMonth}
            </h1>
          </header>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Consistency Heatmap */}
              <section className="px-6 py-4">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-gray-400 text-xs font-medium">{qp.flowConsistency}</span>
                    <span className="text-white text-xs font-bold bg-primary/20 px-2 py-0.5 rounded-full text-primary">30 {qp.days}</span>
                  </div>
                  <div className="bg-[#1a2c32]/60 backdrop-blur-md border border-white/5 p-4 rounded-xl">
                    <div className="grid grid-cols-7 gap-x-2 gap-y-3 justify-items-center">
                      {renderHeatmapDots()}
                    </div>
                  </div>
                </div>
              </section>

              {/* Stats Grid */}
              <section className="px-6 py-4">
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar">
                  {/* Flow Score */}
                  <div className="flex-1 min-w-[100px] bg-[#1a2c32]/60 backdrop-blur-md border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-1 text-center">
                    <span className="material-symbols-outlined text-primary text-2xl mb-1">monitoring</span>
                    <p className="text-2xl font-bold text-white leading-none">{flowScore}%</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{qp.flow}</p>
                  </div>
                  {/* Streak */}
                  <div className="flex-1 min-w-[100px] bg-[#1a2c32]/60 backdrop-blur-md border border-primary/30 rounded-xl p-4 flex flex-col items-center justify-center gap-1 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5"></div>
                    <span className="material-symbols-outlined text-[#0bda57] text-2xl mb-1">local_fire_department</span>
                    <p className="text-2xl font-bold text-white leading-none">{streak}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{qp.streak}</p>
                  </div>
                  {/* Flow Days */}
                  <div className="flex-1 min-w-[100px] bg-[#1a2c32]/60 backdrop-blur-md border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-1 text-center">
                    <span className="material-symbols-outlined text-blue-400 text-2xl mb-1">calendar_today</span>
                    <p className="text-2xl font-bold text-white leading-none">{totalFlowDays}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{qp.days}</p>
                  </div>
                </div>
              </section>

              {/* Quarterly Goal */}
              <section className="px-6 pb-8">
                <div className="bg-[#1a2c32]/60 backdrop-blur-md border border-white/5 p-5 rounded-xl flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm font-semibold">{qp.quarterlyGoal}</span>
                    <span className="text-primary text-sm font-bold">{quarterProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-[#06b6d4] rounded-full shadow-[0_0_10px_rgba(10,144,189,0.5)] transition-all duration-700"
                      style={{ width: `${quarterProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{qp.onTrack}</p>
                </div>
              </section>
            </>
          )}

          {/* Footer Brand */}
          <div className="mt-auto pb-8 pt-4 flex flex-col items-center justify-center gap-2 opacity-60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <span className="text-white font-bold tracking-widest text-sm">NURA</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400">{qp.feedTheFlow}</p>
          </div>

        </div>
      </div>

      {/* Share Button */}
      <div className="absolute bottom-6 left-0 w-full px-6 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-[430px] pointer-events-auto">
          <button
            onClick={handleShare}
            className="w-full bg-white text-[#101e22] font-bold text-base py-4 rounded-xl shadow-[0_4px_20px_rgba(255,255,255,0.2)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 group"
          >
            <span className="material-symbols-outlined group-hover:-translate-y-0.5 transition-transform">ios_share</span>
            {qp.shareProgress}
          </button>
        </div>
      </div>

    </div>
  );
};