import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '@shared/theme';
import { Button } from '@shared/components/Button';
import {
  LayoutDashboard, Users, CreditCard, BarChart3, Activity, Send,
  Settings, LogOut, Menu, X, Crown, Wallet, Coins, Sun, Moon,
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/metrics', label: 'Metrics', icon: BarChart3 },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/subscriptions', label: 'Subscriptions', icon: Crown },
  { path: '/payments', label: 'Payments', icon: CreditCard },
  { path: '/finance', label: 'Finance', icon: Wallet },
  { path: '/credits', label: 'Credits', icon: Coins },
  { path: '/analysis', label: 'Analysis', icon: Activity },
  { path: '/telegram', label: 'Telegram', icon: Send },
  { path: '/settings', label: 'Settings', icon: Settings },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--grad-accent)]">
        <Activity className="h-5 w-5 text-white" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-bold text-[var(--color-text)]">TradingBeast</p>
        <p className="text-xs text-[var(--color-text-muted)]">Admin Portal</p>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const nav = (
    <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
      {NAV.map((item) => {
        const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-[44px] items-center gap-3 rounded-[var(--radius-md)] px-3 text-[15px] font-medium transition-colors ${
              active
                ? 'bg-[var(--color-accent-soft)] font-semibold text-[var(--color-text)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-[var(--color-border)] px-3 py-3">
      <p className="truncate px-2 text-sm font-medium text-[var(--color-text)]">
        {user?.firstName || 'Admin'}
        {user?.username ? <span className="text-[var(--color-text-muted)]"> @{user.username}</span> : null}
      </p>
      <Button variant="ghost" size="sm" onClick={handleLogout} className="mt-1 w-full justify-start">
        <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:flex">
        <div className="px-4 pt-5 pb-3"><Brand /></div>
        {nav}
        {footer}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 h-full w-full bg-black/50" />
          <aside className="relative flex h-full w-64 flex-col bg-[var(--color-surface)]">
            <div className="flex items-center justify-between px-4 pt-5 pb-3">
              <Brand />
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[var(--color-surface-hover)]">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-[56px] items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[var(--color-surface-hover)] lg:hidden">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="lg:hidden"><Brand /></span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            ariaLabel={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          >
            {theme === 'light' ? <Moon className="h-5 w-5" aria-hidden="true" /> : <Sun className="h-5 w-5" aria-hidden="true" />}
            <span className="hidden sm:inline">{theme === 'light' ? 'Dark' : 'Light'}</span>
          </Button>
        </header>
        <main className="tb-page-enter mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-10 sm:px-6" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
