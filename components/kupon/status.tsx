import { CheckCircle2, Clock3, PackageCheck, Printer, type LucideIcon } from 'lucide-react';
import { formatRupiahRingkas } from '@/lib/target/money';
import { NAMA_KUPON, type JumlahKupon, type KonfigKupon, type StatusKupon } from '@/lib/target/kupon';
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

type Slot = 'pink' | 'hijau';
export type TemaSlot = {
  label: string; nilai: string; dot: string; teks: string; bar: string; barMuda: string; chip: string; cahaya: string;
};
export type TemaKupon = Record<Slot, TemaSlot>;

/** Kelas warna per warna fisik kupon. Putih diberi garis supaya terlihat di atas kartu putih. */
const GAYA: Record<string, Omit<TemaSlot, 'label' | 'nilai'>> = {
  Pink: {
    dot: 'bg-pink-500', teks: 'text-pink-600 dark:text-pink-300', bar: 'bg-pink-500', barMuda: 'bg-pink-300/70',
    chip: 'bg-pink-50 text-pink-700 ring-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:ring-pink-500/30', cahaya: 'bg-pink-300',
  },
  Hijau: {
    dot: 'bg-emerald-500', teks: 'text-emerald-600 dark:text-emerald-300', bar: 'bg-emerald-500', barMuda: 'bg-emerald-300/70',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30', cahaya: 'bg-emerald-300',
  },
  Putih: {
    dot: 'bg-white ring-1 ring-slate-400', teks: 'text-slate-700 dark:text-slate-200', bar: 'bg-slate-400', barMuda: 'bg-slate-300/70',
    chip: 'bg-white text-slate-700 ring-slate-300 dark:bg-slate-500/15 dark:text-slate-200 dark:ring-slate-500/30', cahaya: 'bg-slate-200',
  },
  Kuning: {
    dot: 'bg-yellow-400', teks: 'text-amber-600 dark:text-yellow-300', bar: 'bg-yellow-400', barMuda: 'bg-yellow-300/70',
    chip: 'bg-yellow-50 text-yellow-800 ring-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-300 dark:ring-yellow-500/30', cahaya: 'bg-yellow-300',
  },
};

/** "Rp100 juta", "Rp75 juta", "Rp1,5 M" untuk teks "1 kupon per ...". */
export const teksNilai = (nilai: number) => (nilai < 1_000_000_000
  ? `Rp${(nilai / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} juta`
  : formatRupiahRingkas(nilai));

/** Label, nilai, dan warna kupon sesuai skema & pembagi DN. */
export function temaKupon({ skema, nilai }: KonfigKupon): TemaKupon {
  const nama = NAMA_KUPON[skema];
  const slot = (s: Slot): TemaSlot => ({ label: nama[s], nilai: teksNilai(nilai[s]), ...GAYA[nama[s]] });
  return { pink: slot('pink'), hijau: slot('hijau') };
}

/** Bar bertingkat: diberikan (pekat) + sudah dibuat belum diberikan (muda) dari total hak. */
export function BarProses({ tema, hak, dibuat, diberikan, tipis = false }: {
  tema: TemaSlot; hak: number; dibuat: number; diberikan: number; tipis?: boolean;
}) {
  const persen = (n: number) => (hak > 0 ? Math.min(100, (n / hak) * 100) : 0);
  return (
    <div className={cn('flex overflow-hidden rounded-full bg-secondary', tipis ? 'h-1.5' : 'h-2.5')} aria-hidden>
      <div className={cn('h-full transition-[width] duration-500', tema.bar)} style={{ width: `${persen(diberikan)}%` }} />
      <div className={cn('h-full transition-[width] duration-500', tema.barMuda)} style={{ width: `${Math.max(0, persen(dibuat) - persen(diberikan))}%` }} />
    </div>
  );
}

/** "3/5" kecil per warna untuk sel tabel. */
export function RasioKupon({ nilai, dari, tema }: { nilai: JumlahKupon; dari: JumlahKupon; tema: TemaKupon }) {
  return (
    <span className="inline-flex flex-col items-center gap-0.5 text-xs tabular-nums">
      {(['pink', 'hijau'] as const).map((warna) => (
        <span key={warna} className="inline-flex items-center gap-1.5">
          <span className={cn('size-1.5 rounded-full', tema[warna].dot)} aria-hidden />
          <span className={cn('font-semibold', nilai[warna] >= dari[warna] && dari[warna] > 0 ? tema[warna].teks : '')}>{nilai[warna]}</span>
          <span className="text-muted-foreground">/ {dari[warna]}</span>
        </span>
      ))}
    </span>
  );
}
