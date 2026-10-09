import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  options,
  error,
  className,
  id,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-gym-muted">
          {label}
        </label>
      )}
      <select
        id={selectId}
        ref={ref}
        className={twMerge(
          clsx(
            'w-full bg-gym-surface text-white border border-gym-border rounded-lg px-4 py-2.5 min-h-[44px] text-sm font-body transition-colors focus:outline-none focus:border-gym-primary focus:ring-1 focus:ring-gym-primary disabled:opacity-50',
            error && 'border-gym-danger focus:border-gym-danger focus:ring-gym-danger',
            className
          )
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-gym-surface text-white">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-gym-danger font-medium">{error}</span>}
    </div>
  );
});

Select.displayName = 'Select';
