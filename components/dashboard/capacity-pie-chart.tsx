'use client';

import { Cell, Label, Pie, PieChart } from 'recharts';
import type { Summary } from './dashboard-client';
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

// Warna mengikuti entitas, sama seperti di sebaran depot:
// oranye = yang benar-benar hadir, biru = sisa yang diundang.
const config = {
  hadir: { label: 'Hadir', color: 'var(--chart-2)' },
  belum: { label: 'Belum Hadir', color: 'var(--chart-1)' },
} satisfies ChartConfig;

function Donut({
  judul, hadir, total, satuan,
}: {
  judul: string;
  hadir: number;
  total: number;
  satuan: string;
}) {
  const persen = total > 0 ? Math.round((hadir / total) * 100) : 0;
  const data = [
    { key: 'hadir', name: 'Hadir', value: hadir, fill: 'var(--color-hadir)' },
    { key: 'belum', name: 'Belum Hadir', value: Math.max(total - hadir, 0), fill: 'var(--color-belum)' },
  ];

  return (
    <div className="min-w-0 p-4 sm:p-5">
      <h3 className="text-sm font-semibold">{judul}</h3>
      <ChartContainer config={config} className="mx-auto h-[210px] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} strokeWidth={2}>
            {data.map((d) => <Cell key={d.key} fill={d.fill} />)}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !('cx' in viewBox)) return null;
                const { cx, cy } = viewBox as { cx: number; cy: number };
                return (
                  <text x={cx} y={cy} textAnchor="middle">
                    <tspan x={cx} y={cy - 4} className="fill-foreground text-2xl font-bold">
                      {persen}%
                    </tspan>
                    <tspan x={cx} y={cy + 16} className="fill-muted-foreground text-[11px]">
                      hadir
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
          <ChartLegend content={<ChartLegendContent nameKey="key" />} />
        </PieChart>
      </ChartContainer>
      <p className="mt-1 text-center text-sm tabular-nums text-muted-foreground">
        <span className="font-semibold text-foreground">{hadir}</span> dari {total} {satuan}
      </p>
    </div>
  );
}

export function CapacityPieChart({ summary }: { summary: Summary }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      <div className="border-b border-border px-4 py-3.5 sm:px-5">
        <h2 className="font-semibold">Kehadiran</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Toko dibanding pax, supaya terlihat mana yang tertinggal
        </p>
      </div>
      {/* Bertumpuk atas-bawah agar persentase toko dan pax bisa dibandingkan sekilas. */}
      <Donut judul="Toko" hadir={summary.tokoCheckin} total={summary.totalToko} satuan="toko" />
      <div className="border-t border-border" />
      <Donut judul="Pax (orang)" hadir={summary.totalHadir} total={summary.totalUndangan} satuan="orang" />
    </div>
  );
}
