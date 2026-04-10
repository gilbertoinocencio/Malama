import React from 'react';
import type { BadgeSummary } from '../../../services/communityService';

interface BadgeChipProps {
  badge: BadgeSummary;
  size?: 'sm' | 'md';
}

export const BadgeChip: React.FC<BadgeChipProps> = ({ badge, size = 'sm' }) => {
  const sizeClass = size === 'sm'
    ? 'text-xs px-1.5 py-0.5 gap-0.5'
    : 'text-sm px-2 py-1 gap-1';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass}`}
      style={{ backgroundColor: badge.color_hex + '22', color: badge.color_hex, border: `1px solid ${badge.color_hex}44` }}
      title={badge.label}
    >
      <span>{badge.emoji}</span>
      <span>{badge.label}</span>
    </span>
  );
};
