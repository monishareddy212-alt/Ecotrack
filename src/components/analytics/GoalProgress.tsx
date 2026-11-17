import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { Card } from '../ui/Card';
import { LoadingSkeleton } from './AnalyticsStates';
import type { MonthlyGoalStatus } from '../../types/ecotrack';

export interface GoalProgressProps {
  goal: MonthlyGoalStatus | null;
  currentEmissionsKg: number;
  monthLabel: string;
  isLoading?: boolean;
}

const STATUS_BADGE_MAP: Record<
  MonthlyGoalStatus['status'],
  { label: string; badgeClass: string; barClass: string; textClass: string }
> = {
  within_target: {
    label: 'Within Target',
    badgeClass: 'bg-[#DCEDE3] text-[#18392C] border-[#BCE0CA]',
    barClass: 'bg-[#176B52]',
    textClass: 'text-[#176B52]',
  },
  approaching_target: {
    label: 'Approaching Target',
    badgeClass: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
    barClass: 'bg-[#F4B860]',
    textClass: 'text-[#B45309]',
  },
  at_target: {
    label: 'At Target',
    badgeClass: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
    barClass: 'bg-[#D97706]',
    textClass: 'text-[#B45309]',
  },
  exceeded: {
    label: 'Target Exceeded',
    badgeClass: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
    barClass: 'bg-[#B91C1C]',
    textClass: 'text-[#B91C1C]',
  },
};

export function GoalProgress({
  goal,
  currentEmissionsKg,
  monthLabel,
  isLoading = false,
}: GoalProgressProps) {
  const clampedPercent = goal ? Math.min(Math.max(goal.percentageUsed, 0), 100) : 0;
  const statusStyle = goal ? STATUS_BADGE_MAP[goal.status] : null;

  return (
    <Card padding="md" className="flex flex-col justify-between">
      {isLoading ? (
        <LoadingSkeleton variant="card" label="Loading monthly target" />
      ) : (
        <>
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#64766C]">Monthly Target</p>
                {statusStyle ? (
                  <span
                    className={[
                      'mt-1 inline-block rounded border px-2 py-0.5 text-[11px] font-semibold',
                      statusStyle.badgeClass,
                    ].join(' ')}
                  >
                    {statusStyle.label}
                  </span>
                ) : null}
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#DCEDE3] text-[#176B52]">
                <Target className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>

            {goal && statusStyle ? (
              <>
                <div className="mt-3 flex flex-wrap items-baseline gap-1.5">
                  <p className="text-2xl font-bold tracking-tight text-[#18392C] font-mono tabular-nums">
                    {goal.targetCo2eKg.toFixed(2)}
                  </p>
                  <span className="text-xs font-medium text-[#64766C] font-mono">
                    kg CO₂e
                  </span>
                </div>

                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={[
                        'font-semibold font-mono tabular-nums',
                        statusStyle.textClass,
                      ].join(' ')}
                    >
                      {goal.percentageUsed.toFixed(1)}% used
                    </span>
                    <span className="text-[#64766C] font-mono tabular-nums">
                      {currentEmissionsKg.toFixed(2)} / {goal.targetCo2eKg.toFixed(2)}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Monthly sustainability target progress for ${monthLabel}`}
                    aria-valuenow={Math.round(goal.percentageUsed)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-2 w-full overflow-hidden rounded-full bg-[#E1EAE4]"
                  >
                    <div
                      className={[
                        'h-full rounded-full transition-all duration-300',
                        statusStyle.barClass,
                      ].join(' ')}
                      style={{ width: `${clampedPercent}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-3 text-2xl font-bold tracking-tight text-[#64766C]">
                Not Set
              </p>
            )}
          </div>

          <div className="mt-2 space-y-1">
            {goal ? (
              <>
                <p className="text-xs text-[#64766C]">
                  {goal.remainingKg >= 0
                    ? `${goal.remainingKg.toFixed(2)} kg CO₂e remaining in ${monthLabel}`
                    : `${Math.abs(goal.remainingKg).toFixed(2)} kg CO₂e over target in ${monthLabel}`}
                </p>
                <p className="text-[11px] text-[#64766C]">
                  Based on your recorded activities.
                </p>
              </>
            ) : (
              <Link
                to="/goals"
                className="inline-block text-xs font-medium text-[#176B52] hover:text-[#18392C] underline-offset-2 hover:underline"
              >
                Set target in Sustainability Goals
              </Link>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
