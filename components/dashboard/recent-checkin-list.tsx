import type { RecentRow } from './dashboard-client';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// checked_in_at datang sebagai string mentah driver ("2026-09-02 06:15:05.88+00").
// JANGAN ubah spasi jadi "T": offset "+00" tanpa menit bukan ISO valid, dan
// parser jadi strict lalu mengembalikan Invalid Date. Bentuk aslinya justru
// diterima. Zona dipaku ke Asia/Jakarta supaya jam tidak ikut timezone perangkat.
const jam = (v: string) =>
  new Date(v).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  });

export function RecentCheckinList({ rows }: { rows: RecentRow[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-xs">
      <div className="border-b border-border px-4 py-3.5 sm:px-5">
        <h2 className="font-semibold">Check-in Terbaru</h2>
      </div>

      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground sm:p-5">Belum ada kehadiran tercatat.</p>
      ) : (
        <>
          {/* HP: daftar kartu. Tabel 4 kolom tidak muat di 375px. */}
          <ul className="divide-y divide-border md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 font-medium leading-snug">
                    <span className="min-w-0 break-words">{r.nama}</span>
                    {r.isManualEntry && <Badge variant="outline" className="shrink-0">Manual</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.depot} · {jam(r.checkedInAt)}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-secondary px-2.5 py-1 text-sm font-semibold tabular-nums">
                  {r.qtyHadir}
                </span>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
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
                      {jam(r.checkedInAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
