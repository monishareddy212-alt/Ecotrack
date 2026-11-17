export type ActivityCategory = 'Transportation' | 'Energy' | 'Lifestyle';

export type ActivitySortOption =
  | 'date_desc'
  | 'date_asc'
  | 'emissions_desc'
  | 'emissions_asc';

export interface ActivityType {
  id: string;
  category: ActivityCategory;
  name: string;
  unit: string;
  isActive: boolean;
  hasEmissionFactor: boolean;
  latestFactorSource: string | null;
}

export interface EmissionFactor {
  id: string;
  activityTypeId: string;
  factorKgCo2ePerUnit: string;
  unit: string;
  source: string;
  sourceUrl: string | null;
  referenceYear: number | null;
  effectiveDate: string;
  geographicScope: string | null;
  notes: string | null;
}

export interface Activity {
  id: string;
  userId: string;
  activityTypeId: string;
  emissionFactorId: string;
  category: ActivityCategory;
  activityTypeName: string;
  quantity: number;
  quantityRaw: string;
  unit: string;
  calculatedCo2e: number;
  calculatedCo2eRaw: string;
  activityDate: string;
  createdAt: string;
  emissionFactor: EmissionFactor;
}

export interface ActivityCreateRequest {
  activityTypeId: string;
  quantity: string;
  unit: string;
  activityDate: string;
}

export type ActivityUpdateRequest = ActivityCreateRequest;

export interface ActivityListResponse {
  items: Activity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivitySummary {
  totalActivities: number;
  totalEmissionsKg: number;
  distinctActivityTypesCount: number;
  categoryTotals: Array<{
    category: ActivityCategory;
    totalEmissionsKg: number;
    activityCount: number;
  }>;
  mostRecentActivity: Activity | null;
}

export interface ActivityTypeOption {
  id: string;
  name: string;
  category: ActivityCategory;
  unit: string;
  helperText: string;
}

export interface ActivityFormValues {
  category: ActivityCategory;
  activityTypeId: string;
  quantity: string;
  unit: string;
  activityDate: string;
}

export interface ActivityRecord {
  id: string;
  category: ActivityCategory;
  activityTypeName: string;
  quantity: number;
  unit: string;
  emissionsKg: number;
  activityDate: string;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegisterFormValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface GoalFormValues {
  monthlyTargetKg: string;
  targetMonth: string;
}

export interface ProfileFormValues {
  fullName: string;
  email: string;
  reportingUnit: 'metric' | 'imperial';
  weeklyDigest: boolean;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

export type ComparisonDirection =
  | 'increase'
  | 'decrease'
  | 'no_change'
  | 'insufficient_data';

export interface AnalyticsPeriodMeta {
  year: number;
  month: number;
  monthKey: string;
  monthLabel: string;
  monthStart: string;
  nextMonthStart: string;
  totalDays: number;
  elapsedDays: number;
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
  reportingTimezone: string;
}

export interface MonthlyGoalStatus {
  id: string;
  goalMonth: string;
  targetCo2eKg: number;
  percentageUsed: number;
  remainingKg: number;
  status: 'within_target' | 'approaching_target' | 'at_target' | 'exceeded';
}

export interface CategoryBreakdownItem {
  category: ActivityCategory;
  totalEmissionsKg: number;
  percentageShare: number;
  activityCount: number;
}

export interface PeriodComparison {
  differenceKg: number;
  percentageChange: number | null;
  direction: ComparisonDirection;
  explanation: string;
}

export interface AnalyticsOverview {
  period: AnalyticsPeriodMeta;
  currentMonth: {
    totalEmissionsKg: number;
    activityCount: number;
    dailyAverageKg: number;
  };
  previousMonth: {
    monthKey: string;
    monthLabel: string;
    totalEmissionsKg: number;
    activityCount: number;
    sameWindowDays: number | null;
    sameWindowEmissionsKg: number | null;
  };
  comparison: PeriodComparison;
  sameWindowComparison: PeriodComparison | null;
  goal: MonthlyGoalStatus | null;
  highestCategory: CategoryBreakdownItem | null;
}

export interface MonthlyTrendPoint {
  year: number;
  month: number;
  monthKey: string;
  shortLabel: string;
  monthLabel: string;
  totalEmissionsKg: number;
  activityCount: number;
}

export interface MonthlyTrend {
  range: 6 | 12;
  endPeriod: {
    year: number;
    month: number;
    monthKey: string;
    monthLabel: string;
  };
  totalEmissionsKg: number;
  hasData: boolean;
  points: MonthlyTrendPoint[];
}

export interface CategoryBreakdown {
  period: AnalyticsPeriodMeta;
  totalEmissionsKg: number;
  totalActivities: number;
  hasData: boolean;
  categories: CategoryBreakdownItem[];
}

export interface DailyTrendPoint {
  date: string;
  dayNumber: number;
  label: string;
  totalEmissionsKg: number;
  activityCount: number;
}

export interface DailyTrend {
  period: AnalyticsPeriodMeta;
  totalEmissionsKg: number;
  totalActivities: number;
  hasData: boolean;
  points: DailyTrendPoint[];
}

export interface TopCategoryResult {
  period: AnalyticsPeriodMeta;
  totalEmissionsKg: number;
  topCategory: CategoryBreakdownItem | null;
  message: string;
}

export type GoalStatusCode =
  | 'NO_TARGET'
  | 'WITHIN_TARGET'
  | 'APPROACHING_TARGET'
  | 'AT_TARGET'
  | 'TARGET_EXCEEDED';

export interface GoalProgressData {
  hasGoal: boolean;
  targetCo2eKg: number | null;
  actualEmissionsKg: number;
  remainingKg: number | null;
  usagePercentage: number | null;
  status: GoalStatusCode;
  statusLabel: string;
  contextMessage: string;
}

export interface MonthlyGoalRecord {
  id: string;
  userId: string;
  goalMonth: string;
  monthKey: string;
  monthLabel: string;
  targetCo2eKg: number;
  actualEmissionsKg: number;
  activityCount: number;
  createdAt: string;
  progress: GoalProgressData;
}

export interface CurrentGoalResponse {
  period: AnalyticsPeriodMeta;
  goal: MonthlyGoalRecord | null;
  actualEmissionsKg: number;
  activityCount: number;
  progress: GoalProgressData;
}

export interface GoalPayload {
  goalMonth: string; // YYYY-MM or YYYY-MM-01
  targetCo2e: string;
}

export type RecommendationCategory =
  | 'Transportation'
  | 'Energy'
  | 'Lifestyle'
  | 'Goal Tracking'
  | 'Getting Started';

export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  reason: string;
}

export interface RecommendationsResponse {
  period: AnalyticsPeriodMeta;
  recommendations: RecommendationItem[];
}

export interface MonthlyCarbonReport {
  disclaimer: string;
  generatedAt: string;
  period: AnalyticsPeriodMeta;
  summary: {
    totalEmissionsKg: number;
    activityCount: number;
    dailyAverageKg: number;
  };
  categories: CategoryBreakdownItem[];
  highestCategory: CategoryBreakdownItem | null;
  highestCategoryMessage: string;
  goal: GoalProgressData;
  previousMonthComparison: {
    previousMonthLabel: string;
    previousMonthTotalKg: number;
    differenceKg: number;
    percentageChange: number | null;
    direction: ComparisonDirection;
    explanation: string;
  };
}

