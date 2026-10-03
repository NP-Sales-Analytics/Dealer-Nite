'use client';

import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, FileText, SlidersHorizontal } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { TargetRow } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildTargetAdjustment, parseRupiahInput, targetFormCopy } from '@/lib/target/form';
import { formatRupiah } from '@/lib/target/money';
import { MIN_TARGET_DN } from '@/lib/target/rules';
import { cn } from '@/lib/utils';

/**
 * Form verifikasi (belum diverifikasi) atau penyesuaian (sudah). Dipasang dengan
 * key yang memuat status & target terakhir, jadi isiannya ikut segar setelah simpan.
 */
export function TargetFormPanel({ row, onSaved }: { row: TargetRow; onSaved: () => void }) {
  const verified = !!row.verifiedAt;
  const [value, setValue] = useState(String(row.targetEfektif));
  const [pending, startTransition] = useTransition();
  const parsed = parseRupiahInput(value);
  const valid = Number.isFinite(parsed) && parsed >= MIN_TARGET_DN;
  const delta = valid ? parsed - row.targetEfektif : 0;
  const copy = targetFormCopy({ currentTarget: verified ? row.targetEfektif : row.targetAwal, verified });
  const Ikon = verified ? SlidersHorizontal : BadgeCheck;
  // Penyesuaian tanpa perubahan nilai tidak disimpan, jadi tidak memakan nomor formulir.
  const bisaSimpan = valid && (!verified || delta !== 0);

  // Pratinjau nomor formulir; disegarkan berkala karena admin lain bisa menyimpan lebih dulu.
  const formBerikut = useQuery({
    queryKey: ['targets', 'form-berikut', row.dealerNightId],
    queryFn: async (): Promise<{ nomor: number }> => {
      const response = await fetch(`/api/targets/form-berikut?dealerNightId=${encodeURIComponent(row.dealerNightId)}`);
      if (!response.ok) throw new Error('Gagal memuat nomor formulir.');
      return response.json();
    },
    refetchInterval: 5_000,
    staleTime: 0,
  });
  const nomorPratinjau = formBerikut.data?.nomor;

  const simpan = () => startTransition(async () => {
    try {
      const response = await fetch('/api/targets/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildTargetAdjustment(row.customerId, value)),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal menyimpan.');
      const nomor = Number(result.noFormulir);
      toast.success(`${verified ? 'Penyesuaian' : 'Verifikasi'} tersimpan dengan No. Formulir ${nomor}.`);
      if (nomorPratinjau !== undefined && nomor !== nomorPratinjau) {
        toast.warning(
          `No. Formulir berubah dari ${nomorPratinjau} menjadi ${nomor} karena admin lain menyimpan lebih dulu. Tulis nomor ${nomor} di formulir.`,
          { duration: 15_000 },
        );
      }
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan.');
    }
  });

  return (
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (bisaSimpan) simpan(); }}>
      <div className="flex items-center gap-2.5">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', verified ? 'bg-primary/10 text-primary' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15')} aria-hidden>
          <Ikon className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">{copy.title}</p>
          <p className="text-xs text-muted-foreground">{copy.instruction}</p>
        </div>
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
            className="h-11 bg-card pl-10 text-base font-semibold tabular-nums"
          />
        </div>
        <p className={cn('text-xs', valid || value === '' ? 'text-muted-foreground' : 'text-destructive')}>
          Minimal Rp50.000.000.
        </p>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {[
          { label: verified ? 'Target saat ini' : 'Target pusat', nilai: formatRupiah(row.targetEfektif), warna: '' },
          { label: 'Selisih', nilai: `${delta > 0 ? '+' : ''}${formatRupiah(delta)}`, warna: delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-destructive' : '' },
          ...(verified && row.targetVerifikasi != null && valid ? [{
            label: 'Total penambahan',
            nilai: `${parsed - row.targetVerifikasi > 0 ? '+' : ''}${formatRupiah(parsed - row.targetVerifikasi)}`,
            warna: parsed - row.targetVerifikasi > 0 ? 'text-emerald-600' : parsed - row.targetVerifikasi < 0 ? 'text-destructive' : '',
          }] : []),
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <span className={cn('text-sm font-semibold tabular-nums', item.warna)}>{item.nilai}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3.5 py-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden>
          <FileText className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">No. Formulir</p>
          <p className="text-[11px] text-muted-foreground">Tulis nomor ini di formulir fisik</p>
        </div>
        <span className="text-2xl font-bold tabular-nums text-primary">{nomorPratinjau ?? '…'}</span>
      </div>

      <Button type="submit" className="h-11 w-full gap-2" disabled={!bisaSimpan || pending}>
        <Ikon className="size-4" />
        {pending ? 'Menyimpan...' : copy.save}
      </Button>
    </form>
  );
}
