'use client';

import { useQuery } from '@tanstack/react-query';
import { Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import type { RiwayatRow } from '@/app/api/order/history/route';
import type { OrderRow } from '@/app/api/order/list/route';
import { InitialAvatar } from '@/components/shared/initial-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, jamJakarta, tanggalJakarta } from '@/lib/utils';

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

/** Riwayat diambil hanya saat dialog terbuka - tidak ikut dipoll oleh tabel. */
function Riwayat({ customerId }: { customerId: string }) {
  const q = useQuery({
    queryKey: ['order-history', customerId],
    queryFn: async (): Promise<{ rows: RiwayatRow[] }> => {
      const r = await fetch(`/api/order/history?customerId=${customerId}`);
      if (!r.ok) throw new Error('history');
      return r.json();
    },
  });

  if (!q.data) return <Skeleton className="h-24 w-full rounded-xl" />;
  const { rows } = q.data;

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-secondary/30 px-4 py-6 text-center text-sm text-muted-foreground">
        Belum ada penyesuaian. Toko ini belum mengambil dus.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-secondary/30">
      {rows.map((r, i) => (
        <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
            {i + 1}
          </span>
          <span
            className={cn(
              'w-14 shrink-0 text-sm font-bold tabular-nums',
              r.qtyChange > 0 ? 'text-emerald-700' : 'text-red-700',
            )}
          >
            {r.qtyChange > 0 ? '+' : ''}
            {r.qtyChange}
          </span>
          <span className="min-w-0 flex-1 text-xs leading-tight text-muted-foreground">
            {tanggalJakarta(r.createdAt)}, {jamJakarta(r.createdAt)}
            <br />
            {/* recorded_by kosong = customer mencatat sendiri lewat Tambah Order. */}
            {r.pencatat ? `dicatat oleh ${r.pencatat}` : 'input mandiri customer'}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function DetailOrderDialog({
  row,
  bisaUbah,
  onOpenChange,
  onEdit,
  onHapus,
  onReset,
}: {
  row: OrderRow | null;
  bisaUbah: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (row: OrderRow) => void;
  onHapus: (row: OrderRow) => void;
  onReset: (row: OrderRow) => void;
}) {
  if (!row) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[80svh] w-full max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0 sm:max-h-[86svh]"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <DialogTitle className="text-base font-semibold">Detail Order</DialogTitle>
          <DialogClose
            aria-label="Tutup"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" />
          </DialogClose>
        </header>

        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5">
          <div className="flex items-start gap-3.5">
            <InitialAvatar nama={row.namaToko} className="size-12 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="break-words text-base font-semibold leading-snug">{row.namaToko}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{row.kodeSap}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="secondary">{row.total} dus</Badge>
                <Badge variant="outline">{row.jumlahAdjustment}x penyesuaian</Badge>
              </div>
            </div>
          </div>

          <Seksi judul="Data Toko">
            <Baris label="Pemilik" nilai={row.namaPemilik} />
            <Baris label="Depot" nilai={row.depot} />
            <Baris label="Wilayah / Region" nilai={`${row.wilayah ?? '-'} / ${row.region ?? '-'}`} />
          </Seksi>

          <Seksi judul="Order">
            <Baris label="Dus terakhir" nilai={`${row.total} dus`} />
            <Baris
              label="Pengambilan pertama"
              nilai={row.dusAwal === null ? null : `${row.dusAwal} dus`}
            />
            <Baris
              label="Pengambilan terakhir"
              nilai={row.terakhir ? `${tanggalJakarta(row.terakhir)}, ${jamJakarta(row.terakhir)}` : null}
            />
          </Seksi>

          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Riwayat Penambahan
            </h3>
            <Riwayat customerId={row.customerId} />
          </section>
        </div>

        <footer className="space-y-2 border-t border-border px-5 py-4">
          {bisaUbah ? (
            <>
              <Button className="h-11 w-full gap-2" onClick={() => onEdit(row)}>
                <Pencil className="size-4" />
                Edit Data
              </Button>
              {/* Dua aksi ini mudah tertukar, jadi labelnya dibuat menyebut
                  sasarannya: Reset hanya angka ordernya, Hapus membuang tokonya. */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-11 flex-1 gap-2"
                  onClick={() => onReset(row)}
                >
                  <RotateCcw className="size-4" />
                  Reset Order
                </Button>
                <Button
                  variant="outline"
                  className="h-11 flex-1 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onHapus(row)}
                >
                  <Trash2 className="size-4" />
                  Hapus Toko
                </Button>
              </div>
            </>
          ) : (
            <Button variant="outline" className="h-11 w-full" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}
