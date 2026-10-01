'use client';

import { X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { TargetRow } from './types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildTargetAdjustment, parseRupiahInput, targetFormCopy } from '@/lib/target/form';
import { formatRupiah } from '@/lib/target/money';
import { MIN_TARGET_DN } from '@/lib/target/rules';
import { cn } from '@/lib/utils';

/** Dipasang dengan key=customerId, jadi state awal selalu milik toko ini. */
export function TargetAdjustmentDialog({
  row,
  onOpenChange,
  onSaved,
}: {
  row: TargetRow;
  onOpenChange: (value: boolean) => void;
  onSaved: () => void;
}) {
  const verified = !!row.verifiedAt;
  const [value, setValue] = useState(String(row.targetEfektif));
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();
  const parsed = parseRupiahInput(value);
  const valid = Number.isFinite(parsed) && parsed >= MIN_TARGET_DN;
  const delta = valid ? parsed - row.targetEfektif : 0;
  const copy = targetFormCopy({ currentTarget: verified ? row.targetEfektif : row.targetAwal, verified });

  const simpan = () => startTransition(async () => {
    try {
      const response = await fetch('/api/targets/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildTargetAdjustment(row.customerId, value), note }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal menyimpan.');
      toast.success(verified ? 'Target DN diperbarui.' : `Target ${row.mgName} terverifikasi.`);
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan.');
    }
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[88svh] w-full max-w-xl sm:max-w-xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <DialogTitle className="text-base font-semibold">{copy.title}</DialogTitle>
            <DialogDescription className="mt-0.5 truncate text-xs">{row.mgName} · {row.mgCode}</DialogDescription>
          </div>
          <DialogClose
            aria-label="Tutup"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" />
          </DialogClose>
        </header>

        <form
          id="target-form"
          className="min-h-0 space-y-5 overflow-y-auto px-5 py-5"
          onSubmit={(event) => { event.preventDefault(); if (valid) simpan(); }}
        >
          <p className="text-sm text-muted-foreground">{copy.instruction}</p>

          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-secondary/30">
            {[
              { label: verified ? 'Target saat ini' : 'Target pusat', nilai: formatRupiah(row.targetEfektif) },
              { label: 'Selisih', nilai: `${delta > 0 ? '+' : ''}${formatRupiah(delta)}`, warna: delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-destructive' : '' },
              { label: 'Target baru', nilai: valid ? formatRupiah(parsed) : '-' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={cn('text-sm font-semibold tabular-nums', item.warna)}>{item.nilai}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-value">Target DN {verified ? 'baru' : 'terverifikasi'}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted-foreground">Rp</span>
              <Input
                id="target-value"
                inputMode="numeric"
                autoFocus
                value={Number.isFinite(parsed) ? parsed.toLocaleString('id-ID') : value}
                onChange={(event) => setValue(event.target.value.replace(/[^0-9]/g, ''))}
                className="h-12 pl-10 text-lg font-semibold tabular-nums"
              />
            </div>
            <p className={cn('text-xs', valid || value === '' ? 'text-muted-foreground' : 'text-destructive')}>
              Minimal Rp50.000.000. Boleh dinaikkan maupun diturunkan.
            </p>
          </div>

          {verified && row.targetVerifikasi != null && valid && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
              <span className="text-sm text-muted-foreground">Total penambahan setelah verifikasi</span>
              <span className={cn('text-sm font-bold tabular-nums', parsed - row.targetVerifikasi > 0 ? 'text-emerald-600' : parsed - row.targetVerifikasi < 0 ? 'text-destructive' : '')}>
                {parsed - row.targetVerifikasi > 0 ? '+' : ''}{formatRupiah(parsed - row.targetVerifikasi)}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="target-note">Catatan (opsional)</Label>
            <Input id="target-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} className="h-11" />
          </div>
        </form>

        <footer className="flex gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={pending}>
            Batal
          </Button>
          <Button type="submit" form="target-form" className="h-11 flex-1" disabled={!valid || pending}>
            {pending ? 'Menyimpan...' : copy.save}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
