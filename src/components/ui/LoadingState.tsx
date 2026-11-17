import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  label?: string;
  compact?: boolean;
}

export function LoadingState({
  label = 'Loading data...',
  compact = false,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'flex flex-col items-center justify-center gap-3 text-center rounded-lg bg-[#F6F8F3]/70',
        compact ? 'px-4 py-8' : 'px-6 py-12',
      ].join(' ')}
    >
      <Loader2 className="h-5 w-5 animate-spin text-[#176B52]" aria-hidden="true" />
      <p className="text-sm font-medium text-[#64766C]">{label}</p>
    </div>
  );
}
