'use client';

import { ChevronDown, Eye, EyeOff, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { createUser, updateUser } from '@/app/(app)/admin/users/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  halamanEfektif, HALAMAN, ROLE_LABEL, SCOPE_PER_ROLE, SEMUA_ROLE,
} from '@/lib/access';
import type { Role } from '@/lib/auth';

export type UserRow = {
  id: string;
  email: string | null;
  fullName: string;
  role: Role;
  allowedPages: string[];
  dataScope: string | null;
};

/**
 * Pemilih halaman: <details> bawaan browser, bukan komponen dropdown.
 *
 * Daftarnya cuma empat baris dan hanya muncul di dalam dialog, jadi menambah
 * popover berikut manajemen fokusnya tidak sepadan. <details> sudah bisa
 * dibuka-tutup dengan keyboard dan dibacakan screen reader apa adanya.
 */
function PemilihHalaman({ terpilih, onChange }: { terpilih: string[]; onChange: (v: string[]) => void }) {
  const toggle = (href: string) =>
    onChange(terpilih.includes(href) ? terpilih.filter((h) => h !== href) : [...terpilih, href]);

  return (
    <details className="group rounded-xl border border-border bg-background">
      <summary className="flex h-11 cursor-pointer list-none items-center justify-between gap-2 px-3.5 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <span className={terpilih.length === 0 ? 'text-muted-foreground' : ''}>
          {terpilih.length === 0
            ? 'Belum dipilih (pakai bawaan role)'
            : `${terpilih.length} halaman dipilih`}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-1 border-t border-border p-2">
        {HALAMAN.map((h) => (
          <label
            key={h.href}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-secondary"
          >
            <input
              type="checkbox"
              name="pages"
              value={h.href}
              checked={terpilih.includes(h.href)}
              onChange={() => toggle(h.href)}
              className="size-4 shrink-0 accent-primary"
            />
            <span className="min-w-0 flex-1">{h.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{h.href}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

export function UserFormDialog({
  mode, row, open, onOpenChange,
}: {
  mode: 'create' | 'edit';
  row?: UserRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [pending, start] = useTransition();
  const [role, setRole] = useState<Role>(row?.role ?? 'admin_rsvp');
  // Saat mengedit, kotak dicentang sesuai akses efektifnya - kalau ditampilkan
  // kosong, menyimpan tanpa menyentuh apa pun justru akan mencabut aksesnya.
  const [pages, setPages] = useState<string[]>(
    row ? halamanEfektif(row.role, row.allowedPages) : [],
  );
  const [lihatSandi, setLihatSandi] = useState(false);

  const scope = SCOPE_PER_ROLE[role];
  const ubah = mode === 'edit';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[80svh] w-full max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0 sm:max-h-[86svh]"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <DialogTitle className="text-base font-semibold">
              {ubah ? 'Ubah User' : 'Tambah User'}
            </DialogTitle>
            <p className="truncate text-xs text-muted-foreground">
              {ubah ? (row?.email ?? row?.fullName ?? '') : 'Login pakai password. Password harus unik.'}
            </p>
          </div>
          <DialogClose
            aria-label="Tutup"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" />
          </DialogClose>
        </header>

        <form
          id="user-form"
          action={(fd) => start(async () => {
            const msg = ubah ? await updateUser(null, fd) : await createUser(null, fd);
            if (msg) { toast.error(msg); return; }
            toast.success(ubah ? 'User diperbarui.' : 'User dibuat.');
            onOpenChange(false);
          })}
          className="min-h-0 space-y-4 overflow-y-auto px-5 py-5"
        >
          {ubah && <input type="hidden" name="userId" value={row?.id ?? ''} />}
          {/* Select base-ui tidak menyumbang nilai ke FormData; nilainya
              dikirim lewat input tersembunyi ini. */}
          <input type="hidden" name="role" value={role} />

          <div className="space-y-2">
            <Label htmlFor="u-email">Email (opsional)</Label>
            <Input
              className="h-11"
              id="u-email"
              name="email"
              type="email"
              defaultValue={row?.email ?? ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="u-name">Nama Lengkap</Label>
            <Input className="h-11" id="u-name" name="fullName" defaultValue={row?.fullName ?? ''} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="u-pass">
              {ubah ? 'Password Baru' : 'Password (min. 8 karakter, unik)'}
            </Label>
            <div className="relative">
              <Input
                className="h-11 pr-11"
                id="u-pass"
                name="password"
                type={lihatSandi ? 'text' : 'password'}
                minLength={8}
                // Saat mengedit, kolom kosong berarti password lama dibiarkan.
                // Karena itu tidak required, dan minLength baru berlaku begitu
                // ada isinya - browser melewati minLength pada kolom kosong.
                required={!ubah}
                placeholder={ubah ? 'Kosongkan kalau tidak diubah' : undefined}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setLihatSandi((v) => !v)}
                aria-label={lihatSandi ? 'Sembunyikan password' : 'Tampilkan password'}
                title={lihatSandi ? 'Sembunyikan password' : 'Tampilkan password'}
                className="absolute right-0 top-0 grid h-11 w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {lihatSandi ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="u-role">Role</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v as Role)}>
              <SelectTrigger id="u-role" className="h-11 w-full data-[size=default]:h-11">
                <SelectValue>{ROLE_LABEL[role]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SEMUA_ROLE.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Halaman yang bisa diakses</Label>
            <PemilihHalaman terpilih={pages} onChange={setPages} />
          </div>

          {/* Hanya muncul untuk role yang memang dibatasi. Super Admin, Admin
              RSVP, dan Marketing melihat seluruh data. */}
          {scope ? (
            <div className="space-y-2">
              <Label htmlFor="u-scope">Cakupan Data &mdash; {scope.label}</Label>
              <Input
                className="h-11"
                id="u-scope"
                name="dataScope"
                placeholder={scope.contoh}
                defaultValue={row?.dataScope ?? ''}
              />
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-secondary/30 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
              Role <span className="font-medium text-foreground">{ROLE_LABEL[role]}</span> melihat
              seluruh data, jadi tidak ada cakupan data yang perlu diisi.
            </p>
          )}
        </form>

        <footer className="flex items-center gap-2 border-t border-border px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 sm:flex-none sm:px-6"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Batal
          </Button>
          <Button type="submit" form="user-form" className="h-11 flex-1" disabled={pending}>
            {pending ? 'Menyimpan...' : ubah ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
