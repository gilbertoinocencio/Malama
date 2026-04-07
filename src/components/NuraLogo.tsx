// =====================================================
// NURA — Logo Component (reutilizável)
// =====================================================

import React from 'react';

interface NuraLogoProps {
  variant?: 'light' | 'dark' | 'text-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeConfig = {
  sm: { width: '80px', height: 'auto', borderRadius: '8px' },
  md: { width: '120px', height: 'auto', borderRadius: '12px' },
  lg: { width: '180px', height: 'auto', borderRadius: '16px' },
  xl: { width: '240px', height: 'auto', borderRadius: '24px' }
};

export const NuraLogo: React.FC<NuraLogoProps> = ({
  variant = 'light',
  size = 'md',
  className = ''
}) => {
  const config = sizeConfig[size];

  if (variant === 'text-only') {
    return (
      <span
        className={`font-serif font-semibold tracking-wide ${className}`}
        style={{
          fontSize: config.width === '80px' ? '20px' : config.width === '120px' ? '32px' : config.width === '180px' ? '48px' : '64px',
          letterSpacing: config.width === '80px' ? '4px' : config.width === '120px' ? '8px' : config.width === '180px' ? '14px' : '18px',
          textIndent: config.width === '80px' ? '4px' : config.width === '120px' ? '8px' : config.width === '180px' ? '14px' : '18px',
          color: '#1A6070',
          fontFamily: "'Cormorant Garamond', Georgia, serif"
        }}
      >
        NURA
      </span>
    );
  }

  const isDark = variant === 'dark';

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #1A6070 0%, #0C4352 100%)'
          : 'linear-gradient(135deg, #1A6070 0%, #0C4352 100%)',
        borderRadius: config.borderRadius,
        padding: '8px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <img
        src="/logo.jpg"
        alt="NURA Logo"
        style={{
          width: config.width,
          height: config.height,
          objectFit: 'contain',
          position: 'relative',
          zIndex: 1
        }}
      />
    </div>
  );
};

// Variantes predefinidas para uso rápido
export const NuraLogoLight: React.FC<{ size?: NuraLogoProps['size'] }> = (props) => (
  <NuraLogo variant="light" {...props} />
);

export const NuraLogoText: React.FC<{ size?: NuraLogoProps['size'] }> = (props) => (
  <NuraLogo variant="text-only" {...props} />
);
