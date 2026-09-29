'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Search } from 'lucide-react';
import { useState } from 'react';
import { DealerNightSelect } from './dealer-night-select';
import { TargetAdjustmentDialog } from './target-adjustment-dialog';
import type { DealerNightOption, TargetResponse, TargetRow } from './types';
import { TombolUnduh } from '@/components/shared/tombol-unduh';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRupiah } from '@/lib/target/money';
import { targetPollingInterval, useTargetVisibilityRefresh } from '@/lib/target/use-target-polling';

export function TargetDetail({
  dealerNights,
  initialDealerNightId,
  fixedDealerNight,
  canAdjust,
  canExport,
}: {
  dealerNights: DealerNightOption[];
  initialDealerNightId: string;
  fixedDealerNight: boolean;
  canAdjust: boolean;
  canExport: boolean;
}) {
  const [dealerNightId, setDealerNightId] = useState(initialDealerNightId);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TargetRow | null>(null);
  const queryClient = useQueryClient();
  useTargetVisibilityRefresh(queryClient);
  const query = useQuery({
    queryKey: ['targets', 'list', dealerNightId],
    enabled: !!dealerNightId,
    queryFn: async (): Promise<TargetResponse> => {
      const response = await fetch(`/api/targets/list?dealerNightId=${encodeURIComponent(dealerNightId)}`);
      if (!response.ok) throw new Error('Gagal memuat Target DN.');
      return response.json();
    },
    refetchInterval: targetPollingInterval,
    placeholderData: keepPreviousData,
  });
  const needle = search.trim().toLowerCase();
  const rows = (query.data?.rows ?? []).filter((row) =>
    `${row.mgCode} ${row.mgName} ${row.depotName} ${row.salesman ?? ''} ${row.spv ?? ''}`.toLowerCase().includes(needle),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Detail Target DN</h1>
          <p className="text-sm text-muted-foreground">Target awal, penyesuaian, dan nominal efektif per toko.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <DealerNightSelect options={dealerNights} value={dealerNightId} onChange={setDealerNightId} fixed={fixedDealerNight} />
          {canExport && dealerNightId && (
            <TombolUnduh url={`/api/targets/export?dealerNightId=${encodeURIComponent(dealerNightId)}`} namaBawaan="target-dn.csv" jumlah={rows.length} label="Download CSV" />
          )}
        </div>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari toko, MG Code, depot, salesman, atau SPV..." className="h-11 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-sm" />
      </label>

      {!query.data ? <Skeleton className="h-96 rounded-2xl" /> : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left">
              <tr><th className="p-3">Toko</th><th className="p-3">Depot</th><th className="p-3 text-right">Target Awal</th><th className="p-3 text-right">Penyesuaian</th><th className="p-3 text-right">Target Efektif</th><th className="p-3 text-center">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.customerId}>
                  <td className="p-3"><p className="font-medium">{row.mgName}</p><p className="text-xs text-muted-foreground">{row.mgCode}</p></td>
                  <td className="p-3">{row.depotName}</td>
                  <td className="p-3 text-right tabular-nums">{formatRupiah(row.targetAwal)}</td>
                  <td className="p-3 text-right tabular-nums">{row.delta > 0 ? '+' : ''}{formatRupiah(row.delta)}</td>
                  <td className="p-3 text-right font-bold tabular-nums">{formatRupiah(row.targetEfektif)}</td>
                  <td className="p-3 text-center"><Button size="sm" variant="outline" onClick={() => setSelected(row)}><Pencil className="size-3.5" />{canAdjust ? 'Sesuaikan' : 'Riwayat'}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TargetAdjustmentDialog
        key={selected?.customerId ?? 'none'}
        row={selected}
        open={!!selected}
        canAdjust={canAdjust}
        onOpenChange={(open) => !open && setSelected(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['targets'] })}
      />
    </div>
  );
}
