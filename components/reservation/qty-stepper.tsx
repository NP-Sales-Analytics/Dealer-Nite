'use client';

import { Minus, Plus } from 'lucide-react';

/**
 * Stepper jumlah. Dirancang untuk dipakai satu tangan sambil berdiri:
 * dua target 48x48px dan angka yang tetap bisa diketik untuk rombongan besar.
 * Mayoritas kasus qty 1-3, jadi keyboard tidak perlu muncul sama sekali.
 */
export function QtyStepper({
  value,
  onChange,
  id = 'qty',
  min = 0,
  max = 1000,
  ariaLabel = 'Jumlah orang yang hadir',
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  /** Batas bawah. Dipakai Tambah Order untuk mengunci pengambilan pertama. */
  min?: number;
  max?: number;
  ariaLabel?: string;
}) {
  const n = Number(value);
  const valid = value !== '' && Number.isInteger(n) && n >= 0;
  const step = (delta: number) => onChange(String(Math.min(max, Math.max(min, (valid ? n : 0) + delta))));

  return (
    <div className="flex items-stretch gap-3">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={valid && n <= min}
        aria-label="Kurangi satu"
        className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground shadow-xs transition-colors hover:bg-secondary disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Minus className="size-5" />
      </button>

      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-card text-center text-2xl font-semibold tabular-nums text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
      />

      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Tambah satu"
        className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground shadow-xs transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Plus className="size-5" />
      </button>
    </div>
  );
}
