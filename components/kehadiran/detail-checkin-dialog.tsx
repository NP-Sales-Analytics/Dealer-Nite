'use client';

import { Pencil, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { AttendanceRow } from '@/lib/dashboard/types';
import { inisial, jamJakarta, tanggalJakarta } from '@/lib/utils';

/** Satu baris "label di kiri, nilai di kanan" di dalam kartu detail. */
function Baris({ label, nilai }: { label: string; nilai: string | number | null }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-medium">
        {nilai === null || nilai === '' ? <span className="text-muted-foreground">&mdash;</span> : nilai}
      </span>
    </div>
  );
}

function Seksi({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {judul}
      </h3>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-secondary/30">
        {children}
      </div>
    </section>
  );
}

export function DetailCheckinDialog({
  row, bisaUbah, onOpenChange, onEdit, onHapus,
}: {
  row: AttendanceRow | null;
  bisaUbah: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (row: AttendanceRow) => void;
  onHapus: (row: AttendanceRow) => void;
}) {
  if (!row) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      {/* p-0 + grid-rows: kepala dan kaki tetap terlihat, hanya badan yang
          menggulung. Tanpa ini tombol aksi ikut terdorong keluar layar HP
          ketika detailnya panjang. */}
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[76svh] w-full max-w-lg sm:max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0 sm:max-h-[84svh]"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <DialogTitle className="text-base font-semibold">Detail Toko Hadir</DialogTitle>
          <DialogClose
            aria-label="Tutup"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" />
          </DialogClose>
        </header>

        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5">
          {/* Identitas dipisah dari daftar detail: ini jangkar yang dibaca
              admin lebih dulu untuk memastikan tidak salah baris. */}
          <div className="flex items-start gap-3.5">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary"
              aria-hidden
            >
              {inisial(row.nama)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-base font-semibold leading-snug">{row.nama}</p>
              <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                {row.kodeSap ?? 'Tanpa MG Code'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {row.region && <Badge variant="secondary">Region {row.region}</Badge>}
                <Badge variant="secondary">{row.depot}</Badge>
                {row.isManualEntry && <Badge variant="outline">Manual</Badge>}
                {row.depotDiubah && <Badge variant="outline">Depot diubah</Badge>}
              </div>
            </div>
          </div>

          <Seksi judul="Wilayah">
            <Baris label="Wilayah" nilai={row.wilayah} />
            <Baris label="Region" nilai={row.region} />
            <Baris label="Depot" nilai={row.depot} />
          </Seksi>

          <Seksi judul="Kehadiran">
            <Baris label="Jumlah hadir" nilai={`${row.qtyHadir} pax`} />
            <Baris label="Nomor undian" nilai={row.nomorUndian} />
            <Baris label="Jam check-in" nilai={jamJakarta(row.checkedInAt)} />
            <Baris label="Tanggal" nilai={tanggalJakarta(row.checkedInAt)} />
          </Seksi>
        </div>

        {/* Hapus dipisahkan jauh ke kiri dari aksi utama supaya tidak terpencet
            karena salah sasaran jempol. */}
        <footer className="flex items-center gap-2 border-t border-border px-5 py-4">
          {bisaUbah && (
            <Button
              variant="outline"
              className="h-11 shrink-0 gap-2 border-destructive/30 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onHapus(row)}
            >
              <Trash2 className="size-4" />
              Hapus
            </Button>
          )}
          {bisaUbah ? (
            <Button className="h-11 flex-1 gap-2" onClick={() => onEdit(row)}>
              <Pencil className="size-4" />
              Edit Data
            </Button>
          ) : (
            // Akun baca-saja tetap mendapat aksi yang jelas untuk menutup dialog.
            <Button variant="outline" className="h-11 flex-1" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}
