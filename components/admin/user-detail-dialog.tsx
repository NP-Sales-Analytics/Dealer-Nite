'use client';

import { Pencil, Trash2, X } from 'lucide-react';
import type { UserRow } from './user-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { halamanEfektif, HALAMAN, labelScope, ROLE_LABEL } from '@/lib/access';
import { inisial } from '@/lib/utils';

function Baris({ label, nilai }: { label: string; nilai: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-all text-right text-sm font-medium">
        {nilai ? nilai : <span className="text-muted-foreground">&mdash;</span>}
      </span>
    </div>
  );
}

function Seksi({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {judul}
      </h3>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-secondary/30">
        {children}
      </div>
    </section>
  );
}

export function UserDetailDialog({
  row, akunSendiri, onOpenChange, onEdit, onHapus,
}: {
  row: UserRow | null;
  akunSendiri: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (row: UserRow) => void;
  onHapus: (row: UserRow) => void;
}) {
  if (!row) return null;

  const boleh = halamanEfektif(row.role, row.allowedPages);
  const bawaan = row.allowedPages.length === 0;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[76svh] w-full max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0 sm:max-h-[84svh]"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <DialogTitle className="text-base font-semibold">Detail User</DialogTitle>
          <DialogClose
            aria-label="Tutup"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" />
          </DialogClose>
        </header>

        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5">
          <div className="flex items-start gap-3.5">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary"
              aria-hidden
            >
              {inisial(row.fullName || row.email || '?')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-base font-semibold leading-snug">
                {row.fullName || 'Tanpa nama'}
              </p>
              {row.email && <p className="mt-0.5 break-all text-sm text-muted-foreground">{row.email}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="secondary">{ROLE_LABEL[row.role]}</Badge>
                <Badge variant="outline">{labelScope(row.role, row.dataScope)}</Badge>
                {akunSendiri && <Badge variant="outline">Akun Anda</Badge>}
              </div>
            </div>
          </div>

          <Seksi judul="Akses">
            <Baris label="Role" nilai={ROLE_LABEL[row.role]} />
            <Baris label="Cakupan data" nilai={labelScope(row.role, row.dataScope)} />
          </Seksi>

          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Halaman yang bisa diakses{bawaan && ' (bawaan role)'}
            </h3>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-secondary/30">
              {HALAMAN.filter((h) => boleh.includes(h.href)).map((h) => (
                <div key={h.href} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <span className="min-w-0 text-sm font-medium">{h.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{h.href}</span>
                </div>
              ))}
              {boleh.length === 0 && (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  Belum ada halaman yang bisa diakses.
                </p>
              )}
            </div>
          </section>
        </div>

        <footer className="flex items-center gap-2 border-t border-border px-5 py-4">
          {/* Akun sendiri tidak bisa dihapus - aturan yang sama ditegakkan lagi
              di server action, ini hanya menyembunyikan tombol yang pasti gagal. */}
          {!akunSendiri && (
            <Button
              variant="outline"
              className="h-11 shrink-0 gap-2 border-destructive/30 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onHapus(row)}
            >
              <Trash2 className="size-4" />
              Hapus
            </Button>
          )}
          <Button className="h-11 flex-1 gap-2" onClick={() => onEdit(row)}>
            <Pencil className="size-4" />
            Edit Data
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
