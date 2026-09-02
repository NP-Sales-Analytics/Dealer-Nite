'use client';

import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { useState } from 'react';
import type { RecentRow } from './dashboard-client';
import { EditCheckinDialog } from './edit-checkin-dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// checked_in_at datang sebagai string mentah driver ("2026-09-02 06:15:05.88+00").
// JANGAN ubah spasi jadi "T": offset "+00" tanpa menit bukan ISO valid, dan
// parser jadi strict lalu mengembalikan Invalid Date. Bentuk aslinya justru
// diterima. Zona dipaku ke Asia/Jakarta supaya jam tidak ikut timezone perangkat.
const jam = (v: string) =>
  new Date(v).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });

// Buang prefiks badan usaha supaya inisial mewakili nama tokonya, bukan "PT".
const inisial = (nama: string) =>
  nama
    .replace(/^(PT|CV)[.\s]+/i, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

function Avatar({ nama }: { nama: string }) {
  return (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground"
      aria-hidden
    >
      {inisial(nama)}
    </span>
  );
}

/** Pill jumlah hadir; berubah merah kalau melebihi jumlah undangan. */
function PillHadir({ hadir, undangan }: { hadir: number; undangan: number | null }) {
  const lebih = undangan !== null && hadir > undangan;
  return (
    <span
      className={
        lebih
          ? 'inline-flex items-center rounded-full bg-[#FEF3F2] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#B42318]'
          : 'inline-flex items-center rounded-full bg-[#ECFDF3] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#027A48]'
      }
      title={undangan !== null ? `Diundang ${undangan} orang` : undefined}
    >
      {hadir} hadir
    </span>
  );
}

function PillWaktu({ nilai }: { nilai: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-xs font-medium tabular-nums text-accent-foreground">
      {jam(nilai)}
    </span>
  );
}

export function RecentCheckinList({
  rows,
  page,
  totalPages,
  total,
  depots,
  onPageChange,
  onChanged,
}: {
  rows: RecentRow[];
  page: number;
  totalPages: number;
  total: number;
  depots: string[];
  onPageChange: (p: number) => void;
  onChanged: () => void;
}) {
  const [edit, setEdit] = useState<RecentRow | null>(null);
  const mulai = (page - 1) * 20;

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3.5 sm:px-5">
        <div>
          <h2 className="font-semibold">Check-in Terbaru</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Klik Edit untuk mengoreksi jumlah hadir atau depot
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {total} catatan
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground sm:p-5">Belum ada kehadiran tercatat.</p>
      ) : (
        <>
          {/* HP: kartu. Lima kolom tidak muat di 375px. */}
          <ul className="divide-y divide-border md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                <Avatar nama={r.nama} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 font-medium leading-snug">
                    <span className="min-w-0 break-words">{r.nama}</span>
                    {r.isManualEntry && <Badge variant="outline" className="shrink-0">Manual</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.depot}
                    {r.depotDiubah && ' (diubah)'}
                    {r.kodeSap && ` · ${r.kodeSap}`}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <PillHadir hadir={r.qtyHadir} undangan={r.qtyUndangan} />
                    <PillWaktu nilai={r.checkedInAt} />
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEdit(r)}
                  aria-label={`Ubah catatan ${r.nama}`}
                  className="grid size-10 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Pencil className="size-4" />
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Depot</TableHead>
                  <TableHead>Nama Customer</TableHead>
                  <TableHead>Hadir</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead className="text-right">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {r.depot}
                      {r.depotDiubah && (
                        <span className="ml-1 text-xs text-accent-foreground">(diubah)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar nama={r.nama} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-medium leading-snug">
                            <span className="min-w-0 break-words">{r.nama}</span>
                            {r.isManualEntry && <Badge variant="outline" className="shrink-0">Manual</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.kodeSap ?? 'Tanpa kode SAP'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><PillHadir hadir={r.qtyHadir} undangan={r.qtyUndangan} /></TableCell>
                    <TableCell><PillWaktu nilai={r.checkedInAt} /></TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => setEdit(r)}
                        aria-label={`Ubah catatan ${r.nama}`}
                        className="ml-auto grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <Pencil className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-5">
            <p className="text-xs text-muted-foreground">
              Menampilkan {mulai + 1}&ndash;{Math.min(mulai + rows.length, total)} dari {total} catatan
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                aria-label="Halaman sebelumnya"
                className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="px-2 text-xs tabular-nums text-muted-foreground">
                {page}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                aria-label="Halaman berikutnya"
                className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </>
      )}

      <EditCheckinDialog
        row={edit}
        depots={depots}
        onOpenChange={(v) => !v && setEdit(null)}
        onSaved={onChanged}
      />
    </div>
  );
}
