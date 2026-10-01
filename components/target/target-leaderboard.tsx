'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Trophy } from 'lucide-react';
import { useState } from 'react';
import { DealerNightSelect } from './dealer-night-select';
import type { DealerNightOption, TargetResponse } from './types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRupiahRingkas } from '@/lib/target/money';
import { targetPollingInterval, useTargetVisibilityRefresh } from '@/lib/target/use-target-polling';
import { dnBawaan } from '@/lib/target/dn-bawaan';

export function TargetLeaderboard({ dealerNights }: { dealerNights: DealerNightOption[] }) {
  const [dealerNightId, setDealerNightId] = useState(() => dnBawaan(dealerNights));
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  useTargetVisibilityRefresh(queryClient);

  const query = useQuery({
    queryKey: ['targets', 'leaderboard', dealerNightId],
    enabled: !!dealerNightId,
    queryFn: async (): Promise<TargetResponse> => {
      const response = await fetch(`/api/targets/leaderboard?dealerNightId=${encodeURIComponent(dealerNightId)}`);
      if (!response.ok) throw new Error('Gagal memuat leaderboard Target DN.');
      return response.json();
    },
    refetchInterval: targetPollingInterval,
    placeholderData: keepPreviousData,
  });

  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rows = (query.data?.rows ?? []).filter((row) => {
    const haystack = `${row.mgCode} ${row.mgName} ${row.depotName}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">Leaderboard Target DN</h1>
        <p className="text-sm text-muted-foreground">Urutan berdasarkan nominal Target DN terbesar.</p>
      </div>

      <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:p-4">
        <label className="relative block min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari MG Code, nama toko, atau depot..."
            aria-label="Cari toko"
            className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          />
        </label>
        <DealerNightSelect options={dealerNights} value={dealerNightId} onChange={setDealerNightId} className="sm:w-52" />
      </div>

      {!dealerNightId ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Belum ada Dealer Night aktif.</p>
      ) : query.isError ? (
        <p className="rounded-xl border border-destructive/40 bg-card p-4 text-sm text-destructive">Gagal memuat data. Sistem akan mencoba lagi otomatis.</p>
      ) : !query.data ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          {rows.map((row) => (
            <li key={row.customerId} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold tabular-nums">
                {row.rank ?? '-'}
              </span>
              {row.rank && row.rank <= 3 && <Trophy className="size-4 shrink-0 text-amber-500" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{row.mgName}</p>
                <p className="text-xs text-muted-foreground">{row.mgCode} · {row.depotName}</p>
              </div>
              <p className="shrink-0 text-base font-bold tabular-nums" title={`Rp${row.targetEfektif.toLocaleString('id-ID')}`}>
                {formatRupiahRingkas(row.targetEfektif)}
              </p>
            </li>
          ))}
          {rows.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">Tidak ada toko yang cocok.</li>}
        </ol>
      )}
    </main>
  );
}
