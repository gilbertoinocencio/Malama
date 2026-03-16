import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ProfileService, ProfileUpdates } from '../services/profileService';
import { useLanguage } from '../i18n';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileConfigProps {
  onBack: () => void;
  onFinish: () => void;
  isOnboarding?: boolean;
}

export const ProfileConfig: React.FC<ProfileConfigProps> = ({ onBack, onFinish, isOnboarding = false }) => {
  const { profile, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [biotype, setBiotype] = useState<'ecto' | 'meso' | 'endo'>('meso');
  const [goal, setGoal] = useState<'aesthetic' | 'health' | 'performance'>('aesthetic');
  const [activityLevel, setActivityLevel] = useState(2);

  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  const pc = t.profileConfig;
  const common = t.general;

  useEffect(() => {
    if (profile) {
      if (profile.biotype) setBiotype(profile.biotype);
      if (profile.goal) setGoal(profile.goal);
      if (profile.activity_level) {
        setActivityLevel(
          profile.activity_level === 'sedentary' ? 1 :
            profile.activity_level === 'intense' ? 3 : 2
        );
      }
      if (profile.weight) setWeight(profile.weight.toString());
      if (profile.height) setHeight(profile.height.toString());
      if (profile.age) setAge(profile.age.toString());
      if (profile.gender) setGender(profile.gender as 'male' | 'female');
    }
  }, [profile]);

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else handleFinish();
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
    else onBack();
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const activityMap: Record<number, 'sedentary' | 'moderate' | 'intense'> = {
        1: 'sedentary',
        2: 'moderate',
        3: 'intense'
      };

      const selectedActivity = activityMap[activityLevel];
      const w = parseFloat(weight) || 70;
      const h = parseFloat(height) || 175;
      const a = parseFloat(age) || 30;

      const targets = ProfileService.calculateTargets(
        w, h, a, gender, selectedActivity, goal, biotype
      );

      const updates: ProfileUpdates = {
        biotype,
        goal,
        activity_level: selectedActivity,
        target_calories: targets.calories,
        target_protein: targets.protein,
        target_carbs: targets.carbs,
        target_fats: targets.fats,
        weight: w,
        height: h,
        age: a,
        gender
      };

      await updateProfile(updates);
      onFinish();
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert(pc.saveError);
    } finally {
      setLoading(false);
    }
  };

  const biotypes = [
    { id: 'ecto', title: pc.ectomorph, desc: pc.ectomorphDesc },
    { id: 'meso', title: pc.mesomorph, desc: pc.mesomorphDesc },
    { id: 'endo', title: pc.endomorph, desc: pc.endomorphDesc }
  ];

  const goals = [
    { id: 'aesthetic', label: pc.aesthetic, icon: 'fitness_center' },
    { id: 'health', label: pc.health, icon: 'favorite' },
    { id: 'performance', label: pc.performance, icon: 'bolt' }
  ];

  const activityLabels = [pc.sedentary, pc.moderate, pc.intense];

  const progress = (step / totalSteps) * 100;

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden max-w-md mx-auto bg-nura-bg dark:bg-background-dark font-display text-nura-main dark:text-white">

      {/* Progress Bar Container */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-100 dark:bg-white/5 z-50">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-nura-petrol dark:bg-primary shadow-[0_0_10px_rgba(31,78,95,0.5)]"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-10 pb-4 z-10 relative">
        <button
          onClick={handlePrev}
          className="flex items-center justify-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">{step === 1 && isOnboarding ? '' : 'arrow_back'}</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black tracking-[0.3em] text-nura-petrol dark:text-primary uppercase opacity-50">Step {step}/{totalSteps}</span>
        </div>
        <div className="size-10" />
      </header>

      <main className="flex-1 px-8 relative z-10 overflow-y-auto hide-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full py-4"
          >
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="flex flex-col gap-8 h-full">
                <div className="text-center mb-4">
                  <h1 className="text-3xl font-bold tracking-tight mb-2">{pc.welcome}</h1>
                  <p className="text-sm text-nura-muted dark:text-gray-400 font-medium">Vamos começar pelo básico.</p>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-bold uppercase tracking-wider text-nura-muted">{pc.gender}</label>
                    <div className="grid grid-cols-2 gap-3 p-1 bg-white/50 dark:bg-white/5 rounded-2xl border border-nura-border dark:border-white/5">
                      <button
                        onClick={() => setGender('male')}
                        className={`py-6 rounded-xl flex flex-col items-center gap-2 transition-all ${gender === 'male' ? 'bg-nura-petrol dark:bg-primary text-white shadow-lg' : 'text-nura-muted hover:bg-black/5 dark:hover:bg-white/5'}`}
                      >
                        <span className="material-symbols-outlined text-3xl">man</span>
                        <span className="font-bold">Masculino</span>
                      </button>
                      <button
                        onClick={() => setGender('female')}
                        className={`py-6 rounded-xl flex flex-col items-center gap-2 transition-all ${gender === 'female' ? 'bg-nura-petrol dark:bg-primary text-white shadow-lg' : 'text-nura-muted hover:bg-black/5 dark:hover:bg-white/5'}`}
                      >
                        <span className="material-symbols-outlined text-3xl">woman</span>
                        <span className="font-bold">Feminino</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-bold uppercase tracking-wider text-nura-muted">{pc.age}</label>
                    <div className="relative group">
                      <input
                        type="number"
                        value={age}
                        onChange={e => setAge(e.target.value)}
                        placeholder="Ex: 30"
                        className="w-full p-5 rounded-2xl border border-nura-border dark:border-white/10 bg-white dark:bg-surface-dark focus:ring-2 focus:ring-nura-petrol dark:focus:ring-primary outline-none text-lg font-bold transition-all shadow-sm"
                      />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-nura-muted font-bold">anos</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Body Stats */}
            {step === 2 && (
              <div className="flex flex-col gap-8 h-full">
                <div className="text-center mb-4">
                  <h1 className="text-3xl font-bold tracking-tight mb-2">Composição</h1>
                  <p className="text-sm text-nura-muted dark:text-gray-400 font-medium">Sua estrutura atual.</p>
                </div>

                <div className="space-y-8">
                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-bold uppercase tracking-wider text-nura-muted">{pc.weight}</label>
                    <div className="relative group">
                      <input
                        type="number"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                        placeholder="0.0"
                        className="w-full p-5 rounded-2xl border border-nura-border dark:border-white/10 bg-white dark:bg-surface-dark focus:ring-2 focus:ring-nura-petrol dark:focus:ring-primary outline-none text-2xl font-black transition-all shadow-sm text-center"
                      />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-nura-muted font-bold">kg</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-bold uppercase tracking-wider text-nura-muted">{pc.height}</label>
                    <div className="relative group">
                      <input
                        type="number"
                        value={height}
                        onChange={e => setHeight(e.target.value)}
                        placeholder="0"
                        className="w-full p-5 rounded-2xl border border-nura-border dark:border-white/10 bg-white dark:bg-surface-dark focus:ring-2 focus:ring-nura-petrol dark:focus:ring-primary outline-none text-2xl font-black transition-all shadow-sm text-center"
                      />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-nura-muted font-bold">cm</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Biotype & Activity */}
            {step === 3 && (
              <div className="flex flex-col gap-8 h-full">
                <div className="text-center mb-4">
                  <h1 className="text-3xl font-bold tracking-tight mb-2">Metabolismo</h1>
                  <p className="text-sm text-nura-muted dark:text-gray-400 font-medium">Como seu corpo processa energia.</p>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-sm font-bold uppercase tracking-wider text-nura-muted">{pc.biotype}</label>
                    <div className="grid grid-cols-1 gap-3">
                      {biotypes.map((bio) => (
                        <button
                          key={bio.id}
                          onClick={() => setBiotype(bio.id as any)}
                          className={`p-4 rounded-2xl border text-left transition-all duration-300 flex items-center gap-4 ${biotype === bio.id ? 'border-nura-petrol dark:border-primary bg-nura-petrol/5 dark:bg-primary/5 ring-1 ring-nura-petrol dark:ring-primary' : 'border-nura-border dark:border-white/5 bg-white dark:bg-surface-dark'}`}
                        >
                          <div className={`size-4 rounded-full border-2 transition-colors shrink-0 ${biotype === bio.id ? 'border-nura-petrol dark:border-primary bg-nura-petrol dark:bg-primary shadow-[0_0_8px_rgba(31,78,95,0.6)]' : 'border-nura-border dark:border-gray-600'}`}></div>
                          <div className="flex flex-col">
                            <span className="text-base font-bold">{bio.title}</span>
                            <span className="text-[11px] text-nura-muted opacity-80">{bio.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <label className="text-sm font-bold uppercase tracking-wider text-nura-muted">{pc.activityLevel}</label>
                    <div className="bg-white/50 dark:bg-white/5 p-6 rounded-2xl border border-nura-border dark:border-white/5">
                      <input
                        className="w-full h-1.5 bg-nura-border dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-nura-petrol dark:accent-primary"
                        max="3" min="1" step="1" type="range"
                        value={activityLevel}
                        onChange={(e) => setActivityLevel(Number(e.target.value))}
                      />
                      <div className="flex justify-between mt-6 text-[11px] font-black uppercase tracking-widest text-nura-muted">
                        {activityLabels.map((label, i) => (
                          <span key={i} className={`transition-all ${activityLevel === i + 1 ? 'text-nura-petrol dark:text-primary scale-110' : 'opacity-40'}`}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Goals */}
            {step === 4 && (
              <div className="flex flex-col gap-8 h-full">
                <div className="text-center mb-4">
                  <h1 className="text-3xl font-bold tracking-tight mb-2">{pc.mainGoal}</h1>
                  <p className="text-sm text-nura-muted dark:text-gray-400 font-medium">Qual sua prioridade nos próximos 90 dias?</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {goals.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGoal(g.id as any)}
                      className={`group relative p-6 rounded-2xl border transition-all duration-300 flex items-center justify-between overflow-hidden ${goal === g.id ? 'border-nura-petrol dark:border-primary bg-nura-petrol dark:bg-primary text-white shadow-xl shadow-nura-petrol/20' : 'border-nura-border dark:border-white/10 bg-white dark:bg-surface-dark hover:border-nura-petrol/30'}`}
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={`size-12 rounded-xl flex items-center justify-center transition-colors ${goal === g.id ? 'bg-white/20' : 'bg-nura-petrol/10 dark:bg-primary/10 text-nura-petrol dark:text-primary'}`}>
                          <span className="material-symbols-outlined text-2xl">{g.icon}</span>
                        </div>
                        <span className="text-lg font-bold">{g.label}</span>
                      </div>
                      {goal === g.id && (
                        <motion.span 
                          initial={{ scale: 0 }} 
                          animate={{ scale: 1 }} 
                          className="material-symbols-outlined text-white relative z-10"
                        >check_circle</motion.span>
                      )}
                      
                      {/* Subtly animated background pattern for selected card */}
                      {goal === g.id && (
                        <motion.div 
                          layoutId="card-bg"
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 -translate-x-full animate-[shimmer_2s_infinite]"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Navigation */}
      <footer className="shrink-0 p-8 pb-10 bg-gradient-to-t from-nura-bg via-nura-bg to-transparent dark:from-background-dark dark:via-background-dark pt-12 z-20">
        <button
          onClick={handleNext}
          disabled={loading || (step === 1 && !age) || (step === 2 && (!weight || !height))}
          className="w-full bg-nura-petrol dark:bg-primary hover:brightness-110 text-white font-bold h-16 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
          ) : (
            <>
              <span className="text-base uppercase tracking-widest">{step === totalSteps ? pc.calculateMacros : common.next}</span>
              <motion.span 
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="material-symbols-outlined group-hover:translate-x-1 transition-transform"
              >
                {step === totalSteps ? 'auto_awesome' : 'arrow_forward'}
              </motion.span>
            </>
          )}
        </button>
      </footer>

      {/* Styles for Shimmer */}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%) skewX(12deg); }
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};