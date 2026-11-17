import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

export interface LoadingSkeletonProps {
  variant?: 'card' | 'chart' | 'table';
  label?: string;
}

export function LoadingSkeleton({
  variant = 'chart',
  label = 'Loading analytics from PostgreSQL...',
}: LoadingSkeletonProps) {
  if (variant === 'card') {
    return (
      <div role="status" aria-label={label} className="animate-pulse space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-28 rounded bg-[#E1EAE4]" />
          <div className="h-8 w-8 rounded-lg bg-[#DCEDE3]" />
        </div>
        <div className="h-7 w-36 rounded bg-[#E1EAE4]" />
        <div className="h-3 w-44 rounded bg-[#EFF4F0]" />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div role="status" aria-label={label} className="animate-pulse space-y-3 py-2">
        {[0, 1, 2, 3, 4].map((row) => (
          <div
            key={row}
            className="flex items-center justify-between gap-4 border-b border-[#EFF4F0] pb-3 last:border-b-0"
          >
            <div className="h-4 w-32 rounded bg-[#E1EAE4]" />
            <div className="h-4 w-20 rounded bg-[#EFF4F0]" />
            <div className="h-4 w-24 rounded bg-[#E1EAE4]" />
          </div>
        ))}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={label}
      className="flex h-64 w-full flex-col justify-end gap-3 rounded-lg bg-[#F6F8F3]/60 p-4 animate-pulse"
    >
      <div className="flex h-44 items-end gap-3">
        <div className="h-16 flex-1 rounded-t bg-[#DCEDE3]" />
        <div className="h-28 flex-1 rounded-t bg-[#DCEDE3]" />
        <div className="h-20 flex-1 rounded-t bg-[#DCEDE3]" />
        <div className="h-36 flex-1 rounded-t bg-[#DCEDE3]" />
        <div className="h-24 flex-1 rounded-t bg-[#DCEDE3]" />
        <div className="h-32 flex-1 rounded-t bg-[#DCEDE3]" />
      </div>
      <div className="h-3 w-full rounded bg-[#E1EAE4]" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export interface AnalyticsEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}

export function AnalyticsEmptyState({
  icon,
  title,
  description,
  action,
  compact = true,
}: AnalyticsEmptyStateProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      compact={compact}
    />
  );
}

export interface AnalyticsErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function AnalyticsErrorState({ message, onRetry }: AnalyticsErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start justify-between gap-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold">Unable to load analytics data</p>
          <p className="text-xs leading-relaxed text-[#7F1D1D]">{message}</p>
        </div>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Retry</span>
        </Button>
      ) : null}
    </div>
  );
}
