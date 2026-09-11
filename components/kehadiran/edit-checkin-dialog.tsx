'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { QtyStepper } from '@/components/reservation/qty-stepper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AttendanceRow } from '@/lib/dashboard/types';
import { inisial } from '@/lib/utils';

export function EditCheckinDialog({
  row, onOpenChange, onSaved,
}: {
  row: AttendanceRow | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [qty, setQty] = useState('0');
  const [sibuk, setSibuk] = useState(false);

  // Isi ulang setiap kali baris yang diedit berganti.
  useEffect(() => {
    if (!row) return;
    setQty(String(row.qtyHadir));
  }, [row]);

  if (!row) return null;

  const qtyValid = qty !== '' && Number.isInteger(Number(qty)) && Number(qty) >= 0;

  async function simpan() {
    if (!row) return;
    setSibuk(true);
    try {
      const res = await fetch(`/api/reservations/${row.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ qtyHadir: Number(qty) }),
      });
      if (!res.ok) { toast.error('Gagal menyimpan perubahan.'); return; }
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
          menggulung. Di HP keyboard menutupi separuh layar, dan tanpa ini
          tombol Simpan ikut terdorong keluar jangkauan. */}
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[88svh] w-full max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0"
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
          {/* Identitas ditampilkan ulang di sini: dialog edit sering dibuka dari
              panel detail, dan admin perlu kepastian sedang mengubah baris yang
              benar tanpa harus menutupnya dulu. */}
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
                {row.kodeSap ?? 'Tanpa kode SAP'}
              </p>
              {row.isManualEntry && (
                <Badge variant="outline" className="mt-1.5">Manual</Badge>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="e-depot">Depot</Label>
              <Input
                id="e-depot"
                className="h-11 bg-secondary/40"
                value={row.depot}
                readOnly
                aria-readonly="true"
              />
              <p className="text-xs text-muted-foreground">
                Depot mengikuti data customer dan tidak dapat diubah dari catatan kehadiran.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="e-qty">Jumlah orang yang hadir (pax)</Label>
              <QtyStepper id="e-qty" value={qty} onChange={setQty} />
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
          <Button className="h-11 flex-1" onClick={simpan} disabled={!qtyValid || sibuk}>
            {sibuk ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
