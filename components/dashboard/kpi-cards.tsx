import { CheckCircle2, Store, UserCheck, Users } from 'lucide-react';
import type { ComponentType } from 'react';
import type { Summary } from './dashboard-client';

/** Pola "Metric Item" dari design.md: ikon dalam kotak netral, label kecil, angka besar. */
function Kpi({
  icon: Icon, label, value, unit, tone = 'netral',
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit: string;
  tone?: 'netral' | 'hadir';
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
      <span
        className={
          tone === 'hadir'
            ? 'grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground sm:size-12'
            : 'grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground sm:size-12'
        }
      >
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-sm text-muted-foreground sm:mt-4">{label}</p>
      <p className="text-2xl font-bold leading-tight tracking-tight tabular-nums sm:text-3xl">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{unit}</p>
    </div>
  );
}

const persen = (bagian: number, total: number) =>
  total > 0 ? `${Math.round((bagian / total) * 100)}% dari total` : 'belum ada data';

export function KpiCards({ summary }: { summary: Summary }) {
  return (
    // Dua baris di HP; toko lebih dulu karena itu ukuran utama kehadiran,
    // jumlah pax menyusul sebagai detail.
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Kpi
        icon={Store}
        label="Toko Diundang"
        value={String(summary.totalToko)}
        unit="toko terdaftar"
      />
      <Kpi
        icon={CheckCircle2}
        tone="hadir"
        label="Toko Hadir"
        value={String(summary.tokoCheckin)}
        unit={persen(summary.tokoCheckin, summary.totalToko)}
      />
      <Kpi
        icon={Users}
        label="Pax Diundang"
        value={String(summary.totalUndangan)}
        unit="orang"
      />
      <Kpi
        icon={UserCheck}
        tone="hadir"
        label="Pax Hadir"
        value={String(summary.totalHadir)}
        unit={persen(summary.totalHadir, summary.totalUndangan)}
      />
    </div>
  );
}
