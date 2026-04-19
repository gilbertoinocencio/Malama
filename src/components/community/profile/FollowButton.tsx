import React, { useState } from 'react';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { followUser, unfollowUser } from '../../../services/communityService';

interface FollowButtonProps {
  currentUserId: string;
  targetUserId: string;
  initialIsFollowing: boolean;
  onChanged?: (isFollowing: boolean) => void;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  currentUserId, targetUserId, initialIsFollowing, onChanged,
}) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    const ok = isFollowing
      ? await unfollowUser(currentUserId, targetUserId)
      : await followUser(currentUserId, targetUserId);
    if (ok) {
      const next = !isFollowing;
      setIsFollowing(next);
      onChanged?.(next);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
        isFollowing
          ? 'bg-gray-100 dark:bg-Malama-dark text-gray-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500'
          : 'bg-Malama-petrol text-white hover:bg-[#27ae60]'
      }`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isFollowing ? (
        <><UserMinus size={14} /> Seguindo</>
      ) : (
        <><UserPlus size={14} /> Seguir</>
      )}
    </button>
  );
};
