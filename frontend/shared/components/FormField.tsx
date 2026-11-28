import React, { useId } from 'react';

const controlClasses =
  'w-full min-h-[40px] rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] transition-colors disabled:opacity-50';

function borderClass(error?: string) {
  return error
    ? 'border-[var(--color-danger)]'
    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent)]';
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ error, className = '', ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={`${controlClasses} ${borderClass(error)} ${className}`}
        {...rest}
      />
    );
  },
);

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ error, className = '', children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={`${controlClasses} ${borderClass(error)} ${className}`}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ error, className = '', ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={`${controlClasses} py-2 ${borderClass(error)} ${className}`}
        {...rest}
      />
    );
  },
);

export interface FormFieldProps {
  label: string;
  /** Validation error — rendered adjacent to the control and linked via aria. */
  error?: string;
  hint?: string;
  /** The control element (Input / Select / Textarea). Its id is wired to the label. */
  children: React.ReactElement<{
    id?: string;
    error?: string;
    'aria-describedby'?: string;
  }>;
}

/**
 * Label + control + adjacent error text. Clones the single child control to
 * wire id / aria-describedby / error automatically.
 */
export function FormField({ label, error, hint, children }: FormFieldProps) {
  const autoId = useId();
  const childId = children.props.id ?? autoId;
  const errorId = `${childId}-error`;
  const hintId = `${childId}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') ||
    undefined;

  const control = React.cloneElement(children, {
    id: childId,
    error,
    'aria-describedby': describedBy,
  });

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={childId}
        className="text-sm font-medium text-[var(--color-text)]"
      >
        {label}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-[var(--color-text-muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
