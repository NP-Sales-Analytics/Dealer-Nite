import { CheckCircle2, Percent, Store, Users } from 'lucide-react';
import type { ComponentType } from 'react';
import type { Summary } from './dashboard-client';

/** Pola "Metric Item" dari design.md: ikon dalam kotak netral, label kecil, angka besar. */
function Kpi({
  icon: Icon, label, value, unit,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
      <span className="grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground sm:size-12">
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

export function KpiCards({ summary }: { summary: Summary }) {
  return (
    // 2 kolom di HP: empat kartu bertumpuk satu kolom memaksa scroll panjang
    // sebelum sampai ke chart.
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Kpi icon={Users} label="Total Undangan" value={String(summary.totalUndangan)} unit="orang" />
      <Kpi icon={CheckCircle2} label="Total Hadir" value={String(summary.totalHadir)} unit="orang" />
      <Kpi icon={Store} label="Toko Check-in" value={String(summary.tokoCheckin)} unit={`dari ${summary.totalToko} toko`} />
      <Kpi icon={Percent} label="Persentase Kehadiran" value={`${summary.persentase}%`} unit="dari total undangan" />
    </div>
  );
}
