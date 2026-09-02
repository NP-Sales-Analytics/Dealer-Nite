'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AttendanceRow } from '@/lib/dashboard/types';

export function HapusCheckinDialog({
  row, onOpenChange, onDeleted,
}: {
  row: AttendanceRow | null;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const [sibuk, setSibuk] = useState(false);
  if (!row) return null;

  async function hapus() {
    if (!row) return;
    setSibuk(true);
    try {
      const res = await fetch(`/api/reservations/${row.id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Gagal menghapus.'); return; }
      toast.success('Catatan kehadiran dihapus.');
      onOpenChange(false);
      onDeleted();
    } catch {
      toast.error('Koneksi bermasalah. Coba lagi.');
    } finally {
      setSibuk(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus catatan kehadiran?</AlertDialogTitle>
          <AlertDialogDescription>
            Kehadiran &quot;{row.nama}&quot; ({row.qtyHadir} pax) akan dihapus dan angka
            dashboard ikut berkurang. Tokonya bisa dicatat ulang dari halaman Pencatatan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={sibuk}>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="h-11 bg-destructive text-white hover:bg-destructive/90"
            onClick={hapus}
            disabled={sibuk}
          >
            {sibuk ? 'Menghapus...' : 'Ya, hapus'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
