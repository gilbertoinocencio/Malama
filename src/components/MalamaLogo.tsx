// =====================================================
// Malama — Logo Component (reutilizável)
// =====================================================

import React from 'react';

interface MalamaLogoProps {
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

export const MalamaLogo: React.FC<MalamaLogoProps> = ({
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
          color: '#9c5d4b',
          fontFamily: "'Cormorant Garamond', Georgia, serif"
        }}
      >
        Malama
      </span>
    );
  }

  const isDark = variant === 'dark';

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        background: 'transparent', // Transparent background for a cleaner look with the new logo
        borderRadius: config.borderRadius,
        padding: '0px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <img
        src="/malama-logo.png"
        alt="Malama Logo"
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
export const MalamaLogoLight: React.FC<{ size?: MalamaLogoProps['size'] }> = (props) => (
  <MalamaLogo variant="light" {...props} />
);

export const MalamaLogoText: React.FC<{ size?: MalamaLogoProps['size'] }> = (props) => (
  <MalamaLogo variant="text-only" {...props} />
);
