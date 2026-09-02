'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { QtyStepper } from '@/components/reservation/qty-stepper';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AttendanceRow } from '@/lib/dashboard/types';

export function EditCheckinDialog({
  row, depots, onOpenChange, onSaved,
}: {
  row: AttendanceRow | null;
  depots: string[];
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [qty, setQty] = useState('0');
  const [depot, setDepot] = useState('');
  const [nama, setNama] = useState('');
  const [sibuk, setSibuk] = useState(false);

  // Isi ulang setiap kali baris yang diedit berganti.
  useEffect(() => {
    if (!row) return;
    setQty(String(row.qtyHadir));
    setDepot(row.depot === '-' ? '' : row.depot);
    setNama(row.nama);
  }, [row]);

  if (!row) return null;

  const qtyValid = qty !== '' && Number.isInteger(Number(qty)) && Number(qty) >= 0;
  const namaValid = !row.isManualEntry || nama.trim().length >= 2;
  const valid = qtyValid && namaValid && depot.trim().length >= 1;

  async function simpan() {
    if (!row) return;
    setSibuk(true);
    try {
      const res = await fetch(`/api/reservations/${row.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          qtyHadir: Number(qty),
          depotOverride: depot.trim(),
          ...(row.isManualEntry && { manualNamaCustomer: nama.trim() }),
        }),
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
      {/* w-full + min-w-0: sebelumnya footer berisi dua kelompok tombol memaksa
          lebar minimum melebihi dialog, sehingga muncul scroll horizontal dan
          tombol Simpan terpotong. */}
      <DialogContent className="max-h-[90svh] w-full max-w-md overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Ubah Catatan Kehadiran</DialogTitle>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="e-nama">Nama Customer</Label>
            <Input
              id="e-nama"
              className="h-11 w-full"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              disabled={!row.isManualEntry}
            />
            {!row.isManualEntry && (
              <p className="text-xs text-muted-foreground">
                Nama toko terdaftar mengikuti master data dan tidak bisa diubah di sini.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="e-depot">Depot</Label>
            <Input
              id="e-depot"
              className="h-11 w-full"
              list="edit-depot-list"
              value={depot}
              onChange={(e) => setDepot(e.target.value)}
            />
            <datalist id="edit-depot-list">
              {depots.map((d) => <option key={d} value={d} />)}
            </datalist>
            <p className="text-xs text-muted-foreground">
              Hanya mengubah catatan ini. Master data toko tidak tersentuh.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="e-qty">Jumlah orang yang hadir (pax)</Label>
            <QtyStepper id="e-qty" value={qty} onChange={setQty} />
          </div>
        </div>

        {/* Tombol menumpuk penuh di HP, sebaris di desktop. Hapus tidak lagi di
            sini - sudah tersedia langsung di baris tabel. */}
        <div className="mt-2 flex min-w-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="h-11 w-full sm:w-auto sm:px-6"
            onClick={() => onOpenChange(false)}
            disabled={sibuk}
          >
            Batal
          </Button>
          <Button className="h-11 w-full sm:w-auto sm:px-6" onClick={simpan} disabled={!valid || sibuk}>
            {sibuk ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
