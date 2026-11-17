import { apiRequest } from './apiClient';
import { invalidateAnalyticsData } from './analyticsRefresh';
import type {
  Activity,
  ActivityCategory,
  ActivityCreateRequest,
  ActivityListResponse,
  ActivitySortOption,
  ActivitySummary,
  ActivityType,
  ActivityUpdateRequest,
} from '../types/ecotrack';

export interface ActivityListQueryParams {
  category?: ActivityCategory | 'All';
  activityTypeId?: string;
  startDate?: string;
  endDate?: string;
  minEmissions?: string;
  maxEmissions?: string;
  search?: string;
  sort?: ActivitySortOption;
  page?: number;
  limit?: number;
}

function buildFilterSearchParams(params: ActivityListQueryParams): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (params.category && params.category !== 'All') {
    searchParams.set('category', params.category);
  }
  if (params.activityTypeId) {
    searchParams.set('activityTypeId', params.activityTypeId);
  }
  if (params.startDate) {
    searchParams.set('startDate', params.startDate);
  }
  if (params.endDate) {
    searchParams.set('endDate', params.endDate);
  }
  if (params.minEmissions !== undefined && params.minEmissions.trim() !== '') {
    searchParams.set('minEmissions', params.minEmissions.trim());
  }
  if (params.maxEmissions !== undefined && params.maxEmissions.trim() !== '') {
    searchParams.set('maxEmissions', params.maxEmissions.trim());
  }
  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  return searchParams;
}

export async function fetchActivityTypes(): Promise<ActivityType[]> {
  const data = await apiRequest<{ items: ActivityType[] }>('/api/activity-types');
  return data.items;
}

export async function createActivity(
  payload: ActivityCreateRequest
): Promise<{ message: string; activity: Activity }> {
  const result = await apiRequest<{ message: string; activity: Activity }>('/api/activities', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  invalidateAnalyticsData();
  return result;
}

export async function fetchActivities(
  params: ActivityListQueryParams = {}
): Promise<ActivityListResponse> {
  const searchParams = buildFilterSearchParams(params);
  if (params.sort) {
    searchParams.set('sort', params.sort);
  }
  if (params.page !== undefined) {
    searchParams.set('page', String(params.page));
  }
  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  const query = searchParams.toString();
  const url = query ? `/api/activities?${query}` : '/api/activities';
  return apiRequest<ActivityListResponse>(url);
}

export async function fetchActivityById(id: string): Promise<Activity> {
  const data = await apiRequest<{ activity: Activity }>(`/api/activities/${id}`);
  return data.activity;
}

export async function updateActivity(
  id: string,
  payload: ActivityUpdateRequest
): Promise<{ message: string; activity: Activity }> {
  const result = await apiRequest<{ message: string; activity: Activity }>(`/api/activities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  invalidateAnalyticsData();
  return result;
}

export async function deleteActivity(id: string): Promise<{ message: string }> {
  const result = await apiRequest<{ message: string }>(`/api/activities/${id}`, {
    method: 'DELETE',
  });
  invalidateAnalyticsData();
  return result;
}

export async function fetchActivitySummary(
  params: Omit<ActivityListQueryParams, 'sort' | 'page' | 'limit'> = {}
): Promise<ActivitySummary> {
  const searchParams = buildFilterSearchParams(params);
  const query = searchParams.toString();
  const url = query ? `/api/activities/summary?${query}` : '/api/activities/summary';
  const data = await apiRequest<{ summary: ActivitySummary }>(url);
  return data.summary;
}
