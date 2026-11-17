import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { LoadingSkeleton } from './AnalyticsStates';

export type StatTone = 'default' | 'positive' | 'negative' | 'muted';

export interface CarbonStatCardProps {
  title: string;
  value: string;
  unit?: string;
  subtitle: string;
  secondarySubtitle?: string | null;
  icon: ReactNode;
  tone?: StatTone;
  isNumeric?: boolean;
  isLoading?: boolean;
  tooltipText?: string;
}

const VALUE_TONE_CLASS: Record<StatTone, string> = {
  default: 'text-[#18392C]',
  positive: 'text-[#176B52]',
  negative: 'text-[#B45309]',
  muted: 'text-[#64766C]',
};

const BADGE_TONE_CLASS: Record<StatTone, string> = {
  default: 'bg-[#DCEDE3] text-[#176B52]',
  positive: 'bg-[#DCEDE3] text-[#176B52]',
  negative: 'bg-[#FEF3C7] text-[#B45309]',
  muted: 'bg-[#F0F5F2] text-[#64766C]',
};

export function CarbonStatCard({
  title,
  value,
  unit,
  subtitle,
  secondarySubtitle,
  icon,
  tone = 'default',
  isNumeric = true,
  isLoading = false,
  tooltipText,
}: CarbonStatCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <Card padding="md" className="relative flex flex-col justify-between">
      {isLoading ? (
        <LoadingSkeleton variant="card" label={`Loading ${title}`} />
      ) : (
        <>
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-sm font-medium text-[#64766C]">{title}</p>
                {tooltipText ? (
                  <div className="relative">
                    <button
                      type="button"
                      aria-label={`Calculation details for ${title}`}
                      aria-expanded={showTooltip}
                      onClick={() => setShowTooltip((prev) => !prev)}
                      onBlur={() => setShowTooltip(false)}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#64766C] hover:bg-[#DCEDE3] hover:text-[#18392C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52] cursor-pointer"
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    {showTooltip ? (
                      <div
                        role="tooltip"
                        className="absolute left-0 top-7 z-20 w-64 rounded-lg border border-[#E1EAE4] bg-white p-3 text-xs text-[#18392C] shadow-md leading-relaxed"
                      >
                        {tooltipText}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <span
                className={[
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  BADGE_TONE_CLASS[tone],
                ].join(' ')}
              >
                {icon}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-baseline gap-1.5">
              <p
                className={[
                  'text-2xl font-bold tracking-tight',
                  VALUE_TONE_CLASS[tone],
                  isNumeric ? 'font-mono tabular-nums' : '',
                ].join(' ')}
              >
                {value}
              </p>
              {unit ? (
                <span className="text-xs font-medium text-[#64766C] font-mono">
                  {unit}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-2 space-y-0.5">
            <p className="text-xs text-[#64766C] leading-snug">{subtitle}</p>
            {secondarySubtitle ? (
              <p className="text-[11px] text-[#64766C] leading-snug">
                {secondarySubtitle}
              </p>
            ) : null}
          </div>
        </>
      )}
    </Card>
  );
}
