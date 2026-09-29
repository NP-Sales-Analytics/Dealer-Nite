'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { TargetRow } from './types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildTargetAdjustment, parseRupiahInput, targetFormCopy } from '@/lib/target/form';
import { formatRupiah } from '@/lib/target/money';

type HistoryResponse = {
  history: Array<{ id: string; delta: number; note: string | null; recordedByName: string | null; createdAt: string }>;
};

export function TargetAdjustmentDialog({
  row,
  open,
  canAdjust,
  onOpenChange,
  onSaved,
}: {
  row: TargetRow | null;
  open: boolean;
  canAdjust: boolean;
  onOpenChange: (value: boolean) => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(row ? String(row.targetEfektif) : '');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();
  const history = useQuery({
    queryKey: ['targets', 'history', row?.customerId],
    enabled: open && !!row,
    queryFn: async (): Promise<HistoryResponse> => {
      const response = await fetch(`/api/targets/history?customerId=${encodeURIComponent(row!.customerId)}`);
      if (!response.ok) throw new Error('Gagal memuat riwayat.');
      return response.json();
    },
  });
  const parsed = parseRupiahInput(value);
  const delta = row && Number.isFinite(parsed) ? parsed - row.targetEfektif : 0;
  const copy = useMemo(() => targetFormCopy({ currentTarget: row?.targetEfektif ?? 0 }), [row]);

  if (!row) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86svh] overflow-y-auto sm:max-w-lg">
        <div className="space-y-1">
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{row.mgName} · {row.mgCode}</DialogDescription>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-secondary/30 p-3 text-center text-xs">
          <div><p className="text-muted-foreground">Target lama</p><p className="font-semibold">{formatRupiah(row.targetEfektif)}</p></div>
          <div><p className="text-muted-foreground">Selisih</p><p className="font-semibold">{delta > 0 ? '+' : ''}{formatRupiah(delta)}</p></div>
          <div><p className="text-muted-foreground">Target baru</p><p className="font-semibold">{Number.isFinite(parsed) ? formatRupiah(parsed) : '-'}</p></div>
        </div>

        {canAdjust && (
          <form
            className="space-y-4"
            action={() => startTransition(async () => {
              try {
                const body = { ...buildTargetAdjustment(row.customerId, value), note };
                const response = await fetch('/api/targets/adjust', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Gagal menyimpan penyesuaian.');
                toast.success('Target DN diperbarui.');
                onSaved();
                onOpenChange(false);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Gagal menyimpan penyesuaian.');
              }
            })}
          >
            <div className="space-y-2">
              <Label htmlFor="target-value">Target DN baru</Label>
              <Input
                id="target-value"
                inputMode="numeric"
                value={Number.isFinite(parsed) ? parsed.toLocaleString('id-ID') : value}
                onChange={(event) => setValue(event.target.value.replace(/[^0-9]/g, ''))}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">Minimal Rp50.000.000. Nilai boleh dinaikkan maupun diturunkan.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-note">Catatan (opsional)</Label>
              <Input id="target-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>{pending ? 'Menyimpan...' : copy.save}</Button>
          </form>
        )}

        <section className="space-y-2 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Riwayat Penyesuaian</h3>
          {history.isLoading ? <p className="text-sm text-muted-foreground">Memuat riwayat...</p> : (
            <ul className="space-y-2">
              {(history.data?.history ?? []).map((item) => (
                <li key={item.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex justify-between gap-3"><span>{item.recordedByName ?? 'Akun lama'}</span><strong>{item.delta > 0 ? '+' : ''}{formatRupiah(item.delta)}</strong></div>
                  <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString('id-ID')}</p>
                  {item.note && <p className="mt-1 text-xs">{item.note}</p>}
                </li>
              ))}
              {history.data?.history.length === 0 && <li className="text-sm text-muted-foreground">Belum ada penyesuaian.</li>}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
