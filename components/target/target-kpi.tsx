import { Target, TrendingUp, Trophy, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { TargetRow } from './types';
import { formatRupiahRingkas } from '@/lib/target/money';
import { cn } from '@/lib/utils';

/** Angka KPI Target DN untuk sekumpulan toko (satu Dealer Night, atau depot terpilih). */
export function hitungKpiTarget(rows: TargetRow[], targetDn: number) {
  const verified = rows.filter((row) => row.verifiedAt);
  const pencapaian = verified.reduce((sum, row) => sum + row.targetEfektif, 0);
  const penambahan = verified.reduce((sum, row) => sum + row.targetEfektif - (row.targetVerifikasi ?? row.targetEfektif), 0);
  return {
    targetDn,
    pencapaian,
    persen: targetDn > 0 ? (pencapaian / targetDn) * 100 : null,
    penambahan,
    tokoVerified: verified.length,
    tokoMenyesuaikan: verified.filter((row) => row.targetEfektif !== row.targetVerifikasi).length,
    totalToko: rows.length,
  };
}

function Kartu({ icon: Icon, label, children, aksen }: {
  icon: LucideIcon; label: string; children: React.ReactNode; aksen: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-4 py-3.5 shadow-xs">
      <div className={cn('pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-50 blur-2xl', aksen)} aria-hidden />
      <div className="relative flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-foreground/80" aria-hidden>
          <Icon className="size-3.5" />
        </span>
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <div className="relative mt-2">{children}</div>
    </div>
  );
}

/**
 * `kpi` mencakup seluruh Dealer Night; `kpiDepot` hanya depot yang difilter.
 * Target DN diatur per Dealer Night, bukan per depot, jadi Total Target dan
 * Persentase tetap seluruh DN - hanya Pencapaian dan Penambahan yang ikut depot.
 */
export function TargetKpi({ kpi, kpiDepot, bisaAtur }: {
  kpi: ReturnType<typeof hitungKpiTarget>;
  kpiDepot: ReturnType<typeof hitungKpiTarget>;
  bisaAtur: boolean;
}) {
  const persen = kpi.persen === null ? null : Math.round(kpi.persen * 10) / 10;
  const naik = kpiDepot.penambahan >= 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kartu icon={Target} label="Total Target DN" aksen="bg-primary/30">
        {kpi.targetDn > 0 ? (
          <>
            <p className="text-xl font-bold tracking-tight tabular-nums">{formatRupiahRingkas(kpi.targetDn)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">target seluruh Dealer Night</p>
          </>
        ) : (
          <>
            <p className="text-xl font-bold tracking-tight text-muted-foreground">Belum diatur</p>
            {bisaAtur ? (
              <Link href="/setting/pax" className="mt-0.5 inline-block text-xs font-medium text-primary hover:underline">
                Atur di Setting Target DN
              </Link>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">Menunggu diatur Super Admin</p>
            )}
          </>
        )}
      </Kartu>

      <Kartu icon={Trophy} label="Pencapaian Malam DN" aksen="bg-amber-300/40">
        <p className="text-xl font-bold tracking-tight tabular-nums">{formatRupiahRingkas(kpiDepot.pencapaian)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          dari <span className="font-semibold text-foreground tabular-nums">{kpiDepot.tokoVerified}</span>/{kpiDepot.totalToko} toko terverifikasi
        </p>
      </Kartu>

      <Kartu icon={TrendingUp} label="Persentase Pencapaian" aksen="bg-emerald-300/40">
        <p className="text-xl font-bold tracking-tight tabular-nums">
          {persen === null ? '–' : `${persen.toLocaleString('id-ID')}%`}
        </p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
          <div
            className={cn('h-full rounded-full transition-[width] duration-500', (persen ?? 0) >= 100 ? 'bg-emerald-500' : 'bg-primary')}
            style={{ width: `${Math.min(100, persen ?? 0)}%` }}
          />
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {persen === null ? 'Total Target DN belum diatur' : persen >= 100 ? 'Target tercapai' : 'Pencapaian terhadap Total Target DN'}
        </p>
      </Kartu>

      <Kartu icon={TrendingUp} label="Total Penambahan" aksen={naik ? 'bg-emerald-300/40' : 'bg-red-300/40'}>
        <p className={cn('text-xl font-bold tracking-tight tabular-nums', kpiDepot.penambahan > 0 ? 'text-emerald-600' : kpiDepot.penambahan < 0 ? 'text-destructive' : '')}>
          {kpiDepot.penambahan > 0 ? '+' : ''}{formatRupiahRingkas(kpiDepot.penambahan)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          setelah verifikasi · <span className="font-semibold text-foreground tabular-nums">{kpiDepot.tokoMenyesuaikan}</span> toko menyesuaikan
        </p>
      </Kartu>
    </div>
  );
}
