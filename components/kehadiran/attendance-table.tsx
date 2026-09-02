'use client';

import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { EditCheckinDialog } from './edit-checkin-dialog';
import { HapusCheckinDialog } from './hapus-checkin-dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AttendanceRow } from '@/lib/dashboard/types';

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

/** Pill jumlah pax; berubah merah kalau melebihi jumlah undangan. */
function PillPax({ hadir, undangan }: { hadir: number; undangan: number | null }) {
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
      {hadir} Pax
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

function TombolAksi({
  row, onEdit, onHapus,
}: {
  row: AttendanceRow;
  onEdit: () => void;
  onHapus: () => void;
}) {
  return (
    // 44px di HP sesuai aturan target sentuh; di desktop dengan mouse 36px cukup.
    <div className="flex items-center gap-1.5">
      {/* Hapus berdiri sendiri, bukan tersembunyi di dalam dialog edit:
          membatalkan salah-catat adalah aksi tersering setelah salah ketik. */}
      <button
        type="button"
        onClick={onHapus}
        aria-label={`Hapus catatan ${row.nama}`}
        title="Hapus"
        className="grid size-11 place-items-center rounded-lg border border-border text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:size-9"
      >
        <Trash2 className="size-4" />
      </button>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Ubah catatan ${row.nama}`}
        title="Ubah"
        className="grid size-11 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:size-9"
      >
        <Pencil className="size-4" />
      </button>
    </div>
  );
}

export function AttendanceTable({
  rows, page, totalPages, total, pageSize, depots, adaFilter, bisaUbah, onPageChange, onChanged,
}: {
  rows: AttendanceRow[];
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  depots: string[];
  adaFilter: boolean;
  bisaUbah: boolean;
  onPageChange: (p: number) => void;
  onChanged: () => void;
}) {
  const [edit, setEdit] = useState<AttendanceRow | null>(null);
  const [hapus, setHapus] = useState<AttendanceRow | null>(null);
  const mulai = (page - 1) * pageSize;

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
        <p className="font-medium">
          {adaFilter ? 'Tidak ada toko yang cocok' : 'Belum ada kehadiran tercatat'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {adaFilter
            ? 'Coba ganti region atau depot, atau kosongkan kata kuncinya.'
            : 'Catatan akan muncul di sini begitu admin mulai mencatat tamu di halaman Pencatatan.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card shadow-xs">
      {/* HP: kartu. Lima kolom tidak muat di 375px. */}
      <ul className="divide-y divide-border md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="flex items-start gap-3 px-4 py-4">
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
              <p className="mt-2 flex flex-wrap items-center gap-1.5">
                <PillPax hadir={r.qtyHadir} undangan={r.qtyUndangan} />
                <PillWaktu nilai={r.checkedInAt} />
              </p>
            </div>
            {bisaUbah && (
              <TombolAksi row={r} onEdit={() => setEdit(r)} onHapus={() => setHapus(r)} />
            )}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-4">Depot</TableHead>
              <TableHead className="py-4">Nama Customer</TableHead>
              <TableHead className="py-4">Pax (Jumlah Orang)</TableHead>
              <TableHead className="py-4">Waktu</TableHead>
              {bisaUbah && <TableHead className="py-4 text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                {/* py-4 di tiap sel: baris setinggi default terasa berdempetan
                    ketika isinya dua baris teks + avatar. */}
                <TableCell className="whitespace-nowrap py-4 text-muted-foreground">
                  {r.depot}
                  {r.depotDiubah && (
                    <span className="ml-1 text-xs text-accent-foreground">(diubah)</span>
                  )}
                </TableCell>
                <TableCell className="py-4">
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
                <TableCell className="py-4">
                  <PillPax hadir={r.qtyHadir} undangan={r.qtyUndangan} />
                </TableCell>
                <TableCell className="py-4"><PillWaktu nilai={r.checkedInAt} /></TableCell>
                {bisaUbah && (
                  <TableCell className="py-4">
                    <div className="flex justify-end">
                      <TombolAksi row={r} onEdit={() => setEdit(r)} onHapus={() => setHapus(r)} />
                    </div>
                  </TableCell>
                )}
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

      <EditCheckinDialog
        row={edit}
        depots={depots}
        onOpenChange={(v) => !v && setEdit(null)}
        onSaved={onChanged}
      />
      <HapusCheckinDialog
        row={hapus}
        onOpenChange={(v) => !v && setHapus(null)}
        onDeleted={onChanged}
      />
    </div>
  );
}
