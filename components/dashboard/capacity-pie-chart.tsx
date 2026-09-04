'use client';

import { Cell, Label, Pie, PieChart } from 'recharts';
import type { Summary } from '@/lib/dashboard/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

// Warna dipinjam persis dari sebaran depot: bar terisi memakai bg-primary di
// atas track bg-secondary. Dua panel ini bersebelahan, jadi memakai palet
// berbeda membuat biru di satu sisi seolah berarti hal lain di sisi satunya.
const config = {
  hadir: { label: 'Hadir', color: 'var(--primary)' },
  belum: { label: 'Belum Hadir', color: 'var(--secondary)' },
} satisfies ChartConfig;

function Donut({
  judul, keterangan, hadir, total, satuan,
}: {
  judul: string;
  keterangan: string;
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
      <p className="mt-0.5 text-xs text-muted-foreground">{keterangan}</p>

      {/* Cincin tebal dengan lubang besar: angka persen jadi elemen utama dan
          cincinnya berperan sebagai bingkai, bukan sebaliknya. */}
      <ChartContainer config={config} className="mx-auto h-[210px] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="92%"
            startAngle={90}
            endAngle={-270}
            paddingAngle={0}
            strokeWidth={0}
          >
            {data.map((d) => <Cell key={d.key} fill={d.fill} />)}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !('cx' in viewBox)) return null;
                const { cx, cy } = viewBox as { cx: number; cy: number };
                return (
                  <text x={cx} y={cy} textAnchor="middle">
                    <tspan x={cx} y={cy - 3} className="fill-foreground text-3xl font-bold tabular-nums">
                      {persen}%
                    </tspan>
                    <tspan x={cx} y={cy + 18} className="fill-muted-foreground text-[11px] tabular-nums">
                      {hadir} / {total} {satuan}
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      {/* Legenda ditulis tangan, bukan ChartLegend bawaan: yang bawaan menaruh
          titik warna kotak kecil dan jaraknya rapat. Di sini titik bulat dan
          lega, meniru referensi. */}
      <div className="-mt-1 flex items-center justify-center gap-5">
        {data.map((d) => (
          <span key={d.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.fill }} aria-hidden />
            {d.name}
          </span>
        ))}
      </div>
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
      <Donut
        judul="Toko"
        keterangan="Toko hadir terhadap toko diundang"
        hadir={summary.tokoCheckin}
        total={summary.totalToko}
        satuan="toko"
      />
      <div className="border-t border-border" />
      <Donut
        judul="Pax (orang)"
        keterangan="Orang hadir terhadap kuota undangan"
        hadir={summary.totalHadir}
        total={summary.totalUndangan}
        satuan="orang"
      />
    </div>
  );
}
