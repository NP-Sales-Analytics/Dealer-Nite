'use client';

import { CalendarDays, Save, Target, Users } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { simpanSettingPax } from '@/app/(app)/setting/pax/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DealerNightTargetPax } from '@/lib/pax-targets';
import { formatRupiahRingkas } from '@/lib/target/money';

const angka = (value: string) => {
  const n = Number(value.replace(/[^0-9]/g, ''));
  return Number.isSafeInteger(n) ? n : 0;
};

const tanggal = (iso?: string | null) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  : 'Tanggal belum diatur');

export function PaxTargetForm({ rows }: { rows: DealerNightTargetPax[] }) {
  const [pax, setPax] = useState<Record<string, string>>(
    () => Object.fromEntries(rows.map((row) => [row.id, String(row.targetPax)])),
  );
  const [targetDn, setTargetDn] = useState<Record<string, string>>(
    () => Object.fromEntries(rows.map((row) => [row.id, String(row.targetDn)])),
  );
  const [pending, start] = useTransition();

  const total = useMemo(() => ({
    pax: Object.values(pax).reduce((sum, value) => sum + angka(value), 0),
    dn: Object.values(targetDn).reduce((sum, value) => sum + angka(value), 0),
  }), [pax, targetDn]);

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Belum ada Dealer Night aktif yang bisa Anda atur.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Target className="size-5" />
          </span>
          <p className="mt-3 text-sm text-muted-foreground">Total Target DN</p>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{formatRupiahRingkas(total.dn)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">dari {rows.length} Dealer Night</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
          <span className="grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground">
            <Users className="size-5" />
          </span>
          <p className="mt-3 text-sm text-muted-foreground">Total Target Pax</p>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{total.pax}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">orang dari {rows.length} Dealer Night</p>
        </div>
      </div>

      <form
        action={(formData) => start(async () => {
          const pesan = await simpanSettingPax(formData);
          if (pesan) {
            toast.error(pesan);
            return;
          }
          toast.success('Target Dealer Night berhasil disimpan.');
        })}
      >
        <div className="rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <h2 className="font-semibold">Target per Dealer Night</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Target DN jadi pembanding Pencapaian Malam DN; target pax untuk dashboard kehadiran.
              </p>
            </div>
            <Button type="submit" className="h-11 gap-2 px-5" disabled={pending}>
              <Save className="size-4" />
              {pending ? 'Menyimpan...' : 'Simpan Target'}
            </Button>
          </div>

          <div className="hidden grid-cols-[minmax(0,1fr)_14rem_9rem] gap-4 border-b border-border bg-secondary/40 px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid">
            <span>Dealer Night</span>
            <span>Total Target DN</span>
            <span>Target Pax</span>
          </div>

          <div className="divide-y divide-border">
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-1 gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_14rem_9rem] md:items-center md:gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">{row.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {tanggal(row.eventDate)}
                  </p>
                </div>
                <label className="relative block">
                  <span className="sr-only">Total Target DN {row.name}</span>
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">Rp</span>
                  <Input
                    name="targetDn"
                    inputMode="numeric"
                    value={angka(targetDn[row.id] ?? '0').toLocaleString('id-ID')}
                    onChange={(event) => setTargetDn((lama) => ({ ...lama, [row.id]: event.target.value }))}
                    className="h-11 pl-9 text-right font-semibold tabular-nums"
                  />
                </label>
                <label className="relative block">
                  <span className="sr-only">Target pax {row.name}</span>
                  <Input
                    name="targetPax"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={1_000_000}
                    step={1}
                    required
                    value={pax[row.id] ?? ''}
                    onChange={(event) => setPax((lama) => ({ ...lama, [row.id]: event.target.value }))}
                    className="h-11 pr-11 text-right tabular-nums"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">pax</span>
                </label>
                <input type="hidden" name="dealerNightId" value={row.id} />
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
