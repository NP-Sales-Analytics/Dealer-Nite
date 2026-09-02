import type { Summary } from './dashboard-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function KpiCards({ summary }: { summary: Summary }) {
  const items = [
    { label: 'Total Undangan', value: `${summary.totalUndangan}`, unit: 'orang' },
    { label: 'Total Hadir', value: `${summary.totalHadir}`, unit: 'orang' },
    { label: 'Toko Check-in', value: `${summary.tokoCheckin}`, unit: `dari ${summary.totalToko} toko` },
    { label: 'Persentase Kehadiran', value: `${summary.persentase}%`, unit: 'dari total undangan' },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((i) => (
        <Card key={i.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">{i.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{i.value}</p>
            <p className="text-xs text-muted-foreground">{i.unit}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
