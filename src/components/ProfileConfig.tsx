import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ProfileService, ProfileUpdates } from '../services/profileService';
import { WeightLogService } from '../services/weightLogService';
import { supabase } from '../services/supabase';
import { useLanguage } from '../i18n';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileConfigProps {
  onBack: () => void;
  onFinish: () => void;
  isOnboarding?: boolean;
}

export const ProfileConfig: React.FC<ProfileConfigProps> = ({ onBack, onFinish }) => {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  // Exclusão de conta (exigência da App Store — deve ser iniciada de dentro do app)
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const { error } = await supabase.functions.invoke('delete-account', { body: {} });
      if (error) throw error;
      await signOut();
      window.location.replace('/');
    } catch (err: any) {
      setDeleteError(err?.message || 'Não foi possível excluir a conta. Tente novamente.');
      setDeleting(false);
    }
  };

  const [biotype, setBiotype] = useState<'ecto' | 'meso' | 'endo'>('meso');
  const [goal, setGoal] = useState<'aesthetic' | 'health' | 'performance'>('aesthetic');
  const [activityLevel, setActivityLevel] = useState(2);
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [displayName, setDisplayName] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');

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
      if (profile.display_name) setDisplayName(profile.display_name);
      if (profile.whatsapp) setWhatsapp(profile.whatsapp);
    }
  }, [profile]);

  const handleSave = async () => {
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
        display_name: displayName,
        whatsapp: whatsapp.trim(),
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

      const prevWeight = profile?.weight;
      await updateProfile(updates);

      // Log weight change to weight_logs so MetricsChart picks it up
      if (user && w !== prevWeight) {
        await WeightLogService.logWeight(
          user.id, w, 'manual', 'Atualizado no perfil'
        ).catch(() => {}); // non-fatal
      }

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

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col bg-Malama-bg dark:bg-background-dark font-display text-Malama-main dark:text-white pb-32">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-12 pb-6 z-10 sticky top-0 bg-Malama-bg/80 dark:bg-background-dark/80 backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex items-center justify-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-Malama-main dark:text-white">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold">{t.profile.title}</h1>
        <div className="size-10" />
      </header>

      <main className="flex-1 px-6 space-y-8 overflow-y-auto hide-scrollbar">
        {/* Basic Info */}
        <section className="space-y-6">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-Malama-petrol dark:text-primary opacity-70">Informações Básicas</h2>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-Malama-muted uppercase tracking-wider">E-mail</label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="w-full p-4 rounded-xl border border-Malama-border dark:border-white/10 bg-black/5 dark:bg-white/5 text-Malama-muted outline-none cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-Malama-muted uppercase tracking-wider">Nome de Exibição</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Seu nome"
                className="w-full p-4 rounded-xl border border-Malama-border dark:border-white/10 bg-white dark:bg-surface-dark focus:ring-2 focus:ring-Malama-petrol dark:focus:ring-primary outline-none transition-all shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-Malama-muted uppercase tracking-wider">WhatsApp</label>
              <input
                type="tel"
                inputMode="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full p-4 rounded-xl border border-Malama-border dark:border-white/10 bg-white dark:bg-surface-dark focus:ring-2 focus:ring-Malama-petrol dark:focus:ring-primary outline-none transition-all shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-Malama-muted uppercase tracking-wider">{pc.age}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    className="w-full p-4 rounded-xl border border-Malama-border dark:border-white/10 bg-white dark:bg-surface-dark outline-none font-bold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-Malama-muted font-bold">ANOS</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-Malama-muted uppercase tracking-wider">Gênero</label>
                <select 
                  value={gender}
                  onChange={e => setGender(e.target.value as 'male' | 'female')}
                  className="w-full p-4 rounded-xl border border-Malama-border dark:border-white/10 bg-white dark:bg-surface-dark outline-none font-bold appearance-none"
                >
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Composition */}
        <section className="space-y-6">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-Malama-petrol dark:text-primary opacity-70">Composição Corporal</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-Malama-muted uppercase tracking-wider">{pc.weight}</label>
              <div className="relative">
                <input
                  type="number"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="w-full p-4 rounded-xl border border-Malama-border dark:border-white/10 bg-white dark:bg-surface-dark outline-none font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-Malama-muted font-bold">KG</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-Malama-muted uppercase tracking-wider">{pc.height}</label>
              <div className="relative">
                <input
                  type="number"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  className="w-full p-4 rounded-xl border border-Malama-border dark:border-white/10 bg-white dark:bg-surface-dark outline-none font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-Malama-muted font-bold">CM</span>
              </div>
            </div>
          </div>
        </section>

        {/* Biotype */}
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-Malama-petrol dark:text-primary opacity-70">Biotipo & Metabolismo</h2>
          <div className="grid grid-cols-1 gap-3">
            {biotypes.map((bio) => (
              <button
                key={bio.id}
                onClick={() => setBiotype(bio.id as any)}
                className={`p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${biotype === bio.id ? 'border-Malama-petrol dark:border-primary bg-Malama-petrol/5 dark:bg-primary/5 ring-1 ring-Malama-petrol dark:ring-primary' : 'border-Malama-border dark:border-white/5 bg-white dark:bg-surface-dark'}`}
              >
                <div className={`size-4 rounded-full border-2 ${biotype === bio.id ? 'border-Malama-petrol dark:border-primary bg-Malama-petrol dark:bg-primary' : 'border-Malama-border dark:border-white/10'}`}></div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{bio.title}</span>
                  <span className="text-[10px] text-Malama-muted">{bio.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Activity Level */}
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-Malama-petrol dark:text-primary opacity-70">{pc.activityLevel}</h2>
          <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-Malama-border dark:border-white/5">
            <input
              className="w-full h-1.5 bg-Malama-border dark:bg-Malama-dark rounded-lg appearance-none cursor-pointer accent-Malama-petrol dark:accent-primary"
              max="3" min="1" step="1" type="range"
              value={activityLevel}
              onChange={(e) => setActivityLevel(Number(e.target.value))}
            />
            <div className="flex justify-between mt-4 text-[10px] font-black uppercase tracking-widest text-Malama-muted">
              {activityLabels.map((label, i) => (
                <span key={i} className={activityLevel === i + 1 ? 'text-Malama-petrol dark:text-primary' : 'opacity-40'}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Goals */}
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-Malama-petrol dark:text-primary opacity-70">Objetivo</h2>
          <div className="grid grid-cols-1 gap-3">
            {goals.map((g) => (
              <button
                key={g.id}
                onClick={() => setGoal(g.id as any)}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${goal === g.id ? 'border-Malama-petrol dark:border-primary bg-Malama-petrol dark:bg-primary text-white' : 'border-Malama-border dark:border-white/5 bg-white dark:bg-surface-dark'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl">{g.icon}</span>
                  <span className="font-bold">{g.label}</span>
                </div>
                {goal === g.id && <span className="material-symbols-outlined text-sm">check_circle</span>}
              </button>
            ))}
          </div>
        </section>

        {/* Danger Zone — exclusão de conta */}
        <section className="space-y-4 pt-4">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-red-500 opacity-80">Zona de perigo</h2>
          <button
            onClick={() => { setDeleteError(null); setShowDelete(true); }}
            className="w-full p-4 rounded-xl border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">delete_forever</span>
            <span>Excluir minha conta</span>
          </button>
          <p className="text-[11px] text-Malama-muted text-center">
            A exclusão é permanente e remove seu perfil, histórico e todos os seus dados.
          </p>
        </section>
      </main>

      {/* Modal de confirmação de exclusão */}
      <AnimatePresence>
        {showDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
            onClick={() => !deleting && setShowDelete(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-2xl p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
                <h3 className="text-lg font-bold text-Malama-main dark:text-white">Excluir conta</h3>
              </div>
              <p className="text-sm text-Malama-muted dark:text-gray-300">
                Tem certeza? Esta ação é <strong>permanente e irreversível</strong>. Todos os seus dados
                (perfil, histórico de refeições, consultas, planos e progresso) serão apagados.
              </p>
              {deleteError && (
                <p className="text-sm text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  {deleteError}
                </p>
              )}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="w-full h-12 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                  ) : 'Sim, excluir permanentemente'}
                </button>
                <button
                  onClick={() => setShowDelete(false)}
                  disabled={deleting}
                  className="w-full h-12 rounded-xl font-bold text-Malama-main dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Button */}
      <footer className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-Malama-bg dark:from-background-dark pt-10 z-20">
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-Malama-petrol dark:bg-primary text-white font-bold h-14 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl">save</span>
              <span>{common.save}</span>
            </>
          )}
        </button>
      </footer>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
