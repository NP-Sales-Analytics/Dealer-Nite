'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { createUser } from '@/app/(app)/admin/users/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <Button onClick={() => setOpen(true)}>Tambah User</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto">
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
            <Input className="h-11" id="u-email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-name">Nama Lengkap</Label>
            <Input className="h-11" id="u-name" name="fullName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-pass">Password (min. 8 karakter)</Label>
            <Input className="h-11" id="u-pass" name="password" type="password" minLength={8} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-role">Role</Label>
            <Select name="role" defaultValue="admin_rsvp">
              <SelectTrigger id="u-role" className="h-11 w-full data-[size=default]:h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="superadmin">Superadmin (semua fitur)</SelectItem>
                <SelectItem value="admin_rsvp">Admin RSVP (pencatatan)</SelectItem>
                <SelectItem value="rsm">RSM (dashboard)</SelectItem>
                <SelectItem value="customer">Customer (modul 2)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="h-11 w-full" disabled={pending}>
            {pending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
