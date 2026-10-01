'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  onBatas,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  /** Batas bawah jumlah yang dapat dipilih. */
  min?: number;
  max?: number;
  ariaLabel?: string;
  /**
   * Dipanggil saat tombol ditekan padahal sudah mentok.
   *
   * Tombolnya sengaja TIDAK memakai atribut `disabled`: tombol mati tidak
   * mengirim event klik sama sekali, jadi orang menekannya berulang tanpa
   * pernah tahu kenapa tidak terjadi apa-apa. Dengan aria-disabled ia tetap
   * terlihat mati tapi masih bisa menjelaskan dirinya.
   */
  onBatas?: (arah: 'atas' | 'bawah') => void;
}) {
  const n = Number(value);
  const valid = value !== '' && Number.isInteger(n) && n >= 0;
  const diBawah = valid && n <= min;
  const diAtas = valid && n >= max;

  const step = (delta: number) =>
    onChange(String(Math.min(max, Math.max(min, (valid ? n : 0) + delta))));

  const tombol =
    'grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground shadow-xs ' +
    'transition-colors hover:bg-secondary aria-disabled:opacity-40 aria-disabled:hover:bg-card ' +
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

  return (
    <div className="flex min-w-0 items-stretch gap-3">
      <button
        type="button"
        onClick={() => (diBawah ? onBatas?.('bawah') : step(-1))}
        aria-disabled={diBawah}
        aria-label="Kurangi satu"
        className={cn(tombol)}
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
        onClick={() => (diAtas ? onBatas?.('atas') : step(1))}
        aria-disabled={diAtas}
        aria-label="Tambah satu"
        className={cn(tombol)}
      >
        <Plus className="size-5" />
      </button>
    </div>
  );
}
