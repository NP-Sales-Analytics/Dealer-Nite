'use client';

import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { RecentRow } from './dashboard-client';
import { QtyStepper } from '@/components/reservation/qty-stepper';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function EditCheckinDialog({
  row, depots, onOpenChange, onSaved,
}: {
  row: RecentRow | null;
  depots: string[];
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [qty, setQty] = useState('0');
  const [depot, setDepot] = useState('');
  const [nama, setNama] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [konfirmHapus, setKonfirmHapus] = useState(false);

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

  async function hapus() {
    if (!row) return;
    setSibuk(true);
    try {
      const res = await fetch(`/api/reservations/${row.id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Gagal menghapus.'); return; }
      toast.success('Catatan kehadiran dihapus.');
      setKonfirmHapus(false);
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error('Koneksi bermasalah. Coba lagi.');
    } finally {
      setSibuk(false);
    }
  }

  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ubah Catatan Kehadiran</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="e-nama">Nama Customer</Label>
              <Input
                id="e-nama"
                className="h-11"
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
                className="h-11"
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
              <Label htmlFor="e-qty">Jumlah orang yang hadir</Label>
              <QtyStepper id="e-qty" value={qty} onChange={setQty} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              className="h-11 text-destructive"
              onClick={() => setKonfirmHapus(true)}
              disabled={sibuk}
            >
              <Trash2 className="size-4" />
              Hapus
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="h-11 flex-1" onClick={() => onOpenChange(false)} disabled={sibuk}>
                Batal
              </Button>
              <Button className="h-11 flex-1" onClick={simpan} disabled={!valid || sibuk}>
                {sibuk ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={konfirmHapus} onOpenChange={setKonfirmHapus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus catatan kehadiran?</AlertDialogTitle>
            <AlertDialogDescription>
              Kehadiran &quot;{row.nama}&quot; ({row.qtyHadir} orang) akan dihapus dan angka
              dashboard ikut berkurang. Tokonya bisa dicatat ulang dari halaman Pencatatan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive text-white hover:bg-destructive/90"
              onClick={hapus}
            >
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
