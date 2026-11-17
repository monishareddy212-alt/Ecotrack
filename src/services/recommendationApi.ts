import { apiRequest } from './apiClient';
import type { RecommendationsResponse } from '../types/ecotrack';

export async function fetchRecommendations(params: {
  year?: number;
  month?: number;
} = {}): Promise<RecommendationsResponse> {
  const sp = new URLSearchParams();
  if (params.year !== undefined) sp.set('year', String(params.year));
  if (params.month !== undefined) sp.set('month', String(params.month));
  const qs = sp.toString();
  const url = qs ? `/api/recommendations?${qs}` : '/api/recommendations';
  return apiRequest<RecommendationsResponse>(url);
}
