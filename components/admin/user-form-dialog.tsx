'use client';

import { ChevronDown, Eye, EyeOff, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { createUser, updateUser } from '@/app/(app)/admin/users/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { halamanEfektif, HALAMAN, ROLE_LABEL, SEMUA_ROLE } from '@/lib/access';
import type { Role } from '@/lib/auth';

export type DealerNightOption = { id: string; name: string };
export type UserRow = {
  id: string;
  email: string | null;
  fullName: string;
  role: Role;
  allowedPages: string[];
  dealerNightId: string | null;
  dealerNightName: string | null;
  bolehUnduh: boolean;
};

function PemilihHalaman({ terpilih, onChange }: { terpilih: string[]; onChange: (value: string[]) => void }) {
  const toggle = (href: string) => onChange(
    terpilih.includes(href) ? terpilih.filter((item) => item !== href) : [...terpilih, href],
  );

  return (
    <details className="group rounded-xl border border-border bg-background">
      <summary className="flex h-11 cursor-pointer list-none items-center justify-between px-3.5 text-sm">
        <span>{terpilih.length ? `${terpilih.length} halaman dipilih` : 'Pakai akses bawaan role'}</span>
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-1 border-t border-border p-2">
        {HALAMAN.map((item) => (
          <label key={item.href} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-secondary">
            <input
              type="checkbox"
              name="pages"
              value={item.href}
              checked={terpilih.includes(item.href)}
              onChange={() => toggle(item.href)}
              className="size-4 accent-primary"
            />
            <span className="flex-1">{item.label}</span>
            <span className="text-xs text-muted-foreground">{item.href}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

export function UserFormDialog({
  mode,
  row,
  open,
  onOpenChange,
  dealerNightOptions,
}: {
  mode: 'create' | 'edit';
  row?: UserRow | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  dealerNightOptions: DealerNightOption[];
}) {
  const edit = mode === 'edit';
  const [pending, start] = useTransition();
  const [role, setRole] = useState<Role>(row?.role ?? 'admin');
  const [pages, setPages] = useState(row ? halamanEfektif(row.role, row.allowedPages) : []);
  const [dealerNightId, setDealerNightId] = useState(row?.dealerNightId ?? '');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="grid max-h-[86svh] max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <DialogTitle className="text-base">{edit ? 'Ubah User' : 'Tambah User'}</DialogTitle>
            <p className="text-xs text-muted-foreground">Semua akun login hanya dengan password unik.</p>
          </div>
          <DialogClose aria-label="Tutup" className="grid size-8 place-items-center rounded-lg hover:bg-secondary">
            <X className="size-4" />
          </DialogClose>
        </header>

        <form
          id="user-form"
          action={(formData) => start(async () => {
            const message = edit ? await updateUser(null, formData) : await createUser(null, formData);
            if (message) {
              toast.error(message);
              return;
            }
            toast.success(edit ? 'User diperbarui.' : 'User dibuat.');
            onOpenChange(false);
          })}
          className="min-h-0 space-y-4 overflow-y-auto px-5 py-5"
        >
          {edit && <input type="hidden" name="userId" value={row?.id ?? ''} />}
          <input type="hidden" name="role" value={role} />
          {role === 'dn_user' && <input type="hidden" name="dealerNightId" value={dealerNightId} />}

          <div className="space-y-2">
            <Label htmlFor="u-email">Email (opsional)</Label>
            <Input id="u-email" name="email" type="email" defaultValue={row?.email ?? ''} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-name">Nama Lengkap</Label>
            <Input id="u-name" name="fullName" defaultValue={row?.fullName ?? ''} required className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-pass">{edit ? 'Password Baru' : 'Password (min. 8 karakter, unik)'}</Label>
            <div className="relative">
              <Input
                id="u-pass"
                name="password"
                type={showPassword ? 'text' : 'password'}
                minLength={8}
                required={!edit}
                autoComplete="new-password"
                placeholder={edit ? 'Kosongkan jika tidak diubah' : undefined}
                className="h-11 pr-11"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-0 top-0 grid size-11 place-items-center" aria-label="Tampilkan atau sembunyikan password">
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(value) => value && setRole(value as Role)}>
              <SelectTrigger className="h-11 w-full"><SelectValue>{ROLE_LABEL[role]}</SelectValue></SelectTrigger>
              <SelectContent>
                {SEMUA_ROLE.map((item) => <SelectItem key={item} value={item}>{ROLE_LABEL[item]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {role === 'dn_user' ? (
            <div className="space-y-2">
              <Label>Dealer Night</Label>
              <Select value={dealerNightId} onValueChange={(value) => setDealerNightId(value ?? '')}>
                <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Pilih Dealer Night" /></SelectTrigger>
                <SelectContent>
                  {dealerNightOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Akun ini hanya dapat melihat data Dealer Night yang dipilih.</p>
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-secondary/30 px-3.5 py-3 text-xs text-muted-foreground">
              {ROLE_LABEL[role]} dapat melihat seluruh Dealer Night.
            </p>
          )}

          <div className="space-y-2">
            <Label>Halaman yang bisa diakses</Label>
            <PemilihHalaman terpilih={pages} onChange={setPages} />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-3.5 py-3">
            <input type="checkbox" name="bolehUnduh" defaultChecked={row?.bolehUnduh ?? false} className="mt-0.5 size-4 accent-primary" />
            <span className="text-sm">Boleh mengunduh data</span>
          </label>
        </form>

        <footer className="flex gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={pending}>Batal</Button>
          <Button type="submit" form="user-form" className="h-11 flex-1" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan'}</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
