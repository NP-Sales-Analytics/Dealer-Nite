'use client';

import { cn } from '@/lib/utils';

export const nomorUndianValid = (value: string) => /^\d{1,20}$/.test(value);

export function NomorUndianInput({ id, value, onChange, className, autoFocus }: {
  id: string;
  autoFocus?: boolean;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <input
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 20))}
      inputMode="numeric"
      enterKeyHint="done"
      autoFocus={autoFocus}
      autoComplete="off"
      placeholder="Contoh: 0123"
      className={cn(
        'h-12 w-full min-w-0 rounded-xl border border-border bg-card px-4 text-center text-2xl font-semibold tabular-nums',
        'placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground',
        'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none',
        className,
      )}
    />
  );
}
