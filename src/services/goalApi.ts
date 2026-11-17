import { apiRequest } from './apiClient';
import { invalidateAnalyticsData } from './analyticsRefresh';
import type {
  CurrentGoalResponse,
  GoalPayload,
  MonthlyGoalRecord,
} from '../types/ecotrack';

export async function fetchGoals(): Promise<MonthlyGoalRecord[]> {
  const data = await apiRequest<{ items?: MonthlyGoalRecord[] }>('/api/goals');
  return Array.isArray(data?.items) ? data.items : [];
}

export async function fetchCurrentGoal(params: {
  year?: number;
  month?: number;
} = {}): Promise<CurrentGoalResponse> {
  const sp = new URLSearchParams();
  if (params.year !== undefined) sp.set('year', String(params.year));
  if (params.month !== undefined) sp.set('month', String(params.month));
  const qs = sp.toString();
  const url = qs ? `/api/goals/current?${qs}` : '/api/goals/current';
  return apiRequest<CurrentGoalResponse>(url);
}

export async function createGoal(
  payload: GoalPayload
): Promise<{ message: string; goal: MonthlyGoalRecord }> {
  const result = await apiRequest<{ message: string; goal: MonthlyGoalRecord }>('/api/goals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  invalidateAnalyticsData();
  return result;
}

export async function updateGoal(
  id: string,
  payload: GoalPayload
): Promise<{ message: string; goal: MonthlyGoalRecord }> {
  const result = await apiRequest<{ message: string; goal: MonthlyGoalRecord }>(
    `/api/goals/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
  invalidateAnalyticsData();
  return result;
}

export async function deleteGoal(id: string): Promise<{ message: string }> {
  const result = await apiRequest<{ message: string }>(`/api/goals/${id}`, {
    method: 'DELETE',
  });
  invalidateAnalyticsData();
  return result;
}
