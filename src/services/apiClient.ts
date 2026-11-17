export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    code?: string,
    fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let cachedCsrfToken: string | null = null;

export function setCachedCsrfToken(token: string | null): void {
  cachedCsrfToken = token;
}

export async function fetchCsrfToken(forceRefresh = false): Promise<string> {
  if (cachedCsrfToken && !forceRefresh) {
    return cachedCsrfToken;
  }

  const response = await fetch('/api/auth/csrf', {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new ApiError('Unable to obtain security token.', response.status);
  }

  const data = (await response.json()) as { csrfToken?: string };
  if (!data.csrfToken) {
    throw new ApiError('Missing CSRF token from server.', 500);
  }

  cachedCsrfToken = data.csrfToken;
  return cachedCsrfToken;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  retryOnCsrfFailure = true
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (MUTATING_METHODS.has(method)) {
    const csrfToken = await fetchCsrfToken(false);
    headers.set('X-CSRF-Token', csrfToken);
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });

  let payload: Record<string, unknown> = {};
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  }

  if (!response.ok) {
    const code = typeof payload.code === 'string' ? payload.code : undefined;

    if (response.status === 403 && code === 'CSRF_INVALID' && retryOnCsrfFailure) {
      await fetchCsrfToken(true);
      return apiRequest<T>(url, options, false);
    }

    const message =
      typeof payload.error === 'string'
        ? payload.error
        : `Request failed with status ${response.status}.`;
    const fields =
      typeof payload.fields === 'object' && payload.fields !== null
        ? (payload.fields as Record<string, string>)
        : undefined;

    throw new ApiError(message, response.status, code, fields);
  }

  if (typeof payload.csrfToken === 'string') {
    cachedCsrfToken = payload.csrfToken;
  }

  return payload as T;
}
