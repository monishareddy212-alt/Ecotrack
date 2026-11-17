import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { BrandLogo } from '../components/ui/BrandLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/apiClient';
import type { FieldErrors, LoginFormValues } from '../types/ecotrack';
import { validateLoginForm } from '../utils/activityCatalog';

interface LoginLocationState {
  from?: { pathname?: string };
  registrationSuccess?: boolean;
  registeredEmail?: string;
}

export function LoginPage() {
  const { user, isLoading, login, sessionExpiredMessage, clearSessionExpiredMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LoginLocationState | null) ?? null;

  const [values, setValues] = useState<LoginFormValues>({
    email: state?.registeredEmail ?? '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<'email' | 'password'>>({});
  const [formBannerError, setFormBannerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearSessionExpiredMessage();
    setFormBannerError(null);

    const nextErrors = validateLoginForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFormBannerError('Please correct the highlighted fields before signing in.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(values);
      const targetPath = state?.from?.pathname && state.from.pathname !== '/login'
        ? state.from.pathname
        : '/';
      navigate(targetPath, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) {
          setErrors(error.fields as FieldErrors<'email' | 'password'>);
        }
        setFormBannerError(error.message);
      } else {
        setFormBannerError('Unable to reach the authentication server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-[#F6F8F3] px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/login"
            className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52] rounded-lg"
          >
            <BrandLogo />
          </Link>
          <Link
            to="/register"
            className="text-sm font-medium text-[#176B52] hover:text-[#18392C] transition-colors whitespace-nowrap"
          >
            Create account
          </Link>
        </div>

        <Card padding="lg">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18392C]">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-[#64766C]">
              Sign in to view your carbon activity logs and monthly sustainability goals.
            </p>
          </div>

          {state?.registrationSuccess && !formBannerError ? (
            <div
              role="status"
              className="mt-5 flex items-start gap-2.5 rounded-lg border border-[#BCE0CA] bg-[#DCEDE3]/60 px-3.5 py-3 text-sm text-[#18392C]"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#176B52]" aria-hidden="true" />
              <span>Account created successfully. Sign in with your email and password.</span>
            </div>
          ) : null}

          {sessionExpiredMessage && !formBannerError ? (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-lg border border-[#F4B860] bg-[#FEF9EE] px-3.5 py-3 text-sm text-[#18392C]"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#B45309]" aria-hidden="true" />
              <span>{sessionExpiredMessage}</span>
            </div>
          ) : null}

          {formBannerError ? (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3 text-sm text-[#991B1B]"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{formBannerError}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <Input
              label="Email address"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, email: e.target.value }));
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              error={errors.email}
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={values.password}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, password: e.target.value }));
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              required
              rightAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#64766C] hover:bg-[#F6F8F3] hover:text-[#18392C] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              }
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-[#64766C]">
            Don&apos;t have an account yet?{' '}
            <Link
              to="/register"
              className="font-semibold text-[#176B52] hover:text-[#18392C] underline-offset-2 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
