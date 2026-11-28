import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  active?: boolean;
  onSelect?: (id: string) => void;
}

export interface SidebarProps {
  items: NavItem[];
  brand?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

function NavLink({ item }: { item: NavItem }) {
  const classes = `flex min-h-[40px] items-center gap-2.5 rounded-[var(--radius-md)] px-3 text-sm font-medium transition-colors ${
    item.active
      ? 'bg-[var(--color-accent-soft)] font-semibold text-[var(--color-text)]'
      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
  }`;
  const content = (
    <>
      {item.icon && (
        <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center">
          {item.icon}
        </span>
      )}
      <span className="truncate">{item.label}</span>
    </>
  );
  if (item.href) {
    return (
      <a
        href={item.href}
        aria-current={item.active ? 'page' : undefined}
        onClick={item.onSelect ? () => item.onSelect?.(item.id) : undefined}
        className={classes}
      >
        {content}
      </a>
    );
  }
  return (
    <button
      type="button"
      aria-current={item.active ? 'page' : undefined}
      onClick={() => item.onSelect?.(item.id)}
      className={`${classes} w-full text-left`}
    >
      {content}
    </button>
  );
}

/** Desktop left rail (~224px, handoff §2). Hidden below lg by AppShell. */
export function Sidebar({ items, brand, footer, className = '' }: SidebarProps) {
  return (
    <aside
      className={`flex w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}
    >
      {brand && <div className="px-4 pt-4 pb-2.5">{brand}</div>}
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {items.map((item) => (
          <NavLink key={item.id} item={item} />
        ))}
      </nav>
      {footer && <div className="px-3 py-3">{footer}</div>}
    </aside>
  );
}
