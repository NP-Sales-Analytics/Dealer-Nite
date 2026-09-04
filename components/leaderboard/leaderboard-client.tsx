'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crosshair, Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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
 * Pencarian dikerjakan di klien: seluruh papan (maks 500 baris) memang sudah ada
 * di memori demi fitur "gulir ke posisi saya", jadi menyaringnya lokal memberi
 * hasil seketika tanpa request tambahan.
 *
 * Tiap kata dicocokkan terpisah dan harus semuanya kena, sehingga "warna jakarta"
 * menemukan toko bernama WARNA yang depotnya Jakarta.
 *
 * Cakupannya mengikuti apa yang dikirim server: sesi customer tidak menerima
 * kodeSap/wilayah/region sama sekali, jadi pencariannya otomatis terbatas pada
 * nama toko dan depot - bukan sekadar disembunyikan di tampilan.
 */
function cocok(row: LeaderRow, kata: string[]) {
  const teks = [row.namaToko, row.kodeSap, row.wilayah, row.region, row.depot]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return kata.every((k) => teks.includes(k));
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
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
  });
  useRealtimeRefresh(() => qc.invalidateQueries({ queryKey: KEY }));

  const [cari, setCari] = useState('');

  // Elemen yang mewakili "saya" di papan: kartu podium kalau juara 1-3, atau
  // baris daftar untuk selebihnya. Dipantau supaya bilah melayang hanya muncul
  // ketika posisinya TIDAK terlihat - kalau sudah kelihatan, barisnya sendiri
  // yang ditandai dan bilah cuma jadi penghalang.
  const [nodeSaya, setNodeSaya] = useState<HTMLElement | null>(null);
  const [terlihat, setTerlihat] = useState(false);
  const refSaya = useCallback((el: HTMLElement | null) => setNodeSaya(el), []);

  useEffect(() => {
    if (!nodeSaya) {
      setTerlihat(false);
      return;
    }
    const io = new IntersectionObserver(([e]) => setTerlihat(e.isIntersecting), { threshold: 0.6 });
    io.observe(nodeSaya);
    return () => io.disconnect();
  }, [nodeSaya]);

  if (!q.data) return <Skeleton className="mx-auto h-96 max-w-md rounded-2xl" />;
  const { top, me } = q.data;

  const kata = cari.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const mencari = kata.length > 0;
  // Saat mencari, podium disembunyikan dan SEMUA yang cocok masuk satu daftar -
  // menyaring podium hanya akan menyisakan kotak kosong.
  const daftar = mencari ? top.filter((r) => cocok(r, kata)) : top.slice(3);
  // me hanya terisi untuk sesi customer, jadi ini sekaligus penanda perannya.
  // Server memang sudah memangkas kolomnya; ini menyelaraskan teks bantuannya.
  const bolehCariKode = !me;
  const sayaDiPodium = !mencari && me?.rank != null && me.rank <= 3;
  const tampilkanBilah = !!me && !terlihat;

  return (
    <main className="mx-auto max-w-md">
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder={
            bolehCariKode ? 'Cari toko, kode SAP, depot, wilayah...' : 'Cari nama toko atau depot...'
          }
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
        <div ref={sayaDiPodium ? refSaya : undefined}>
          <Podium top3={top.slice(0, 3)} meId={me?.customerId} />
        </div>
      )}

      <ul
        className={cn(
          'divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card',
          !mencari && 'mt-4',
        )}
      >
        {daftar.map((row) => {
          const saya = row.customerId === me?.customerId;
          return (
            <li
              key={row.customerId}
              ref={saya && !sayaDiPodium ? refSaya : undefined}
              className={cn(
                'flex items-center gap-3 px-4 py-3',
                saya && 'bg-primary text-primary-foreground',
              )}
            >
              <span
                className={cn(
                  'w-7 shrink-0 text-center text-sm font-semibold tabular-nums',
                  saya ? 'text-primary-foreground' : 'text-muted-foreground',
                )}
              >
                {row.rank}
              </span>
              <Avatar size="default" className="size-10">
                <AvatarFallback
                  className={cn(
                    'text-xs font-semibold',
                    saya && 'bg-primary-foreground/20 text-primary-foreground',
                  )}
                >
                  {inisial(row.namaToko)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug break-words">
                  {row.namaToko}
                  {saya && <span className="ml-1 font-semibold">&middot; Anda</span>}
                </p>
                {row.depot && (
                  <p
                    className={cn(
                      'text-xs leading-tight break-words',
                      saya ? 'text-primary-foreground/80' : 'text-muted-foreground',
                    )}
                  >
                    {row.depot}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums">{row.total}</span>
            </li>
          );
        })}
        {daftar.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            {mencari ? 'Tidak ada toko yang cocok.' : 'Belum ada order.'}
          </li>
        )}
      </ul>

      {/* sticky, BUKAN fixed: fixed mengukur dari tepi viewport sehingga di
          desktop bilahnya bergeser ke kiri karena tidak menghitung lebar
          sidebar. Sebagai anak biasa di kolom konten, ia otomatis sejajar. */}
      {tampilkanBilah && me && (
        <div className="sticky bottom-4 z-20 mt-4">
          <button
            type="button"
            onClick={() => nodeSaya?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            disabled={!nodeSaya}
            aria-label={
              nodeSaya ? `Lihat posisi Anda, peringkat ${me.rank}` : 'Anda belum punya dus tercatat'
            }
            className="flex w-full items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-left text-primary-foreground shadow-lg transition-transform active:scale-[0.99] disabled:cursor-default"
          >
            <span className="w-7 shrink-0 text-center text-sm font-bold tabular-nums">
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
            <span className="shrink-0 text-sm font-bold tabular-nums">{me.total}</span>
            {nodeSaya && <Crosshair className="size-4 shrink-0 opacity-80" />}
          </button>
        </div>
      )}
    </main>
  );
}
