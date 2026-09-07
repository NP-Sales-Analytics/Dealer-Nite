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

/** Balasan /api/order/me: podium DAN posisi sendiri, dari satu snapshot papan. */
type DataSaya = {
  customerId: string;
  namaToko: string;
  depot: string | null;
  total: number;
  rank: number | null;
  terakhir: string | null;
  top: LeaderRow[];
};

const KUNCI_TIM = ['leaderboard', 'tim'] as const;
const KUNCI_ME = ['order', 'me'] as const;

const ambil = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url);
  return r.json();
};

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

/** Kartu posisi toko sendiri. Untuk customer inilah satu-satunya info peringkat. */
function KartuPosisi({ me }: { me: DataSaya }) {
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
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold leading-tight tabular-nums">{me.total}</p>
          {me.terakhir && (
            <p className="flex items-center justify-end gap-1 text-[11px] leading-tight tabular-nums text-primary-foreground/80">
              <Clock className="size-3 shrink-0" />
              {jamJakarta(me.terakhir)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Dua jalur pengambilan data, sengaja dipisah menurut peran:
 *
 * - Customer (ratusan orang) memanggil SATU endpoint, /api/order/me, yang
 *   membawa podium sekaligus posisinya sendiri. Satu request, satu snapshot.
 *   Dulu keduanya datang dari dua endpoint dengan cache berbeda - podium boleh
 *   disimpan CDN sampai 45 detik, posisi pribadi tidak - sehingga layar yang
 *   sama bisa menyebut dua angka yang bertentangan untuk toko yang sama.
 * - Tim (segelintir orang) memanggil papan penuh yang tetap privat, karena
 *   isinya memuat kode_sap dan seluruh peringkat yang dibutuhkan pencarian.
 *
 * Perannya datang dari server lewat prop, bukan ditebak dari bentuk payload:
 * keduanya endpoint yang berbeda, jadi harus diketahui sebelum memanggil.
 */
export function LeaderboardClient({ tampilanCustomer }: { tampilanCustomer: boolean }) {
  const qc = useQueryClient();
  const [cari, setCari] = useState('');

  // Dipanggil lebih dulu supaya status koneksinya bisa menentukan laju polling
  // cadangan di bawah.
  const { tersambung } = useRealtimeRefresh(() => {
    qc.invalidateQueries({ queryKey: ['leaderboard'] });
    if (tampilanCustomer) qc.invalidateQueries({ queryKey: KUNCI_ME });
  });
  const refetchInterval = selangPolling(tersambung);

  const me = useQuery({
    queryKey: KUNCI_ME,
    enabled: tampilanCustomer,
    queryFn: () => ambil<DataSaya>('/api/order/me'),
    refetchInterval,
    placeholderData: keepPreviousData,
  });

  const tim = useQuery({
    queryKey: KUNCI_TIM,
    enabled: !tampilanCustomer,
    queryFn: () => ambil<{ top: LeaderRow[] }>('/api/order/leaderboard'),
    refetchInterval,
    placeholderData: keepPreviousData,
  });

  const baris = (tampilanCustomer ? me.data?.top : tim.data?.top) ?? null;
  if (!baris) return <Skeleton className="mx-auto h-96 max-w-md rounded-2xl" />;

  const kata = cari.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const mencari = kata.length > 0;
  // Saat mencari, podium disembunyikan dan SEMUA yang cocok masuk satu daftar -
  // menyaring podium hanya akan menyisakan kotak kosong.
  const daftar = mencari ? baris.filter((r) => cocok(r, kata)) : baris.slice(3);

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
        <Podium top3={baris.slice(0, 3)} meId={me.data?.customerId} />
      )}

      {tampilanCustomer ? (
        me.data && <KartuPosisi me={me.data} />
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
      )}
    </main>
  );
}
