import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Settings, Ban } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getCommunityProfile, updateCommunitySettings, blockUser, unblockUser,
  type CommunityProfile as CommunityProfileType,
} from '../../../services/communityService';
import { AppView } from '../../../types';
import { BadgeChip } from '../badges/BadgeChip';
import { UserBadgeRow } from './UserBadgeRow';
import { FollowButton } from './FollowButton';
import { TreatmentDaysBadge } from './TreatmentDaysBadge';
import { BadgeSelector } from '../badges/BadgeSelector';
import toast from 'react-hot-toast';

interface CommunityProfileProps {
  userId: string;
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

export const CommunityProfile: React.FC<CommunityProfileProps> = ({ userId, onBack }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CommunityProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [badgeSelectorOpen, setBadgeSelectorOpen] = useState(false);
  const [alias, setAlias] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [milestoneOptOut, setMilestoneOptOut] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const isOwnProfile = user?.id === userId;

  const toggleBlock = async () => {
    if (!user || !profile || blocking) return;
    setBlocking(true);
    const ok = profile.is_blocked
      ? await unblockUser(user.id, profile.id)
      : await blockUser(user.id, profile.id);
    if (ok) {
      setProfile(prev => prev ? { ...prev, is_blocked: !prev.is_blocked } : prev);
      toast.success(profile.is_blocked ? 'Usuário desbloqueado.' : 'Usuário bloqueado.');
    } else {
      toast.error('Não foi possível concluir a ação.');
    }
    setBlocking(false);
  };

  useEffect(() => {
    if (!user) return;
    getCommunityProfile(userId, user.id).then(p => {
      setProfile(p);
      if (p) {
        setAlias(p.community_alias ?? '');
        setIsPrivate(p.is_private);
        setMilestoneOptOut(false);
      }
      setLoading(false);
    });
  }, [userId, user]);

  const saveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);
    const ok = await updateCommunitySettings(user.id, {
      community_alias: alias.trim() || undefined,
      is_private: isPrivate,
      milestone_opt_out: milestoneOptOut,
    });
    if (ok) {
      toast.success('Configurações salvas!');
      setProfile(prev => prev ? { ...prev, community_alias: alias || null, is_private: isPrivate } : prev);
      setSettingsOpen(false);
    } else {
      toast.error('Erro ao salvar. Tente novamente.');
    }
    setSavingSettings(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-background-dark">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/10">
          <button onClick={onBack}><ArrowLeft size={20} className="text-gray-600 dark:text-slate-300" /></button>
          <div className="h-5 w-32 bg-gray-100 dark:bg-Malama-dark rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-4 items-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-Malama-dark animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-36 bg-gray-100 dark:bg-Malama-dark rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-100 dark:bg-Malama-dark rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-background-dark items-center justify-center">
        <p className="text-gray-400 text-sm">Perfil não encontrado.</p>
        <button onClick={onBack} className="mt-4 text-[#2ECC71] text-sm font-medium">Voltar</button>
      </div>
    );
  }

  const isPrivateAndNotFollowing = profile.is_private && !profile.is_following && !isOwnProfile;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full bg-white dark:bg-background-dark overflow-y-auto pb-24"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10 sticky top-0 bg-white dark:bg-background-dark z-10">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={20} className="text-gray-600 dark:text-slate-300" />
        </button>
        <span className="text-base font-semibold text-gray-900 dark:text-white">Perfil</span>
        {isOwnProfile && (
          <button onClick={() => setSettingsOpen(s => !s)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <Settings size={18} className="text-gray-500" />
          </button>
        )}
        {!isOwnProfile && <div className="w-9" />}
      </div>

      {/* Avatar + info */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-start gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-gray-100 dark:border-white/10" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-Malama-petrol/20 flex items-center justify-center text-[#2ECC71] text-2xl font-bold border-2 border-[#2ECC71]/30">
              {profile.display_name[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {profile.display_name}
                </h2>
                {profile.is_private && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <Lock size={11} /> Perfil privado
                  </div>
                )}
              </div>
              {!isOwnProfile && user && (
                <div className="flex flex-col items-end gap-1.5">
                  <FollowButton
                    currentUserId={user.id}
                    targetUserId={profile.id}
                    initialIsFollowing={profile.is_following}
                  />
                  <button
                    onClick={toggleBlock}
                    disabled={blocking}
                    className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${
                      profile.is_blocked
                        ? 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-slate-300'
                        : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
                    }`}
                  >
                    <Ban size={12} /> {profile.is_blocked ? 'Desbloquear' : 'Bloquear'}
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-2">
              <div className="text-center">
                <p className="text-base font-bold text-gray-900 dark:text-white">{profile.posts_count}</p>
                <p className="text-xs text-gray-400">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-gray-900 dark:text-white">{profile.followers_count}</p>
                <p className="text-xs text-gray-400">Seguidores</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-gray-900 dark:text-white">{profile.following_count}</p>
                <p className="text-xs text-gray-400">Seguindo</p>
              </div>
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-3 leading-relaxed">{profile.bio}</p>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          <TreatmentDaysBadge days={profile.treatment_days} />
          {profile.featured_badge && <BadgeChip badge={profile.featured_badge} size="md" />}
        </div>

        {/* Badges */}
        {profile.all_badges.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-400 mb-1.5">Conquistas</p>
            <UserBadgeRow
              badges={profile.all_badges}
              onSelectFeatured={isOwnProfile ? () => setBadgeSelectorOpen(true) : undefined}
            />
          </div>
        )}
      </div>

      {/* Settings (own profile) */}
      {isOwnProfile && settingsOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mx-4 mb-4 bg-gray-50 dark:bg-Malama-dark rounded-2xl p-4 space-y-4 overflow-hidden"
        >
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Configurações da Comunidade</h4>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Apelido (opcional)</label>
            <input
              type="text"
              value={alias}
              onChange={e => setAlias(e.target.value)}
              placeholder={profile.display_name}
              maxLength={30}
              className="w-full bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10
                rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none
                focus:ring-2 focus:ring-[#2ECC71]/40"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Perfil privado</p>
              <p className="text-xs text-gray-400">Só seguidores veem seus posts</p>
            </div>
            <button
              onClick={() => setIsPrivate(p => !p)}
              className={`w-11 h-6 rounded-full transition-colors ${isPrivate ? 'bg-Malama-petrol' : 'bg-gray-200 dark:bg-[#363330]'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${isPrivate ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Desativar marcos automáticos</p>
              <p className="text-xs text-gray-400">Não publicar conquistas no feed</p>
            </div>
            <button
              onClick={() => setMilestoneOptOut(p => !p)}
              className={`w-11 h-6 rounded-full transition-colors ${milestoneOptOut ? 'bg-Malama-petrol' : 'bg-gray-200 dark:bg-[#363330]'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${milestoneOptOut ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="w-full bg-Malama-petrol text-white rounded-xl py-2.5 text-sm font-semibold
              disabled:opacity-60 transition-colors hover:bg-[#27ae60]"
          >
            {savingSettings ? 'Salvando…' : 'Salvar configurações'}
          </button>
        </motion.div>
      )}

      {/* Perfil privado bloqueado */}
      {isPrivateAndNotFollowing && (
        <div className="flex flex-col items-center py-16 px-4 text-center">
          <Lock size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Este perfil é privado.</p>
          <p className="text-gray-400 text-xs mt-1">Siga para ver os posts.</p>
        </div>
      )}

      {badgeSelectorOpen && user && (
        <BadgeSelector userId={user.id} onClose={() => setBadgeSelectorOpen(false)} />
      )}
    </motion.div>
  );
};
