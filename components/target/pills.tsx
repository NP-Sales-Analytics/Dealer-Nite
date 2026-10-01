import { BadgeCheck, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Satu chip kupon; warnanya mengikuti warna fisik kupon undian. */
export function ChipKupon({ warna, jumlah, besar = false }: { warna: 'pink' | 'hijau'; jumlah: number; besar?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold tabular-nums ring-1 ring-inset',
        besar ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs',
        warna === 'pink'
          ? 'bg-pink-50 text-pink-700 ring-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:ring-pink-500/30'
          : 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
      )}
    >
      <span className={cn('size-2 rounded-full', warna === 'pink' ? 'bg-pink-500' : 'bg-emerald-500')} aria-hidden />
      {jumlah} {warna === 'pink' ? 'Pink' : 'Hijau'}
    </span>
  );
}

export function PillStatus({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
      <BadgeCheck className="size-3.5" aria-hidden />
      Terverifikasi
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
      <Clock3 className="size-3.5" aria-hidden />
      Belum verifikasi
    </span>
  );
}

export function PillHadir({ qtyHadir }: { qtyHadir: number | null }) {
  const hadir = qtyHadir !== null;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        hadir ? 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300' : 'bg-secondary text-muted-foreground',
      )}
      title={hadir ? `${qtyHadir} orang tercatat hadir` : undefined}
    >
      {hadir ? 'Sudah Hadir' : 'Belum Hadir'}
    </span>
  );
}
