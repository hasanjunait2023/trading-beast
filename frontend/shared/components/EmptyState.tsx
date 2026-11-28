import React from 'react';

export interface EmptyStateProps {
  title: string;
  message?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, message, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      {icon}
      <p className="text-base font-bold text-[var(--color-text)]">{title}</p>
      {message && (
        <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{message}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
