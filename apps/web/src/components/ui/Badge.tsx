import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
}) => {
  const base = 'inline-flex items-center font-heading font-semibold uppercase tracking-wider rounded-full';
  
  const variants = {
    primary: 'bg-gym-primary/20 text-gym-primary border border-gym-primary/40',
    success: 'bg-gym-success/20 text-gym-success border border-gym-success/40',
    danger: 'bg-gym-danger/20 text-gym-danger border border-gym-danger/40',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
    neutral: 'bg-gym-surfaceHover text-gym-muted border border-gym-border',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
  };

  return (
    <span className={twMerge(clsx(base, variants[variant], sizes[size], className))}>
      {children}
    </span>
  );
};
