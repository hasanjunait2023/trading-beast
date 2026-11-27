import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isTelegram } from '../telegram';
import {
  LayoutDashboard,
  Target,
  List,
  Gem,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Menu
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/focus', label: 'Focus List', icon: Target },
  { path: '/watchlist', label: 'Watchlist', icon: List },
  { path: '/subscription', label: 'Subscription', icon: Gem },
  { path: '/referral', label: 'Referral', icon: Users },
  { path: '/payments', label: 'Payments', icon: CreditCard },
  { path: '/settings', label: 'Settings', icon: Settings }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Inside Telegram: compact chrome — no desktop sidebar, just a slim top
  // bar (brand, tier, logout), a scrollable nav strip, and bottom padding
  // for the Telegram / device safe area. Browser layout below is unchanged.
  if (isTelegram()) {
    return (
      <div className="flex flex-col h-screen bg-[var(--color-bg)]">
        <header className="sticky top-0 z-20 bg-[var(--color-surface)]/90 backdrop-blur-sm border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between gap-3 h-14 px-4 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-black" />
              </div>
              <h1 className="font-display font-semibold truncate">Session Focus</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                {user?.tier || 'FREE'}
              </span>
              <button
                onClick={logout}
                className="btn btn-ghost p-2 text-red-400 hover:text-red-300"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          <nav className="flex gap-1 px-3 pb-2 overflow-x-auto" aria-label="Primary">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-[var(--color-accent)] text-black font-medium'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--color-bg)]">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-[var(--color-border)]">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
              <Target className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-lg">Session Focus</h1>
              <p className="text-xs text-[var(--color-text-muted)]">Market Analysis</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[var(--color-accent)] text-black font-medium'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-black font-medium">
                {user?.firstName?.[0] || user?.username?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.firstName || user?.username || 'User'}</p>
                <p className="text-xs text-[var(--color-text-muted)]">@{user?.username || user?.telegramId}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="btn btn-ghost w-full justify-start gap-2 text-red-400 hover:text-red-300"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-[var(--color-surface)]/80 backdrop-blur-sm border-b border-[var(--color-border)] lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="btn btn-ghost p-2"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-display font-semibold">Session Focus Radar</h1>
            <div className="w-12" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}