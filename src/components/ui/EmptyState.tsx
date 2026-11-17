import React from 'react';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center rounded-lg bg-[#F6F8F3]/70',
        compact ? 'px-5 py-8' : 'px-6 py-12',
      ].join(' ')}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#DCEDE3] text-[#176B52]">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-[#18392C]">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-[#64766C] leading-relaxed">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
