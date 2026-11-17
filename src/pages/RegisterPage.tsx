import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { BrandLogo } from '../components/ui/BrandLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/apiClient';
import type { FieldErrors, RegisterFormValues } from '../types/ecotrack';
import { validateRegisterForm } from '../utils/activityCatalog';

export function RegisterPage() {
  const { user, isLoading, register } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState<RegisterFormValues>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<
    FieldErrors<'fullName' | 'email' | 'password' | 'confirmPassword'>
  >({});
  const [formBannerError, setFormBannerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormBannerError(null);

    const nextErrors = validateRegisterForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFormBannerError('Please fix the validation errors below to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(values);
      navigate('/login', {
        replace: true,
        state: {
          registrationSuccess: true,
          registeredEmail: values.email.trim().toLowerCase(),
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) {
          setErrors(
            error.fields as FieldErrors<
              'fullName' | 'email' | 'password' | 'confirmPassword'
            >
          );
        }
        setFormBannerError(error.message);
      } else {
        setFormBannerError('Unable to reach the registration server. Please try again.');
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
            to="/register"
            className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52] rounded-lg"
          >
            <BrandLogo />
          </Link>
          <Link
            to="/login"
            className="text-sm font-medium text-[#176B52] hover:text-[#18392C] transition-colors whitespace-nowrap"
          >
            Sign in
          </Link>
        </div>

        <Card padding="lg">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18392C]">
              Create your account
            </h1>
            <p className="mt-1.5 text-sm text-[#64766C]">
              Start tracking daily carbon emissions and set monthly sustainability targets.
            </p>
          </div>

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
              label="Full name"
              type="text"
              name="fullName"
              autoComplete="name"
              placeholder="e.g. Ananya Sharma"
              value={values.fullName}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, fullName: e.target.value }));
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
              }}
              error={errors.fullName}
              required
            />

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
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              hint="Use at least 8 characters."
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

            <Input
              label="Confirm password"
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={values.confirmPassword}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, confirmPassword: e.target.value }));
                if (errors.confirmPassword) {
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              error={errors.confirmPassword}
              required
              rightAdornment={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#64766C] hover:bg-[#F6F8F3] hover:text-[#18392C] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
                >
                  {showConfirmPassword ? (
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
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-[#64766C]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-[#176B52] hover:text-[#18392C] underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
