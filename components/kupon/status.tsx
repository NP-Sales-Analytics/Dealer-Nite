import { CheckCircle2, Clock3, PackageCheck, Printer, type LucideIcon } from 'lucide-react';
import type { JumlahKupon, StatusKupon } from '@/lib/target/kupon';
import { cn } from '@/lib/utils';

export const STATUS_KUPON: Record<StatusKupon, { label: string; icon: LucideIcon; pill: string; tile: string }> = {
  belum_verifikasi: {
    label: 'Belum Verifikasi',
    icon: Clock3,
    pill: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    tile: 'text-amber-600 bg-amber-50 dark:bg-amber-500/15',
  },
  perlu_dibuat: {
    label: 'Perlu Dibuat',
    icon: Printer,
    pill: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    tile: 'text-sky-600 bg-sky-50 dark:bg-sky-500/15',
  },
  siap_diberikan: {
    label: 'Siap Diberikan',
    icon: PackageCheck,
    pill: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    tile: 'text-violet-600 bg-violet-50 dark:bg-violet-500/15',
  },
  selesai: {
    label: 'Selesai',
    icon: CheckCircle2,
    pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    tile: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15',
  },
};

export function PillStatusKupon({ status }: { status: StatusKupon }) {
  const meta = STATUS_KUPON[status];
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', meta.pill)}>
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

export const WARNA = {
  pink: { label: 'Pink', nilai: 'Rp100 juta', dot: 'bg-pink-500', teks: 'text-pink-600 dark:text-pink-300', bar: 'bg-pink-500', barMuda: 'bg-pink-300/70' },
  hijau: { label: 'Hijau', nilai: 'Rp25 juta', dot: 'bg-emerald-500', teks: 'text-emerald-600 dark:text-emerald-300', bar: 'bg-emerald-500', barMuda: 'bg-emerald-300/70' },
} as const;

/** Bar bertingkat: diberikan (pekat) + sudah dibuat belum diberikan (muda) dari total hak. */
export function BarProses({ warna, hak, dibuat, diberikan, tipis = false }: {
  warna: keyof typeof WARNA; hak: number; dibuat: number; diberikan: number; tipis?: boolean;
}) {
  const persen = (n: number) => (hak > 0 ? Math.min(100, (n / hak) * 100) : 0);
  return (
    <div className={cn('flex overflow-hidden rounded-full bg-secondary', tipis ? 'h-1.5' : 'h-2.5')} aria-hidden>
      <div className={cn('h-full transition-[width] duration-500', WARNA[warna].bar)} style={{ width: `${persen(diberikan)}%` }} />
      <div className={cn('h-full transition-[width] duration-500', WARNA[warna].barMuda)} style={{ width: `${Math.max(0, persen(dibuat) - persen(diberikan))}%` }} />
    </div>
  );
}

/** "3/5" kecil per warna untuk sel tabel. */
export function RasioKupon({ nilai, dari }: { nilai: JumlahKupon; dari: JumlahKupon }) {
  return (
    <span className="inline-flex flex-col items-center gap-0.5 text-xs tabular-nums">
      {(['pink', 'hijau'] as const).map((warna) => (
        <span key={warna} className="inline-flex items-center gap-1.5">
          <span className={cn('size-1.5 rounded-full', WARNA[warna].dot)} aria-hidden />
          <span className={cn('font-semibold', nilai[warna] >= dari[warna] && dari[warna] > 0 ? WARNA[warna].teks : '')}>{nilai[warna]}</span>
          <span className="text-muted-foreground">/ {dari[warna]}</span>
        </span>
      ))}
    </span>
  );
}
