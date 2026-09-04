'use client';

import { UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { QtyStepper } from './qty-stepper';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ManualEntryForm({
  open, depots, onOpenChange,
}: { open: boolean; depots: string[]; onOpenChange: (v: boolean) => void }) {
  const [nama, setNama] = useState('');
  const [depot, setDepot] = useState('');
  const [qty, setQty] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const valid = nama.trim().length >= 2 && depot.trim().length >= 1
    && qty !== '' && Number.isInteger(Number(qty)) && Number(qty) >= 0;

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          isManualEntry: true,
          manualNamaCustomer: nama.trim(),
          manualDepot: depot.trim(),
          qtyHadir: Number(qty),
        }),
      });
      if (!res.ok) { toast.error('Gagal menyimpan. Coba lagi.'); return; }
      toast.success(`${nama.trim()}: ${qty} orang tercatat hadir.`);
      setNama(''); setDepot(''); setQty('1');
      onOpenChange(false);
    } catch {
      toast.error('Koneksi bermasalah. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* grid-rows: di HP keyboard menutupi separuh layar; dengan kaki yang
          tetap di tempat, tombol Simpan selalu terjangkau. */}
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[88svh] w-full max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary" aria-hidden>
              <UserPlus className="size-4.5" />
            </span>
            <div>
              <DialogTitle className="text-base font-semibold">Tambah Tamu Manual</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Untuk tamu yang tidak ada di daftar undangan
              </p>
            </div>
          </div>
          <DialogClose
            aria-label="Tutup"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" />
          </DialogClose>
        </header>

        <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-5">
          <div className="space-y-2">
            <Label htmlFor="m-nama">Nama Customer</Label>
            <Input
              className="h-11"
              id="m-nama"
              placeholder="Nama toko atau perusahaan"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-depot">Depot</Label>
            {/* datalist native: autocomplete 35 depot tanpa library combobox */}
            <Input
              className="h-11"
              id="m-depot"
              list="depot-list"
              placeholder="Ketik atau pilih depot"
              value={depot}
              onChange={(e) => setDepot(e.target.value)}
            />
            <datalist id="depot-list">
              {depots.map((d) => <option key={d} value={d} />)}
            </datalist>
          </div>

          <div className="space-y-2">
            {/* QtyStepper, bukan input number polos: menyamakan cara mengisi
                jumlah dengan halaman pencatatan utama. */}
            <Label htmlFor="m-qty">Jumlah Orang yang Hadir</Label>
            <QtyStepper id="m-qty" value={qty} onChange={setQty} />
          </div>

          <p className="rounded-xl border border-border bg-secondary/30 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
            Tamu manual tidak punya wilayah dan region, jadi barisnya tidak akan
            muncul saat filter wilayah atau region dipakai.
          </p>
        </div>

        <footer className="flex items-center gap-2 border-t border-border px-5 py-4">
          <Button
            variant="outline"
            className="h-11 flex-1 sm:flex-none sm:px-6"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button className="h-11 flex-1" onClick={submit} disabled={!valid || submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan Kehadiran'}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
