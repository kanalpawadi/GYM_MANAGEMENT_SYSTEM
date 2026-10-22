import React from 'react';

/** The RV Fitness logo (round badge). Size it with Tailwind width/height classes. */
export const BrandLogo: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <img src="/logo-192.png" alt="RV Fitness logo" width={192} height={192} className={`${className} rounded-full shrink-0 object-cover`} />
);
