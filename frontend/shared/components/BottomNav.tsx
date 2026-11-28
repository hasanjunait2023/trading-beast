import type { NavItem } from './Sidebar';

export interface BottomNavProps {
  items: NavItem[];
  className?: string;
}

/**
 * Small-screen bottom navigation: fixed, safe-area padded, active state is
 * icon + label + accent (never color alone). Only show enabled destinations.
 */
export function BottomNav({ items, className = '' }: BottomNavProps) {
  return (
    <nav
      aria-label="Primary"
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] ${className}`}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const classes = `relative flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10.5px] font-medium ${
            item.active
              ? 'font-semibold text-[var(--color-accent)]'
              : 'text-[var(--color-text-muted)]'
          }`;
          const content = (
            <>
              {item.active && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 h-[3px] w-8 rounded-full bg-[var(--color-accent)]"
                />
              )}
              {item.icon && (
                <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center">
                  {item.icon}
                </span>
              )}
              <span className="max-w-full truncate">{item.label}</span>
            </>
          );
          return item.href ? (
            <a
              key={item.id}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              onClick={item.onSelect ? () => item.onSelect?.(item.id) : undefined}
              className={classes}
            >
              {content}
            </a>
          ) : (
            <button
              key={item.id}
              type="button"
              aria-current={item.active ? 'page' : undefined}
              onClick={() => item.onSelect?.(item.id)}
              className={classes}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
