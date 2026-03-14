import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ProfileService, ProfileUpdates } from '../services/profileService';
import { useLanguage } from '../i18n';

interface ProfileConfigProps {
  onBack: () => void;
  onFinish: () => void;
  isOnboarding?: boolean;
}

export const ProfileConfig: React.FC<ProfileConfigProps> = ({ onBack, onFinish, isOnboarding = false }) => {
  const { profile, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const [biotype, setBiotype] = useState<'ecto' | 'meso' | 'endo'>('meso');
  const [goal, setGoal] = useState<'aesthetic' | 'health' | 'performance'>('aesthetic');
  const [activityLevel, setActivityLevel] = useState(2);

  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  const pc = t.profileConfig;

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
      if (profile.gender) setGender(profile.gender);
    }
  }, [profile]);

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
    { id: 'aesthetic', label: pc.aesthetic },
    { id: 'health', label: pc.health },
    { id: 'performance', label: pc.performance }
  ];

  const activityLabels = [pc.sedentary, pc.moderate, pc.intense];

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl bg-nura-bg dark:bg-background-dark font-display text-nura-main dark:text-white animate-fade-in">

      {/* Decorative Blur */}
      <div className="fixed top-[-10%] right-[-20%] w-[300px] h-[300px] bg-nura-petrol/10 dark:bg-primary/10 rounded-full blur-[80px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] left-[-20%] w-[250px] h-[250px] bg-gray-400/10 rounded-full blur-[60px] pointer-events-none z-0"></div>

      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-8 pb-4 z-10 relative">
        {!isOnboarding && (
          <button
            onClick={onBack}
            className="flex items-center justify-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
        {isOnboarding && <div className="size-10" />}
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold tracking-[0.2em] text-nura-petrol dark:text-primary uppercase">Nura</span>
        </div>
        <button className="flex items-center justify-center size-10 text-nura-muted cursor-default">
          <span className="text-xs font-medium">Config</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col px-8 pb-32 overflow-y-auto relative z-10">

        {/* Title */}
        <div className="mt-4 mb-10 text-center animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-3xl font-bold tracking-tight text-nura-main dark:text-white mb-2">
            {isOnboarding ? pc.welcome : pc.title}
          </h1>
          <p className="text-sm text-nura-muted dark:text-gray-400 font-medium leading-relaxed">
            {isOnboarding ? pc.setupProfile : pc.subtitle}
          </p>
        </div>

        <form className="flex flex-col gap-10" onSubmit={(e) => e.preventDefault()}>

          {/* Anthropometry */}
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <label className="text-sm font-bold uppercase tracking-wider text-nura-muted dark:text-gray-500">{pc.bodyData}</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-nura-muted">{pc.weight}</label>
                <input
                  type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70"
                  className="p-3 rounded-xl border border-nura-border dark:border-gray-800 bg-white dark:bg-[#1a2630] focus:ring-2 focus:ring-nura-petrol dark:focus:ring-primary outline-none text-nura-main dark:text-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-nura-muted">{pc.height}</label>
                <input
                  type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175"
                  className="p-3 rounded-xl border border-nura-border dark:border-gray-800 bg-white dark:bg-[#1a2630] focus:ring-2 focus:ring-nura-petrol dark:focus:ring-primary outline-none text-nura-main dark:text-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-nura-muted">{pc.age}</label>
                <input
                  type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="30"
                  className="p-3 rounded-xl border border-nura-border dark:border-gray-800 bg-white dark:bg-[#1a2630] focus:ring-2 focus:ring-nura-petrol dark:focus:ring-primary outline-none text-nura-main dark:text-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-nura-muted">{pc.gender}</label>
                <div className="flex bg-white dark:bg-[#1a2630] rounded-xl border border-nura-border dark:border-gray-800 p-1">
                  <button type="button" onClick={() => setGender('male')}
                    className={`flex-1 rounded-lg text-sm font-bold py-2.5 transition-colors ${gender === 'male' ? 'bg-nura-petrol/10 dark:bg-primary/10 text-nura-petrol dark:text-primary' : 'text-nura-muted'}`}
                  >M</button>
                  <button type="button" onClick={() => setGender('female')}
                    className={`flex-1 rounded-lg text-sm font-bold py-2.5 transition-colors ${gender === 'female' ? 'bg-nura-petrol/10 dark:bg-primary/10 text-nura-petrol dark:text-primary' : 'text-nura-muted'}`}
                  >F</button>
                </div>
              </div>
            </div>
          </div>

          {/* Biotype */}
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <label className="text-sm font-bold uppercase tracking-wider text-nura-muted dark:text-gray-500">{pc.biotype}</label>
            <div className="grid grid-cols-1 gap-3">
              {biotypes.map((bio) => (
                <label key={bio.id} className="relative cursor-pointer group">
                  <input className="peer sr-only" name="biotype" type="radio" value={bio.id} checked={biotype === bio.id} onChange={() => setBiotype(bio.id as any)} />
                  <div className="p-4 rounded-2xl border border-nura-border dark:border-gray-800 bg-white dark:bg-[#1a2630] transition-all duration-300 hover:border-nura-petrol/50 flex items-center gap-4 peer-checked:border-nura-petrol dark:peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-nura-petrol dark:peer-checked:ring-primary">
                    <div className={`size-5 rounded-full border-2 transition-colors shrink-0 ${biotype === bio.id ? 'border-nura-petrol dark:border-primary bg-nura-petrol dark:bg-primary' : 'border-nura-border dark:border-gray-600'}`}></div>
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-nura-main dark:text-white">{bio.title}</span>
                      <span className="text-xs text-nura-muted">{bio.desc}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <label className="text-sm font-bold uppercase tracking-wider text-nura-muted dark:text-gray-500">{pc.mainGoal}</label>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 snap-x hide-scrollbar">
              {goals.map((g) => (
                <label key={g.id} className="cursor-pointer flex-1 min-w-[100px] snap-center">
                  <input className="peer sr-only" name="goal" type="radio" value={g.id} checked={goal === g.id} onChange={() => setGoal(g.id as any)} />
                  <div className="h-12 rounded-xl border border-nura-border dark:border-gray-800 bg-white dark:bg-[#1a2630] flex items-center justify-center transition-all peer-checked:bg-nura-petrol dark:peer-checked:bg-primary peer-checked:text-white peer-checked:border-nura-petrol dark:peer-checked:border-primary hover:border-nura-petrol/30">
                    <span className="text-sm font-semibold">{g.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Activity Level */}
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <label className="text-sm font-bold uppercase tracking-wider text-nura-muted dark:text-gray-500">{pc.activityLevel}</label>
            <div className="relative pt-6 pb-2">
              <input
                className="w-full h-1 bg-nura-border dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-nura-petrol dark:accent-primary"
                max="3" min="1" step="1" type="range"
                value={activityLevel}
                onChange={(e) => setActivityLevel(Number(e.target.value))}
              />
              <div className="flex justify-between mt-4 text-xs font-medium text-nura-muted dark:text-gray-500">
                {activityLabels.map((label, i) => (
                  <span key={i} className={`flex flex-col items-center gap-1 transition-colors ${activityLevel === i + 1 ? 'text-nura-petrol dark:text-primary font-bold' : ''}`}>
                    <span>{label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

        </form>
      </main>

      {/* Footer */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-nura-bg via-nura-bg to-transparent dark:from-background-dark dark:via-background-dark pt-12 pb-8 px-8 z-20">
        <button
          onClick={handleFinish}
          disabled={loading || !weight || !height || !age}
          className="w-full bg-nura-petrol dark:bg-primary hover:brightness-110 text-white font-bold h-14 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
          ) : (
            <>
              <span>{pc.calculateMacros}</span>
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};