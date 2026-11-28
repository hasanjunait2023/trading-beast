import React, { useRef } from 'react';

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}

/** Keyboard-accessible tabs: arrow keys move, Home/End jump, aria-selected set. */
export function Tabs({ tabs, activeId, onChange, ariaLabel }: TabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = (index: number) => {
    const el = refs.current[index];
    if (el) el.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabled = tabs
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => !t.disabled);
    if (enabled.length === 0) return;
    const pos = enabled.findIndex(({ i }) => i === index);
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = enabled[(pos + 1) % enabled.length].i;
    else if (e.key === 'ArrowLeft')
      next = enabled[(pos - 1 + enabled.length) % enabled.length].i;
    else if (e.key === 'Home') next = enabled[0].i;
    else if (e.key === 'End') next = enabled[enabled.length - 1].i;
    if (next !== null) {
      e.preventDefault();
      onChange(tabs[next].id);
      focusTab(next);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex gap-1 overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] p-1"
    >
      {tabs.map((tab, i) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={active ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`min-h-[40px] shrink-0 rounded-[var(--radius-sm)] px-4 text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-40 ${
              active
                ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
