import React from 'react';

export interface DookanifyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'emerald-gold' | 'gold-luxury' | 'dark-emerald';
  rounded?: '2xl' | '3xl' | 'full';
  className?: string;
}

export const DookanifyLogo: React.FC<DookanifyLogoProps> = ({
  size = 'md',
  rounded = '2xl',
  className = '',
}) => {
  const sizeClass = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
    xl: 'w-16 h-16',
    '2xl': 'w-24 h-24',
  }[size];

  const roundedClass =
    rounded === 'full'
      ? 'rounded-full'
      : rounded === '3xl'
        ? 'rounded-3xl'
        : 'rounded-2xl';

  const imgSrc =
    size === 'xl' || size === '2xl' ? '/pwa-512x512.png' : '/pwa-192x192.png';

  return (
    <div
      className={`relative inline-flex aspect-square items-center justify-center shrink-0 overflow-hidden bg-emerald-950 border border-amber-300/45 shadow-[0_8px_24px_rgba(4,120,87,0.35)] select-none ${sizeClass} ${roundedClass} ${className}`}
      aria-label="Dookanify Logo"
    >
      <img
        src={imgSrc}
        alt="Dookanify"
        className="h-full w-full aspect-square object-cover"
        draggable={false}
      />
    </div>
  );
};
