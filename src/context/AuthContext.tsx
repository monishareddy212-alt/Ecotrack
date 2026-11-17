import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  ApiError,
  apiRequest,
  setCachedCsrfToken,
} from '../services/apiClient';
import type {
  AuthUser,
  LoginFormValues,
  RegisterFormValues,
} from '../types/ecotrack';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  sessionExpiredMessage: string | null;
  login: (values: LoginFormValues) => Promise<AuthUser>;
  register: (values: RegisterFormValues) => Promise<{ message: string; user: AuthUser }>;
  logout: () => Promise<void>;
  updateProfile: (fullName: string) => Promise<AuthUser>;
  refreshSession: () => Promise<void>;
  clearSessionExpiredMessage: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const data = await apiRequest<{ user: AuthUser; csrfToken?: string }>('/api/auth/me');
      setUser(data.user);
      setSessionExpiredMessage(null);
    } catch (error) {
      setUser((prevUser) => {
        if (prevUser !== null && error instanceof ApiError && error.status === 401) {
          setSessionExpiredMessage('Your session has expired. Please sign in again.');
        }
        return null;
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (values: LoginFormValues): Promise<AuthUser> => {
    const data = await apiRequest<{ user: AuthUser; csrfToken?: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      }
    );
    setUser(data.user);
    setSessionExpiredMessage(null);
    return data.user;
  }, []);

  const register = useCallback(
    async (values: RegisterFormValues): Promise<{ message: string; user: AuthUser }> => {
      return apiRequest<{ message: string; user: AuthUser }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(values),
      });
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiRequest<{ message: string }>('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      setCachedCsrfToken(null);
      setUser(null);
      setSessionExpiredMessage(null);
    }
  }, []);

  const updateProfile = useCallback(async (fullName: string): Promise<AuthUser> => {
    try {
      const data = await apiRequest<{ user: AuthUser }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName }),
      });
      setUser(data.user);
      return data.user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setSessionExpiredMessage('Your session has expired. Please sign in again.');
      }
      throw error;
    }
  }, []);

  const clearSessionExpiredMessage = useCallback(() => {
    setSessionExpiredMessage(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        sessionExpiredMessage,
        login,
        register,
        logout,
        updateProfile,
        refreshSession,
        clearSessionExpiredMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
