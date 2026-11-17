export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: Record<string, string>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateRegisterPayload(body: unknown): ValidationResult<RegisterPayload> {
  const errors: Record<string, string> = {};
  const input = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;

  const rawName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  const rawEmail = typeof input.email === 'string' ? normalizeEmail(input.email) : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const confirmPassword = typeof input.confirmPassword === 'string' ? input.confirmPassword : '';

  if (rawName.length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  } else if (rawName.length > 150) {
    errors.fullName = 'Full name must be 150 characters or fewer.';
  }

  if (!rawEmail) {
    errors.email = 'Email address is required.';
  } else if (rawEmail.length > 255 || !EMAIL_REGEX.test(rawEmail)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (password.length > 128) {
    errors.password = 'Password must be 128 characters or fewer.';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    data: {
      fullName: rawName,
      email: rawEmail,
      password,
      confirmPassword,
    },
  };
}

export function validateLoginPayload(body: unknown): ValidationResult<LoginPayload> {
  const errors: Record<string, string> = {};
  const input = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;

  const rawEmail = typeof input.email === 'string' ? normalizeEmail(input.email) : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (!rawEmail) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(rawEmail)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    data: {
      email: rawEmail,
      password,
    },
  };
}

export function validateProfileUpdatePayload(body: unknown): ValidationResult<{ fullName: string }> {
  const errors: Record<string, string> = {};
  const input = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const rawName = typeof input.fullName === 'string' ? input.fullName.trim() : '';

  if (rawName.length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  } else if (rawName.length > 150) {
    errors.fullName = 'Full name must be 150 characters or fewer.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    data: { fullName: rawName },
  };
}
