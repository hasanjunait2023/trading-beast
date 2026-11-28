import React, { useEffect, useRef } from 'react';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Bottom sheet — the small-screen variant of Modal (handoff §2): anchored to
 * the bottom edge, safe-area padded, Esc/backdrop close. Use for short
 * secondary choices; keep the primary CTA above the keyboard area.
 */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement;
    const sheet = sheetRef.current;
    if (sheet) {
      const focusable = sheet.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (focusable ?? sheet).focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="presentation">
      <button
        type="button"
        aria-label="Close sheet"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/50"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[var(--shadow-lg)]"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border-strong)]" aria-hidden="true" />
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-[var(--color-text)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="text-sm text-[var(--color-text)]">{children}</div>
        {footer && <div className="mt-5 flex flex-col gap-2">{footer}</div>}
      </div>
    </div>
  );
}
