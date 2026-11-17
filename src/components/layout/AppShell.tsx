import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Target,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../ui/BrandLogo';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  end?: boolean;
}

const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/add-activity', label: 'Add Activity', icon: PlusCircle },
  { to: '/history', label: 'Activity History', icon: History },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/goals', label: 'Goals & Settings', icon: Target },
];

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/add-activity': 'Add Activity',
  '/history': 'Activity History',
  '/analytics': 'Analytics',
  '/goals': 'Goals & Settings',
};

function SidebarLinks({
  onNavigate,
  onLogout,
  isLoggingOut,
  userName,
  userEmail,
}: {
  onNavigate?: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
  userName?: string;
  userEmail?: string;
}) {
  const linkClassName = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]',
      isActive
        ? 'bg-[#DCEDE3] text-[#18392C]'
        : 'text-[#64766C] hover:bg-[#F6F8F3] hover:text-[#18392C]',
    ].join(' ');

  return (
    <div className="flex flex-1 flex-col justify-between px-3 py-5">
      <nav aria-label="Primary navigation" className="space-y-1">
        <p className="px-3 pb-2 text-xs font-semibold text-[#64766C]">Workspace</p>
        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={linkClassName}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={[
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-[#176B52]' : 'text-[#64766C]',
                    ].join(' ')}
                    aria-hidden={true}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="pt-5 border-t border-[#E1EAE4] space-y-3">
        {userName ? (
          <div className="px-3">
            <p className="text-sm font-semibold text-[#18392C] truncate">{userName}</p>
            {userEmail ? (
              <p className="text-xs text-[#64766C] truncate">{userEmail}</p>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#64766C] hover:bg-[#F6F8F3] hover:text-[#18392C] transition-colors duration-150 whitespace-nowrap cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
        >
          <LogOut className="h-4 w-4 shrink-0 text-[#64766C]" aria-hidden={true} />
          <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  );
}

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentTitle = ROUTE_TITLES[location.pathname] ?? 'Overview';

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setMobileMenuOpen(false);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F6F8F3] text-[#18392C]">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-[#E1EAE4] bg-white">
        <div className="flex h-16 items-center px-6 border-b border-[#E1EAE4]">
          <Link
            to="/"
            className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52] rounded-lg"
          >
            <BrandLogo />
          </Link>
        </div>
        <SidebarLinks
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          userName={user?.fullName}
          userEmail={user?.email}
        />
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-40 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          <div
            className="fixed inset-0 bg-[#18392C]/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 flex w-72 max-w-[85vw] flex-col bg-white border-r border-[#E1EAE4] shadow-xl">
            <div className="flex h-16 items-center justify-between px-5 border-b border-[#E1EAE4]">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <BrandLogo />
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#64766C] hover:bg-[#F6F8F3] hover:text-[#18392C] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <SidebarLinks
              onNavigate={() => setMobileMenuOpen(false)}
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
              userName={user?.fullName}
              userEmail={user?.email}
            />
          </aside>
        </div>
      ) : null}

      {/* Main Content Column */}
      <div className="flex flex-1 flex-col min-w-0 lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[#E1EAE4] bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E1EAE4] text-[#18392C] hover:bg-[#F6F8F3] lg:hidden shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-[#64766C] whitespace-nowrap">EcoTrack</span>
              <span className="hidden sm:inline text-[#64766C]" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-[#18392C] truncate">{currentTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <Link
                to="/goals"
                className="hidden sm:inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-[#18392C] hover:bg-[#F6F8F3] transition-colors whitespace-nowrap shrink-0 max-w-[180px] truncate"
              >
                {user.fullName}
              </Link>
            ) : null}
            {location.pathname !== '/' && location.pathname !== '/add-activity' ? (
              <Link
                to="/add-activity"
                className="inline-flex items-center gap-2 rounded-lg bg-[#176B52] px-4 py-2 text-sm font-medium text-white hover:bg-[#18392C] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                <span>Add Activity</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#DCEDE3] px-3.5 py-2 text-sm font-medium text-[#18392C] hover:bg-[#CCE3D5] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B52]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
