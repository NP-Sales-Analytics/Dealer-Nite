'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { changeRole, deleteUser } from '@/app/admin/users/actions';
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

export function UserTable({ rows, currentUserId }: { rows: Row[]; currentUserId: string }) {
  const [pending, start] = useTransition();

  return (
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
            <TableCell>
              <Select
                value={u.role}
                disabled={pending || u.id === currentUserId}
                onValueChange={(v) => start(async () => {
                  await changeRole(u.id, v as Role);
                  toast.success('Role diperbarui.');
                })}
              >
                {/* Children wajib: SelectContent belum ter-mount sampai dropdown
                    dibuka, jadi Radix tidak bisa menurunkan teksnya sendiri dan
                    akan menampilkan nilai enum mentah. */}
                <SelectTrigger className="w-56">
                  <SelectValue>{ROLE_LABEL[u.role]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                disabled={pending || u.id === currentUserId}
                onClick={() => {
                  if (!confirm('Hapus user ' + u.email + '?')) return;
                  start(async () => {
                    try {
                      await deleteUser(u.id);
                      toast.success('User dihapus.');
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Gagal menghapus.');
                    }
                  });
                }}
              >
                Hapus
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
