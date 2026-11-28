import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[var(--color-danger)]">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 8v5M12 16.5v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="text-base font-bold text-[var(--color-text)]">{title}</p>
      <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{message}</p>
      {onRetry && (
        <div className="mt-2">
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
