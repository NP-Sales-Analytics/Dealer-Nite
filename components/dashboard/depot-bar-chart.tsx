'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';
import type { DepotRow } from '@/lib/dashboard/compute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const config = {
  qtyUndangan: { label: 'Diundang', color: 'var(--chart-1)' },
  qtyHadir: { label: 'Hadir', color: 'var(--chart-2)' },
} satisfies ChartConfig;

export function DepotBarChart({ rows }: { rows: DepotRow[] }) {
  const isMobile = useIsMobile();
  // 35 depot dengan nama panjang: batang horizontal, dan tinggi mengikuti jumlah
  // baris supaya label sumbu tidak saling tumpuk.
  const height = Math.max(320, rows.length * (isMobile ? 26 : 30));

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Kehadiran per Depot</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[420px] overflow-y-auto pr-1 sm:max-h-[560px] sm:pr-2">
          <ChartContainer config={config} style={{ height }} className="w-full">
            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }} barGap={2}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis
                type="category" dataKey="depot"
                width={isMobile ? 92 : 132} interval={0}
                tick={{ fontSize: isMobile ? 10 : 11 }} tickLine={false} axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="qtyUndangan" fill="var(--color-qtyUndangan)" radius={[0, 4, 4, 0]} />
              <Bar dataKey="qtyHadir" fill="var(--color-qtyHadir)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Tabel angka pasti: identitas tidak pernah bergantung warna saja,
            dan admin sering butuh angka persis, bukan panjang batang. */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Lihat sebagai tabel
          </summary>
          <div className="mt-2 max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-left">
                  <th className="py-1 font-medium">Depot</th>
                  <th className="py-1 text-right font-medium">Diundang</th>
                  <th className="py-1 text-right font-medium">Hadir</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.depot} className="border-b last:border-0">
                    <td className="py-1">{r.depot}</td>
                    <td className="py-1 text-right tabular-nums">{r.qtyUndangan}</td>
                    <td className="py-1 text-right tabular-nums">{r.qtyHadir}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
