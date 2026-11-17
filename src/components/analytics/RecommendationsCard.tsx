import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, Sparkles } from 'lucide-react';
import { fetchRecommendations } from '../../services/recommendationApi';
import type { RecommendationCategory, RecommendationItem } from '../../types/ecotrack';
import { Card, CardHeader } from '../ui/Card';
import { AnalyticsErrorState, LoadingSkeleton } from './AnalyticsStates';

export interface RecommendationsCardProps {
  year?: number;
  month?: number;
  refreshTick?: number;
}

const CATEGORY_BADGE_COLORS: Record<RecommendationCategory, string> = {
  Transportation: 'bg-[#DCEDE3] text-[#18392C]',
  Energy: 'bg-[#FEF3C7] text-[#92400E]',
  Lifestyle: 'bg-[#E0F2FE] text-[#075985]',
  'Goal Tracking': 'bg-[#F3F4F6] text-[#374151]',
  'Getting Started': 'bg-[#DCEDE3] text-[#176B52]',
};

export function RecommendationsCard({
  year,
  month,
  refreshTick = 0,
}: RecommendationsCardProps) {
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [periodLabel, setPeriodLabel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRecommendations({ year, month });
      setItems(data.recommendations);
      setPeriodLabel(data.period.monthLabel);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load sustainability recommendations.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations, refreshTick]);

  return (
    <Card className="flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <CardHeader
            title="Sustainability Tips"
            description={
              periodLabel
                ? `Rule-based guidance from your ${periodLabel} activities and goals.`
                : 'Rule-based guidance generated from your recorded activities.'
            }
          />
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#DCEDE3] text-[#176B52]">
            <Lightbulb className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <LoadingSkeleton variant="table" label="Evaluating sustainability recommendations..." />
          ) : error ? (
            <AnalyticsErrorState message={error} onRetry={() => void loadRecommendations()} />
          ) : (
            items.map((tip) => (
              <div
                key={tip.id}
                className="rounded-lg border border-[#E1EAE4] bg-[#F6F8F3] p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={[
                      'inline-block rounded px-2 py-0.5 text-[11px] font-semibold',
                      CATEGORY_BADGE_COLORS[tip.category] ?? 'bg-[#DCEDE3] text-[#18392C]',
                    ].join(' ')}
                  >
                    {tip.category}
                  </span>
                </div>
                <p className="text-sm font-semibold text-[#18392C]">{tip.title}</p>
                <p className="text-xs leading-relaxed text-[#42544B]">{tip.description}</p>
                <p className="text-[11px] text-[#64766C]">{tip.reason}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#E1EAE4] flex items-center justify-between gap-2 text-xs text-[#64766C]">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#176B52]" aria-hidden="true" />
          <span>Deterministic rule engine (no AI estimates)</span>
        </span>
        <Link
          to="/goals"
          className="font-medium text-[#176B52] hover:text-[#18392C] underline-offset-2 hover:underline whitespace-nowrap"
        >
          Manage goals
        </Link>
      </div>
    </Card>
  );
}
