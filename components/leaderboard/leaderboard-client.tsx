'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Podium } from './podium';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { LeaderRow } from '@/lib/order/leaderboard';
import { useRealtimeRefresh } from '@/lib/order/use-realtime-refresh';
import { inisial } from '@/lib/utils';

type MeRow = LeaderRow & { rank: number | null };
type Data = { top: LeaderRow[]; me: MeRow | null };
const KEY = ['leaderboard'] as const;

export function LeaderboardClient() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Data> => {
      const r = await fetch('/api/order/leaderboard');
      if (!r.ok) throw new Error('leaderboard');
      return r.json();
    },
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
  });
  useRealtimeRefresh(() => qc.invalidateQueries({ queryKey: KEY }));

  if (!q.data) return <Skeleton className="m-4 h-96 rounded-2xl" />;
  const { top, me } = q.data;
  const rest = top.slice(3);

  return (
    <main className="mx-auto max-w-md p-4 pb-24">
      <h1 className="mb-4 text-center text-xl font-bold">Top Spender</h1>
      <Podium top3={top.slice(0, 3)} />

      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {rest.map((row) => (
          <li key={row.customerId} className="flex items-center gap-3 px-4 py-3">
            <span className="w-6 text-center text-sm font-semibold tabular-nums text-muted-foreground">{row.rank}</span>
            <Avatar size="sm">
              <AvatarFallback>{inisial(row.namaToko)}</AvatarFallback>
            </Avatar>
            <span className="line-clamp-1 flex-1 text-sm font-medium">{row.namaToko}</span>
            <span className="text-sm font-bold tabular-nums">{row.total}</span>
          </li>
        ))}
        {top.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada order.</li>
        )}
      </ul>

      {me && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-lg">
            <span className="w-8 text-center text-sm font-bold tabular-nums">{me.rank ?? '—'}</span>
            <Avatar size="sm">
              <AvatarFallback>{inisial(me.namaToko)}</AvatarFallback>
            </Avatar>
            <span className="flex-1 text-sm font-semibold">
              {me.rank ? me.namaToko : `${me.namaToko} · Belum ada dus`}
            </span>
            <span className="text-sm font-bold tabular-nums">{me.total}</span>
          </div>
        </div>
      )}
    </main>
  );
}
