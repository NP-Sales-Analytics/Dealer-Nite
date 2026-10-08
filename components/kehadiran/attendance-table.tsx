'use client';

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DetailCheckinDialog } from './detail-checkin-dialog';
import { EditCheckinDialog } from './edit-checkin-dialog';
import { HapusCheckinDialog } from './hapus-checkin-dialog';
import { PillStatusPax } from '@/components/target/pills';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AttendanceRow } from '@/lib/dashboard/types';
import { inisial, jamJakarta } from '@/lib/utils';

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

function PillPax({ hadir }: { hadir: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#ECFDF3] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#027A48]">
      {hadir} Pax
    </span>
  );
}

export function AttendanceTable({
  rows, page, totalPages, total, pageSize, adaFilter, bisaUbah, depots, urut,
  onPageChange, onUrutChange, onChanged,
}: {
  rows: AttendanceRow[];
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  adaFilter: boolean;
  bisaUbah: boolean;
  depots: string[];
  urut: 'asc' | 'desc';
  onPageChange: (p: number) => void;
  onUrutChange: (v: 'asc' | 'desc') => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<AttendanceRow | null>(null);
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
            ? 'Coba ganti wilayah, region, atau depot, atau kosongkan kata kuncinya.'
            : 'Catatan akan muncul di sini begitu admin mulai mencatat tamu di halaman Pencatatan.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card shadow-xs">
      {/* HP: kartu ringkas (pax & status di atas, toko di tengah, depot & waktu
          di bawah) supaya semua terbaca tanpa geser ke kanan. Ketuk kartu untuk
          detail; ubah & hapus ada di dialog detail. Mulai md: tabel penuh. */}
      <ul className="space-y-2.5 p-3 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setDetail(r)}
              aria-label={`Lihat detail ${r.nama}`}
              className="w-full rounded-xl border border-border bg-card p-3.5 text-left shadow-xs transition-colors active:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-lg bg-accent px-2.5 py-1 text-sm font-bold tabular-nums text-accent-foreground">
                  {r.qtyHadir} Pax
                  {r.paxTerdaftar != null && <span className="font-medium opacity-70"> / {r.paxTerdaftar}</span>}
                </span>
                <PillStatusPax hadir={r.qtyHadir} terdaftar={r.paxTerdaftar} />
              </div>
              <p className="mt-2.5 flex items-start gap-1.5 font-bold uppercase leading-snug">
                <span className="min-w-0 break-words">{r.nama}</span>
                {r.isManualEntry && <Badge variant="outline" className="shrink-0 normal-case">Manual</Badge>}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {r.kodeSap ?? 'Tanpa MG Code'}
                {r.nomorUndian && <> · Undian {r.nomorUndian}</>}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground" aria-hidden>
                    {r.depot.split(' ')[0]}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {r.depot}
                    {r.depotDiubah && <span className="ml-1 text-xs text-accent-foreground">(diubah)</span>}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{jamJakarta(r.checkedInAt)}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-[60rem]">
          <TableHeader>
            <TableRow>
              <TableHead className="py-4 pl-5">Depot</TableHead>
              <TableHead className="py-4">Nama Customer</TableHead>
              <TableHead className="py-4 text-center">Pax (Jumlah Orang)</TableHead>
              <TableHead className="py-4 text-center">Status Pax</TableHead>
              <TableHead className="py-4 text-center">No. Undian</TableHead>
              <TableHead className="py-4 text-center">
                <button
                  type="button"
                  onClick={() => onUrutChange(urut === 'desc' ? 'asc' : 'desc')}
                  aria-label={
                    urut === 'desc'
                      ? 'Urutkan dari yang paling awal datang'
                      : 'Urutkan dari yang paling baru datang'
                  }
                  className="mx-auto inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Waktu
                  {urut === 'desc' ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />}
                </button>
              </TableHead>
              {bisaUbah && <TableHead className="py-4 pr-5 text-center">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              // Seluruh baris membuka panel detail. Diberi role/tabIndex supaya
              // bisa dicapai keyboard juga; tombol aksi di kolom terakhir tetap
              // berdiri sendiri lewat stopPropagation.
              <TableRow
                key={r.id}
                role="button"
                tabIndex={0}
                aria-label={`Lihat detail ${r.nama}`}
                onClick={() => setDetail(r)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Spacebar' || e.key === ' ') {
                    e.preventDefault();
                    setDetail(r);
                  }
                }}
                className="cursor-pointer transition-colors hover:bg-secondary/50 focus-visible:bg-secondary focus-visible:outline-none"
              >
                {/* py-4 di tiap sel: baris setinggi default terasa berdempetan
                    ketika isinya dua baris teks + avatar. */}
                <TableCell className="whitespace-nowrap py-4 pl-5 text-muted-foreground">
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
                        {r.kodeSap ?? 'Tanpa MG Code'}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4 text-center">
                  <PillPax hadir={r.qtyHadir} />
                  {r.paxTerdaftar != null && (
                    <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">dari {r.paxTerdaftar} terdaftar</p>
                  )}
                </TableCell>
                <TableCell className="py-4 text-center">
                  <PillStatusPax hadir={r.qtyHadir} terdaftar={r.paxTerdaftar} />
                </TableCell>
                <TableCell className="py-4 text-center font-semibold tabular-nums">
                  {r.nomorUndian ?? <span className="font-normal text-muted-foreground">&mdash;</span>}
                </TableCell>
                <TableCell className="py-4 text-center tabular-nums text-muted-foreground">
                  {jamJakarta(r.checkedInAt)}
                </TableCell>
                {bisaUbah && (
                  <TableCell className="py-4 pr-5">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Hapus berdiri sendiri, bukan tersembunyi di dalam dialog
                          edit: membatalkan salah-catat adalah aksi tersering. */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setHapus(r); }}
                        aria-label={`Hapus catatan ${r.nama}`}
                        title="Hapus"
                        className="grid size-10 place-items-center rounded-lg border border-border text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEdit(r); }}
                        aria-label={`Ubah catatan ${r.nama}`}
                        title="Ubah"
                        className="grid size-10 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <Pencil className="size-4" />
                      </button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
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

      {/* Detail ditutup lebih dulu sebelum edit/hapus dibuka: dua dialog
          bertumpuk membuat fokus keyboard terjebak di lapisan bawah. */}
      <DetailCheckinDialog
        row={detail}
        bisaUbah={bisaUbah}
        onOpenChange={(v) => !v && setDetail(null)}
        onEdit={(r) => { setDetail(null); setEdit(r); }}
        onHapus={(r) => { setDetail(null); setHapus(r); }}
      />
      {edit && (
        <EditCheckinDialog
          key={edit.id}
          row={edit}
          depots={depots}
          onOpenChange={(v) => !v && setEdit(null)}
          onSaved={onChanged}
        />
      )}
      <HapusCheckinDialog
        row={hapus}
        onOpenChange={(v) => !v && setHapus(null)}
        onDeleted={onChanged}
      />
    </div>
  );
}
