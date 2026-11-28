import React from 'react';
import { Sidebar, type NavItem } from './Sidebar';
import { BottomNav } from './BottomNav';

export interface AppShellProps {
  navItems: NavItem[];
  brand?: React.ReactNode;
  /** Right side of the top bar (credit pill, session badge, theme toggle…). */
  headerRight?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Responsive app shell (handoff §2):
 *  - ≥1024px: left sidebar + sticky top bar.
 *  - <1024px: compact top bar + fixed bottom nav (content padded clear of it).
 */
export function AppShell({
  navItems,
  brand,
  headerRight,
  sidebarFooter,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="sticky top-0 hidden h-screen lg:flex">
        <Sidebar items={navItems} brand={brand} footer={sidebarFooter} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-[50px] items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="lg:hidden">{brand}</span>
            <span className="hidden lg:block" aria-hidden="true" />
          </div>
          {headerRight && (
            <div className="flex shrink-0 items-center gap-2">{headerRight}</div>
          )}
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-3.5 pb-24 sm:px-6 lg:pb-8">
          {children}
        </main>
      </div>
      <div className="lg:hidden">
        <BottomNav items={navItems} />
      </div>
    </div>
  );
}
