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
          'bg-gym-surface border border-gym-border rounded-xl p-6 transition-all duration-300',
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
