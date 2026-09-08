'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Podium } from './podium';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { LeaderRow } from '@/lib/order/leaderboard';
import { selangPolling, useRealtimeRefresh } from '@/lib/order/use-realtime-refresh';
import { cn, inisial, jamJakarta, tanggalJakarta } from '@/lib/utils';

const KUNCI_TIM = ['leaderboard', 'tim'] as const;

/**
 * Pencarian dikerjakan di klien: papan penuh memang sudah ada di memori sesi
 * tim, jadi menyaringnya lokal memberi hasil seketika tanpa request tambahan.
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

/**
 * Papan peringkat untuk sesi TIM: papan penuh beserta pencariannya.
 *
 * Customer tidak memakai komponen ini sama sekali - tampilannya ada di
 * CustomerBoard, yang menyatukan papan dengan penambahan order dalam satu
 * halaman. Pemisahan itu disengaja: keduanya sudah cukup berbeda sehingga satu
 * komponen bercabang justru membuat perubahan di sisi customer gampang bocor
 * ke tampilan tim.
 */
export function LeaderboardClient() {
  const qc = useQueryClient();
  const [cari, setCari] = useState('');

  // Dipanggil lebih dulu supaya status koneksinya bisa menentukan laju polling.
  const { tersambung } = useRealtimeRefresh(() => {
    qc.invalidateQueries({ queryKey: ['leaderboard'] });
  });

  const tim = useQuery({
    queryKey: KUNCI_TIM,
    queryFn: async (): Promise<{ top: LeaderRow[] }> => {
      const r = await fetch('/api/order/leaderboard');
      if (!r.ok) throw new Error('leaderboard');
      return r.json();
    },
    refetchInterval: selangPolling(tersambung),
    placeholderData: keepPreviousData,
  });

  const baris = tim.data?.top ?? null;
  if (!baris) return <Skeleton className="mx-auto h-96 max-w-md rounded-2xl" />;

  const kata = cari.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const mencari = kata.length > 0;
  // Saat mencari, podium disembunyikan dan SEMUA yang cocok masuk satu daftar -
  // menyaring podium hanya akan menyisakan kotak kosong.
  const daftar = mencari ? baris.filter((r) => cocok(r, kata)) : baris.slice(3);

  return (
    <main className="mx-auto max-w-md">
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

      {mencari ? (
        <p className="mb-2 text-sm text-muted-foreground">{daftar.length} toko cocok</p>
      ) : (
        <Podium top3={baris.slice(0, 3)} />
      )}

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
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold leading-tight tabular-nums">{row.total}</p>
              {row.terakhir && (
                <p
                  className="flex items-center justify-end gap-1 text-[11px] leading-tight tabular-nums text-muted-foreground"
                  title={`Mencapai angka ini pada ${tanggalJakarta(row.terakhir)}, ${jamJakarta(row.terakhir)}`}
                >
                  <Clock className="size-3 shrink-0" />
                  {jamJakarta(row.terakhir)}
                </p>
              )}
            </div>
          </li>
        ))}
        {daftar.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            {mencari ? 'Tidak ada toko yang cocok.' : 'Belum ada order.'}
          </li>
        )}
      </ul>
    </main>
  );
}
