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
  sm: { fontSize: '20px', padding: '6px 12px', borderRadius: '8px', letterSpacing: '4px', textIndent: '4px' },
  md: { fontSize: '32px', padding: '10px 20px', borderRadius: '12px', letterSpacing: '8px', textIndent: '8px' },
  lg: { fontSize: '48px', padding: '14px 28px', borderRadius: '16px', letterSpacing: '14px', textIndent: '14px' },
  xl: { fontSize: '64px', padding: '18px 36px', borderRadius: '24px', letterSpacing: '18px', textIndent: '18px' }
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
          fontSize: config.fontSize,
          letterSpacing: config.letterSpacing,
          textIndent: config.textIndent,
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
        padding: config.padding,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Gloss effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.06), transparent)',
          borderRadius: `${config.borderRadius} ${config.borderRadius} 0 0`
        }}
      />
      <span
        style={{
          fontSize: config.fontSize,
          fontWeight: 300,
          color: 'white',
          letterSpacing: config.letterSpacing,
          textIndent: config.textIndent,
          lineHeight: 1,
          position: 'relative',
          zIndex: 1,
          fontFamily: "'Cormorant Garamond', Georgia, serif"
        }}
      >
        NURA
      </span>
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
