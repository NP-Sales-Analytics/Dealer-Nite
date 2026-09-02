import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { RecentRow } from './dashboard-client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function RecentCheckinList({ rows }: { rows: RecentRow[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Check-in Terbaru</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada kehadiran tercatat.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Depot</TableHead>
                <TableHead className="text-right">Hadir</TableHead>
                <TableHead className="text-right">Waktu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.nama} {r.isManualEntry && <Badge variant="outline">Manual</Badge>}
                  </TableCell>
                  <TableCell>{r.depot}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.qtyHadir}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {format(new Date(r.checkedInAt), 'HH:mm', { locale: id })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
