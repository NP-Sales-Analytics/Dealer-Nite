'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { Podium } from './podium';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { LeaderRow } from '@/lib/order/leaderboard';
import { useRealtimeRefresh } from '@/lib/order/use-realtime-refresh';
import { cn, inisial } from '@/lib/utils';

type MeRow = LeaderRow & { rank: number | null };
type Data = { top: LeaderRow[]; me: MeRow | null };
const KEY = ['leaderboard'] as const;

/**
 * Pencarian dikerjakan di klien: seluruh papan memang sudah ada di memori, jadi
 * menyaringnya lokal memberi hasil seketika tanpa request tambahan.
 *
 * Tiap kata dicocokkan terpisah dan harus semuanya kena, sehingga "warna jakarta"
 * menemukan toko bernama WARNA yang depotnya Jakarta.
 */
function cocok(row: LeaderRow, kata: string[]) {
  const teks = [row.namaToko, row.kodeSap, row.wilayah, row.region, row.depot]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return kata.every((k) => teks.includes(k));
}

/** Kartu posisi toko sendiri. Untuk customer inilah satu-satunya info peringkat. */
function KartuPosisi({ me }: { me: MeRow }) {
  return (
    <div className="mt-4 rounded-2xl bg-primary px-4 py-4 text-primary-foreground shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-foreground/70">
        Posisi Toko Anda
      </p>
      <div className="mt-2.5 flex items-center gap-3">
        <span className="w-9 shrink-0 text-center text-lg font-bold tabular-nums">
          {me.rank ?? '—'}
        </span>
        <Avatar size="default" className="size-10">
          <AvatarFallback className="bg-primary-foreground/20 text-xs font-semibold text-primary-foreground">
            {inisial(me.namaToko)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug break-words">{me.namaToko}</p>
          <p className="text-[11px] leading-tight text-primary-foreground/80 break-words">
            {me.rank ? (me.depot ?? '') : 'Belum ada dus tercatat'}
          </p>
        </div>
        <span className="shrink-0 text-lg font-bold tabular-nums">{me.total}</span>
      </div>
    </div>
  );
}

export function LeaderboardClient() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Data> => {
      const r = await fetch('/api/order/leaderboard');
      if (!r.ok) throw new Error('leaderboard');
      return r.json();
    },
    // Realtime yang jadi jalur cepat; polling hanya cadangan saat koneksi putus.
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  });
  useRealtimeRefresh(() => qc.invalidateQueries({ queryKey: KEY }));

  const [cari, setCari] = useState('');

  if (!q.data) return <Skeleton className="mx-auto h-96 max-w-md rounded-2xl" />;
  const { top, me } = q.data;

  /**
   * me hanya terisi untuk sesi customer, jadi ini sekaligus penanda perannya.
   *
   * Customer melihat podium 1-3 + posisinya sendiri, tanpa daftar peringkat lain
   * dan tanpa pencarian - melihat posisi toko lain memicu sentimen antar toko.
   * Servernya memang sudah hanya mengirim 3 baris, jadi ini menyelaraskan
   * tampilannya, bukan menjadi satu-satunya penjaga.
   */
  const tampilanCustomer = !!me;

  const kata = cari.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const mencari = kata.length > 0;
  // Saat mencari, podium disembunyikan dan SEMUA yang cocok masuk satu daftar -
  // menyaring podium hanya akan menyisakan kotak kosong.
  const daftar = mencari ? top.filter((r) => cocok(r, kata)) : top.slice(3);

  return (
    <main className="mx-auto max-w-md">
      {!tampilanCustomer && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari toko, kode SAP, depot, wilayah..."
            autoComplete="off"
            aria-label="Cari di papan Top Spender"
            className="h-12 w-full rounded-xl border border-border bg-card pl-12 pr-12 text-base shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          />
          {cari && (
            <button
              type="button"
              onClick={() => setCari('')}
              aria-label="Hapus pencarian"
              className="absolute right-0 top-0 grid h-12 w-12 place-items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
      )}

      {mencari ? (
        <p className="mb-2 text-sm text-muted-foreground">{daftar.length} toko cocok</p>
      ) : (
        <Podium top3={top.slice(0, 3)} meId={me?.customerId} />
      )}

      {tampilanCustomer && me ? (
        <KartuPosisi me={me} />
      ) : (
        <ul
          className={cn(
            'divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card',
            !mencari && 'mt-4',
          )}
        >
          {daftar.map((row) => (
            <li key={row.customerId} className="flex items-center gap-3 px-4 py-3">
              <span className="w-7 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                {row.rank}
              </span>
              <Avatar size="default" className="size-10">
                <AvatarFallback className="text-xs font-semibold">
                  {inisial(row.namaToko)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug break-words">{row.namaToko}</p>
                {row.depot && (
                  <p className="text-xs leading-tight text-muted-foreground break-words">
                    {row.depot}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums">{row.total}</span>
            </li>
          ))}
          {daftar.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              {mencari ? 'Tidak ada toko yang cocok.' : 'Belum ada order.'}
            </li>
          )}
        </ul>
      )}
    </main>
  );
}
