'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { OrderRow } from '@/app/api/order/list/route';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Mengosongkan angka order sebuah toko tanpa menghapus tokonya - berbeda dengan
 * Hapus, yang membuang master customer beserta kehadirannya.
 */
export function ResetOrderDialog({
  row,
  onOpenChange,
  onReset,
}: {
  row: OrderRow | null;
  onOpenChange: (v: boolean) => void;
  onReset: () => void;
}) {
  const [sibuk, setSibuk] = useState(false);

  async function reset() {
    if (!row) return;
    setSibuk(true);
    try {
      const res = await fetch(`/api/order/customer/${row.customerId}/reset`, { method: 'POST' });
      if (!res.ok) {
        toast.error('Gagal mereset order.');
        return;
      }
      toast.success(`Order ${row.namaToko} dikosongkan.`);
      onOpenChange(false);
      onReset();
    } catch {
      toast.error('Koneksi bermasalah. Coba lagi.');
    } finally {
      setSibuk(false);
    }
  }

  return (
    <AlertDialog open={row !== null} onOpenChange={(o) => !o && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset order toko ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Seluruh pengambilan {row?.namaToko} dikosongkan: {row?.total ?? 0} dus dan{' '}
            {row?.jumlahAdjustment ?? 0} riwayat penyesuaian dihapus, termasuk patokan pengambilan
            pertamanya. Data toko dan catatan kehadirannya TIDAK ikut terhapus, jadi toko ini bisa
            langsung dicatat ulang dari nol.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={sibuk}>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="h-11"
            disabled={sibuk}
            onClick={(e) => { e.preventDefault(); reset(); }}
          >
            {sibuk ? 'Mereset...' : 'Ya, reset order'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
