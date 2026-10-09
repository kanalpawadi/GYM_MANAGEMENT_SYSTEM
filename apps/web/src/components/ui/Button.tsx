import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-heading font-medium tracking-wide uppercase transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gym-primary focus:ring-offset-2 focus:ring-offset-gym-bg disabled:opacity-50 disabled:cursor-not-allowed select-none min-h-[44px] rounded-lg';

  const variants = {
    primary: 'bg-gym-primary text-black hover:bg-gym-primaryHover shadow-yellow-glow hover:shadow-yellow-lg active:scale-[0.98]',
    secondary: 'bg-gym-surface text-white hover:bg-gym-surfaceHover border border-gym-border active:scale-[0.98]',
    outline: 'border-2 border-gym-primary text-gym-primary hover:bg-gym-primary hover:text-black active:scale-[0.98]',
    ghost: 'text-gym-muted hover:text-white hover:bg-gym-surfaceHover',
    danger: 'bg-gym-danger text-white hover:bg-red-600 shadow-md active:scale-[0.98]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-5 py-2.5 text-base gap-2',
    lg: 'px-7 py-3.5 text-lg gap-2.5',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
      {!isLoading && leftIcon && <span className="inline-flex">{leftIcon}</span>}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="inline-flex">{rightIcon}</span>}
    </button>
  );
};
