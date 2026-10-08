import { BadgeCheck, Clock3 } from 'lucide-react';
import type { TemaSlot } from '@/components/kupon/status';
import { LABEL_STATUS_PAX, statusPax, type StatusPax } from '@/lib/reservation/pax';
import { cn } from '@/lib/utils';

/** Satu chip kupon; warna dan labelnya mengikuti warna fisik kupon DN (TemaSlot). */
export function ChipKupon({ tema, jumlah, besar = false }: { tema: TemaSlot; jumlah: number; besar?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold tabular-nums ring-1 ring-inset',
        besar ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs',
        tema.chip,
      )}
    >
      <span className={cn('size-2 rounded-full', tema.dot)} aria-hidden />
      {jumlah} {tema.label}
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

const WARNA_STATUS_PAX: Record<StatusPax, string> = {
  sesuai: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
  melebihi: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30',
  kurang: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30',
};

/** Pax hadir vs pax terdaftar: hijau sesuai, merah melebihi, biru kurang. */
export function PillStatusPax({ hadir, terdaftar }: { hadir: number; terdaftar: number | null }) {
  const status = statusPax(hadir, terdaftar);
  if (!status) {
    return <span className="text-xs text-muted-foreground" title="Pax terdaftar belum didata">&mdash;</span>;
  }
  return (
    <span
      className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', WARNA_STATUS_PAX[status])}
      title={`${hadir} hadir dari ${terdaftar} pax terdaftar`}
    >
      {LABEL_STATUS_PAX[status]}
    </span>
  );
}
