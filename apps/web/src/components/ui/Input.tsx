import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className,
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gym-muted">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 text-gym-muted pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full bg-gym-surface text-white placeholder-gym-muted border border-gym-border rounded-lg px-4 py-2.5 min-h-[44px] text-sm font-body transition-colors focus:outline-none focus:border-gym-primary focus:ring-1 focus:ring-gym-primary disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-gym-danger focus:border-gym-danger focus:ring-gym-danger',
              className
            )
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 text-gym-muted">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <span className="text-xs text-gym-danger font-medium">{error}</span>}
      {!error && helperText && <span className="text-xs text-gym-muted">{helperText}</span>}
    </div>
  );
});

Input.displayName = 'Input';
