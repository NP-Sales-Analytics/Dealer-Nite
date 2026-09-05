'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { OrderRow } from '@/app/api/order/list/route';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function HapusCustomerDialog({
  row,
  onOpenChange,
  onDeleted,
}: {
  row: OrderRow | null;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const [sibuk, setSibuk] = useState(false);

  async function hapus() {
    if (!row) return;
    setSibuk(true);
    try {
      const res = await fetch(`/api/order/customer/${row.customerId}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Gagal menghapus toko.');
        return;
      }
      toast.success(`${row.namaToko} dihapus.`);
      onOpenChange(false);
      onDeleted();
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
          <AlertDialogTitle>Hapus toko ini dari master data?</AlertDialogTitle>
          <AlertDialogDescription>
            {row?.namaToko} akan dihapus permanen. Catatan kehadiran dan seluruh riwayat ordernya
            ({row?.jumlahAdjustment ?? 0} penyesuaian, {row?.total ?? 0} dus) ikut terhapus dan
            tidak bisa dikembalikan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={sibuk}>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="h-11 bg-destructive text-white hover:bg-destructive/90"
            disabled={sibuk}
            onClick={(e) => { e.preventDefault(); hapus(); }}
          >
            {sibuk ? 'Menghapus...' : 'Ya, hapus'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
