import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverEffect = true,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-gym-surface/70 backdrop-blur-sm border border-gym-border rounded-3xl p-6 shadow-2xl shadow-black/25 transition-all duration-300',
          hoverEffect && 'hover:border-gym-primary/50 hover:shadow-yellow-glow',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
