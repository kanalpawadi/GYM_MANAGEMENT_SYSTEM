import React from 'react';

const SIZES = { sm: 'w-9 h-9 text-xs', md: 'w-12 h-12 text-base', lg: 'w-16 h-16 text-2xl', xl: 'w-24 h-24 text-3xl' };

/** Profile photo, or the person's initial when they haven't added one. */
export const Avatar: React.FC<{ src?: string | null; name?: string | null; size?: keyof typeof SIZES; className?: string }> = ({
  src,
  name,
  size = 'md',
  className = '',
}) =>
  src ? (
    <img src={src} alt={name ? `${name}'s photo` : 'Profile photo'} className={`${SIZES[size]} rounded-full object-cover border-2 border-gym-primary shrink-0 ${className}`} />
  ) : (
    <div
      aria-label={name ? `${name} (no photo)` : 'No photo'}
      className={`${SIZES[size]} rounded-full bg-gym-primary/20 text-gym-primary flex items-center justify-center font-heading uppercase border-2 border-gym-primary/60 shrink-0 ${className}`}
    >
      {name?.trim().charAt(0) || '?'}
    </div>
  );
