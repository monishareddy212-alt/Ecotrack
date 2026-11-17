import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { BrandLogo } from '../ui/BrandLogo';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F6F8F3] px-4 text-[#18392C]"
      >
        <BrandLogo />
        <p className="text-sm font-medium text-[#64766C]">Checking active session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
