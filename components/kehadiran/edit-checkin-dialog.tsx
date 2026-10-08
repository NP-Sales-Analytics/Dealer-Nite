'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { NomorUndianInput, nomorUndianValid } from '@/components/reservation/nomor-undian-input';
import { QtyStepper } from '@/components/reservation/qty-stepper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PilihSatu } from '@/components/ui/combobox';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AttendanceRow } from '@/lib/dashboard/types';
import { statusPax } from '@/lib/reservation/pax';
import { inisial } from '@/lib/utils';

/** Dipasang dengan key=row.id oleh pemanggil, jadi state awal selalu milik baris ini. */
export function EditCheckinDialog({
  row, depots, onOpenChange, onSaved,
}: {
  row: AttendanceRow;
  depots: string[];
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [qty, setQty] = useState(String(row.qtyHadir));
  const [undian, setUndian] = useState(row.nomorUndian ?? '');
  const [depot, setDepot] = useState(row.depot);
  const [sibuk, setSibuk] = useState(false);

  const valid = qty !== '' && Number.isInteger(Number(qty)) && Number(qty) >= 0
    && nomorUndianValid(undian) && depot !== '';
  const melebihi = statusPax(Number(qty), row.paxTerdaftar) === 'melebihi';

  async function simpan() {
    setSibuk(true);
    try {
      const res = await fetch(`/api/reservations/${row.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          qtyHadir: Number(qty),
          nomorUndian: undian,
          ...(row.isManualEntry ? { manualDepot: depot } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? 'Gagal menyimpan perubahan.');
        return;
      }
      toast.success('Catatan kehadiran diperbarui.');
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error('Koneksi bermasalah. Coba lagi.');
    } finally {
      setSibuk(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      {/* grid-rows: kepala dan kaki tetap di tempat, hanya formulir yang
          menggulung, supaya tombol Simpan tetap terjangkau saat keyboard HP muncul. */}
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[88svh] w-full max-w-lg sm:max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <DialogTitle className="text-base font-semibold">Ubah Catatan Kehadiran</DialogTitle>
          <DialogClose
            aria-label="Tutup"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" />
          </DialogClose>
        </header>

        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5">
          <div className="flex items-start gap-3.5 rounded-xl border border-border bg-secondary/30 p-3.5">
            <span
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary"
              aria-hidden
            >
              {inisial(row.nama)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold leading-snug">{row.nama}</p>
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {row.kodeSap ?? 'Tanpa MG Code'}
              </p>
              {row.isManualEntry && (
                <Badge variant="outline" className="mt-1.5">Manual</Badge>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="e-depot">Depot</Label>
              {row.isManualEntry ? (
                <>
                  <PilihSatu
                    id="e-depot"
                    items={depots}
                    value={depot}
                    onChange={setDepot}
                    placeholder="Pilih depot"
                    cariPlaceholder="Cari depot..."
                    kosong="Depot tidak ditemukan."
                  />
                  <p className="text-xs text-muted-foreground">
                    Wilayah dan region ikut menyesuaikan depot yang dipilih.
                  </p>
                </>
              ) : (
                <>
                  <Input id="e-depot" className="h-11 bg-secondary/40" value={row.depot} readOnly aria-readonly="true" />
                  <p className="text-xs text-muted-foreground">
                    Depot customer terdaftar mengikuti master customer.
                  </p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="e-qty">Jumlah pax hadir</Label>
              <QtyStepper id="e-qty" value={qty} onChange={setQty} />
              {row.paxTerdaftar != null && (
                <p className={melebihi ? 'text-sm font-medium text-destructive' : 'text-sm text-muted-foreground'}>
                  Terdaftar {row.paxTerdaftar} pax{melebihi && ` · ${qty} pax melebihi pendaftaran`}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="e-undian">Nomor undian</Label>
              <NomorUndianInput id="e-undian" value={undian} onChange={setUndian} />
            </div>
          </div>
        </div>

        <footer className="flex items-center gap-2 border-t border-border px-5 py-4">
          <Button
            variant="outline"
            className="h-11 flex-1 sm:flex-none sm:px-6"
            onClick={() => onOpenChange(false)}
            disabled={sibuk}
          >
            Batal
          </Button>
          <Button className="h-11 flex-1" onClick={simpan} disabled={!valid || sibuk}>
            {sibuk ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
