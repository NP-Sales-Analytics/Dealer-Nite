'use client';

import { Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { changeRole, deleteUser } from '@/app/(app)/admin/users/actions';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Role } from '@/lib/auth';

const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'Superadmin (semua fitur)',
  admin_rsvp: 'Admin RSVP (pencatatan)',
  rsm: 'RSM (dashboard)',
  customer: 'Customer (modul 2)',
};

type Row = { id: string; email: string; fullName: string; role: Role };

/**
 * Didefinisikan di tingkat modul, BUKAN di dalam UserTable: komponen yang
 * dibuat ulang tiap render adalah tipe baru bagi React, sehingga seluruh
 * Select ter-unmount dan mount ulang setiap kali state berubah.
 */
function RoleSelect({
  u, className, disabled, onChange,
}: {
  u: Row;
  className?: string;
  disabled: boolean;
  onChange: (v: string | null) => void;
}) {
  return (
    <Select value={u.role} disabled={disabled} onValueChange={onChange}>
      {/* Children wajib: SelectContent belum ter-mount sampai dropdown dibuka,
          jadi komponen tidak bisa menurunkan teksnya sendiri dan akan
          menampilkan nilai enum mentah. */}
      <SelectTrigger className={className}>
        <SelectValue>{ROLE_LABEL[u.role]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function UserTable({ rows, currentUserId }: { rows: Row[]; currentUserId: string }) {
  const [pending, start] = useTransition();
  const [hapus, setHapus] = useState<Row | null>(null);

  // base-ui mengirim string | null pada onValueChange. Guard `v === u.role`
  // memastikan render ulang / remount tidak pernah menulis perubahan palsu:
  // tiap user punya dua Select (kartu HP + baris tabel) yang sama-sama ter-mount
  // dan hanya disembunyikan CSS, jadi menulis tanpa syarat itu berisiko.
  const ubahRole = (u: Row, v: string | null) => {
    if (!v || v === u.role) return;
    start(async () => {
      await changeRole(u.id, v as Role);
      toast.success('Role diperbarui.');
    });
  };

  return (
    <>
      {/* HP: satu kartu per user. Tabel 4 kolom tidak muat di 375px. */}
      <ul className="space-y-3 md:hidden">
        {rows.map((u) => (
          <li key={u.id} className="rounded-2xl border border-border bg-card p-4 shadow-xs">
            <p className="font-medium leading-snug break-words">{u.fullName || 'Tanpa nama'}</p>
            <p className="mt-0.5 text-sm text-muted-foreground break-all">{u.email}</p>
            <div className="mt-3 flex items-center gap-2">
              <RoleSelect u={u} className="h-11 flex-1" disabled={pending || u.id === currentUserId} onChange={(v) => ubahRole(u, v)} />
              <Button
                variant="outline"
                size="icon"
                aria-label={`Hapus ${u.email}`}
                className="size-11 shrink-0 text-destructive"
                disabled={pending || u.id === currentUserId}
                onClick={() => setHapus(u)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            {u.id === currentUserId && (
              <p className="mt-2 text-xs text-muted-foreground">Ini akun Anda sendiri.</p>
            )}
          </li>
        ))}
      </ul>

      <div className="hidden rounded-2xl border border-border bg-card shadow-xs md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Role</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.email}</TableCell>
                <TableCell>{u.fullName || '-'}</TableCell>
                <TableCell><RoleSelect u={u} className="w-56" disabled={pending || u.id === currentUserId} onChange={(v) => ubahRole(u, v)} /></TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={pending || u.id === currentUserId}
                    onClick={() => setHapus(u)}
                  >
                    Hapus
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={hapus !== null} onOpenChange={(o) => !o && setHapus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus user ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {hapus?.email} akan dihapus permanen dan tidak bisa login lagi.
              Catatan kehadiran yang pernah dibuatnya tetap tersimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                const target = hapus;
                setHapus(null);
                if (!target) return;
                start(async () => {
                  try {
                    await deleteUser(target.id);
                    toast.success('User dihapus.');
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Gagal menghapus.');
                  }
                });
              }}
            >
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
