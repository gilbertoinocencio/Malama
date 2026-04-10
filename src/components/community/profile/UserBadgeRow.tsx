import React from 'react';
import { BadgeChip } from '../badges/BadgeChip';
import type { BadgeSummary } from '../../../services/communityService';

interface UserBadgeRowProps {
  badges: BadgeSummary[];
  onSelectFeatured?: (badge: BadgeSummary) => void;
}

export const UserBadgeRow: React.FC<UserBadgeRowProps> = ({ badges, onSelectFeatured }) => {
  if (badges.length === 0) return null;
  return (
    <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none">
      {badges.map(b => (
        <button key={b.code} onClick={() => onSelectFeatured?.(b)} className="shrink-0">
          <BadgeChip badge={b} size="md" />
        </button>
      ))}
    </div>
  );
};
