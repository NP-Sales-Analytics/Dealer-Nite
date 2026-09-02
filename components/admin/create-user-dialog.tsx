'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { createUser } from '@/app/admin/users/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <Button onClick={() => setOpen(true)}>Tambah User</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
        <DialogHeader><DialogTitle>Tambah User</DialogTitle></DialogHeader>
        <form
          action={(fd) => start(async () => {
            const msg = await createUser(null, fd);
            if (msg) {
              toast.error(msg);
              return;
            }
            toast.success('User dibuat.');
            setOpen(false);
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="u-email">Email</Label>
            <Input id="u-email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-name">Nama Lengkap</Label>
            <Input id="u-name" name="fullName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-pass">Password (min. 8 karakter)</Label>
            <Input id="u-pass" name="password" type="password" minLength={8} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-role">Role</Label>
            <select
              id="u-role"
              name="role"
              required
              defaultValue="admin_rsvp"
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="superadmin">Superadmin (semua fitur)</option>
              <option value="admin_rsvp">Admin RSVP (pencatatan)</option>
              <option value="rsm">RSM (dashboard)</option>
              <option value="customer">Customer (modul 2)</option>
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
