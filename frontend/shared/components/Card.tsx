import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  padded?: boolean;
  children?: React.ReactNode;
}

export function Card({
  elevated = false,
  padded = true,
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] ${
        elevated
          ? 'bg-[var(--color-surface-elevated)] shadow-[var(--shadow-md)]'
          : 'bg-[var(--color-surface)] shadow-[var(--shadow-sm)]'
      } ${padded ? 'p-4' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
