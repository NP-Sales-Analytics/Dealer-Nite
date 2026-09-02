'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ManualEntryForm({
  open, depots, onOpenChange,
}: { open: boolean; depots: string[]; onOpenChange: (v: boolean) => void }) {
  const [nama, setNama] = useState('');
  const [depot, setDepot] = useState('');
  const [qty, setQty] = useState('');
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
      setNama(''); setDepot(''); setQty('');
      onOpenChange(false);
    } catch {
      toast.error('Koneksi bermasalah. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Tamu Manual</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="m-nama">Nama Customer</Label>
            <Input id="m-nama" value={nama} onChange={(e) => setNama(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-depot">Depot</Label>
            {/* datalist native: autocomplete 35 depot tanpa library combobox */}
            <Input id="m-depot" list="depot-list" value={depot} onChange={(e) => setDepot(e.target.value)} />
            <datalist id="depot-list">
              {depots.map((d) => <option key={d} value={d} />)}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-qty">Jumlah Orang yang Hadir</Label>
            <Input id="m-qty" type="number" min={0} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Batal</Button>
          <Button onClick={submit} disabled={!valid || submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
