import type {
  ActivityCategory,
  ActivityFormValues,
  ActivityTypeOption,
  FieldErrors,
  GoalFormValues,
  LoginFormValues,
  RegisterFormValues,
} from '../types/ecotrack';

export const ACTIVITY_CATEGORIES: readonly ActivityCategory[] = [
  'Transportation',
  'Energy',
  'Lifestyle',
];

export const ACTIVITY_TYPES: readonly ActivityTypeOption[] = [
  {
    id: 'car',
    name: 'Car',
    category: 'Transportation',
    unit: 'km',
    helperText: 'Personal passenger vehicle distance traveled',
  },
  {
    id: 'motorcycle',
    name: 'Motorcycle',
    category: 'Transportation',
    unit: 'km',
    helperText: 'Two-wheeler commute or trip distance',
  },
  {
    id: 'bus',
    name: 'Bus',
    category: 'Transportation',
    unit: 'km',
    helperText: 'Public or intercity bus travel distance',
  },
  {
    id: 'metro',
    name: 'Metro',
    category: 'Transportation',
    unit: 'km',
    helperText: 'Urban rail or subway transit distance',
  },
  {
    id: 'electricity',
    name: 'Electricity',
    category: 'Energy',
    unit: 'kWh',
    helperText: 'Household or workspace grid electricity usage',
  },
  {
    id: 'lpg',
    name: 'LPG',
    category: 'Energy',
    unit: 'kg',
    helperText: 'Liquefied petroleum cooking gas consumption',
  },
  {
    id: 'plant-meal',
    name: 'Plant-Based Meal',
    category: 'Lifestyle',
    unit: 'meals',
    helperText: 'Vegetarian or vegan meal servings consumed',
  },
  {
    id: 'meat-meal',
    name: 'Meat-Based Meal',
    category: 'Lifestyle',
    unit: 'meals',
    helperText: 'Meat-containing meal servings consumed',
  },
];

export function getActivityTypesByCategory(category: ActivityCategory): ActivityTypeOption[] {
  return ACTIVITY_TYPES.filter((item) => item.category === category);
}

export function getActivityTypeById(activityTypeId: string): ActivityTypeOption | undefined {
  return ACTIVITY_TYPES.find((item) => item.id === activityTypeId);
}

export function getDefaultUnitForActivityType(activityTypeId: string): string {
  return getActivityTypeById(activityTypeId)?.unit ?? '';
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateActivityForm(
  values: ActivityFormValues
): FieldErrors<'category' | 'activityTypeId' | 'quantity' | 'activityDate'> {
  const errors: FieldErrors<'category' | 'activityTypeId' | 'quantity' | 'activityDate'> = {};

  if (!ACTIVITY_CATEGORIES.includes(values.category)) {
    errors.category = 'Please select a valid activity category.';
  }

  const matchedType = getActivityTypeById(values.activityTypeId);
  if (!matchedType || matchedType.category !== values.category) {
    errors.activityTypeId = 'Please choose an activity type matching the selected category.';
  }

  const numericQty = Number(values.quantity);
  if (!values.quantity.trim() || Number.isNaN(numericQty) || numericQty <= 0) {
    errors.quantity = 'Enter a quantity greater than 0.';
  } else if (numericQty > 1000000) {
    errors.quantity = 'Quantity seems unusually large. Please verify your entry.';
  }

  if (!values.activityDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(values.activityDate)) {
    errors.activityDate = 'Select a valid activity date.';
  }

  return errors;
}

export function validateLoginForm(values: LoginFormValues): FieldErrors<'email' | 'password'> {
  const errors: FieldErrors<'email' | 'password'> = {};

  if (!values.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  return errors;
}

export function validateRegisterForm(
  values: RegisterFormValues
): FieldErrors<'fullName' | 'email' | 'password' | 'confirmPassword'> {
  const errors: FieldErrors<'fullName' | 'email' | 'password' | 'confirmPassword'> = {};

  if (!values.fullName.trim() || values.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  }

  if (!values.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

export function validateGoalForm(
  values: GoalFormValues
): FieldErrors<'monthlyTargetKg' | 'targetMonth'> {
  const errors: FieldErrors<'monthlyTargetKg' | 'targetMonth'> = {};

  const target = Number(values.monthlyTargetKg);
  if (!values.monthlyTargetKg.trim() || Number.isNaN(target) || target <= 0) {
    errors.monthlyTargetKg = 'Enter a monthly carbon target greater than 0 kg CO₂e.';
  } else if (target > 100000) {
    errors.monthlyTargetKg = 'Monthly target must be 100,000 kg CO₂e or less.';
  }

  if (!values.targetMonth.trim() || !/^\d{4}-\d{2}$/.test(values.targetMonth)) {
    errors.targetMonth = 'Select a valid target month.';
  }

  return errors;
}

export function formatCarbonValue(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(2)} kg CO₂e`;
}

export function buildCsvHeaders(): readonly string[] {
  return [
    'Date',
    'Category',
    'Activity Type',
    'Quantity',
    'Unit',
    'Estimated Emissions (kg CO2e)',
  ];
}
