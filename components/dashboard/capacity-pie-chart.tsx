'use client';

import { Cell, Label, Pie, PieChart } from 'recharts';
import type { Summary } from './dashboard-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

// Warna mengikuti entitas, sama seperti di bar chart:
// oranye = kehadiran aktual, biru = sisa kapasitas undangan.
const config = {
  hadir: { label: 'Hadir', color: 'var(--chart-2)' },
  belumHadir: { label: 'Belum Hadir', color: 'var(--chart-1)' },
} satisfies ChartConfig;

export function CapacityPieChart({ summary }: { summary: Summary }) {
  const data = [
    { key: 'hadir', name: 'Hadir', value: summary.totalHadir, fill: 'var(--color-hadir)' },
    {
      key: 'belumHadir',
      name: 'Belum Hadir',
      value: Math.max(summary.totalUndangan - summary.totalHadir, 0),
      fill: 'var(--color-belumHadir)',
    },
  ];

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Kapasitas vs Aktual</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="mx-auto h-[300px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={64} strokeWidth={2}>
              {data.map((d) => <Cell key={d.key} fill={d.fill} />)}
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !('cx' in viewBox)) return null;
                  const { cx, cy } = viewBox as { cx: number; cy: number };
                  return (
                    <text x={cx} y={cy} textAnchor="middle">
                      <tspan x={cx} y={cy - 4} className="fill-foreground text-3xl font-semibold">
                        {summary.persentase}%
                      </tspan>
                      <tspan x={cx} y={cy + 18} className="fill-muted-foreground text-xs">
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
        <p className="mt-2 text-center text-sm text-muted-foreground tabular-nums">
          {summary.totalHadir} dari {summary.totalUndangan} orang
        </p>
      </CardContent>
    </Card>
  );
}
