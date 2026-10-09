import React from 'react';
import { Dumbbell } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-gym-surface/50 border border-dashed border-gym-border rounded-xl my-6">
      <div className="w-16 h-16 rounded-full bg-gym-primary/10 text-gym-primary flex items-center justify-center mb-4">
        {icon || <Dumbbell className="w-8 h-8" />}
      </div>
      <h4 className="text-xl font-heading text-white tracking-wide uppercase mb-1">
        {title}
      </h4>
      {description && (
        <p className="text-sm text-gym-muted max-w-sm mb-6">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
