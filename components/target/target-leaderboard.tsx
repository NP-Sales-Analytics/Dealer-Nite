'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DealerNightSelect } from './dealer-night-select';
import type { DealerNightOption, TargetResponse } from './types';
import { Button } from '@/components/ui/button';
import { PilihBanyak } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRupiahRingkas } from '@/lib/target/money';
import { targetPollingInterval, useTargetVisibilityRefresh } from '@/lib/target/use-target-polling';
import { dnBawaan } from '@/lib/target/dn-bawaan';
import { cn } from '@/lib/utils';

const PER_HALAMAN = 50;

const MEDALI = ['bg-amber-400 text-amber-950', 'bg-slate-300 text-slate-900', 'bg-orange-300 text-orange-950'];

export function TargetLeaderboard({ dealerNights }: { dealerNights: DealerNightOption[] }) {
  const [dealerNightId, setDealerNightId] = useState(() => dnBawaan(dealerNights));
  const [search, setSearch] = useState('');
  const [depot, setDepot] = useState<string[]>([]);
  const [page, setPage] = useState(1);
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

  useEffect(() => setPage(1), [dealerNightId, depot, search]);

  const semua = useMemo(() => query.data?.rows ?? [], [query.data]);
  // Depot milik DN (sudah dibatasi cakupan user), bukan hanya depot yang sudah punya toko terverifikasi.
  const pilihanDepot = useMemo(() => {
    const dariDn = (dealerNights.find((item) => item.id === dealerNightId)?.depots ?? []).map((item) => item.depot);
    return [...new Set([...dariDn, ...semua.map((row) => row.depotName)])].sort((a, b) => a.localeCompare(b, 'id'));
  }, [dealerNights, dealerNightId, semua]);
  // Peringkat dihitung ulang dalam depot terpilih; pencarian hanya menyaring tampilan.
  const berperingkat = useMemo(
    () => semua
      .filter((row) => depot.length === 0 || depot.includes(row.depotName))
      .map((row, index) => ({ ...row, rank: index + 1 })),
    [semua, depot],
  );
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rows = berperingkat.filter((row) => {
    const haystack = `${row.mgCode} ${row.mgName} ${row.depotName}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / PER_HALAMAN));
  const aman = Math.min(page, totalPages);
  const tampil = rows.slice((aman - 1) * PER_HALAMAN, aman * PER_HALAMAN);
  const adaFilter = depot.length > 0 || terms.length > 0;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4">
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-xs sm:p-4 lg:flex-row lg:items-center">
        <label className="relative block min-w-0 lg:flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari MG Code atau nama toko..."
            aria-label="Cari toko"
            className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-2.5 lg:flex-nowrap">
          <DealerNightSelect
            options={dealerNights}
            value={dealerNightId}
            onChange={(id) => { setDealerNightId(id); setDepot([]); }}
            className="min-w-0 basis-full sm:basis-auto sm:w-40 sm:flex-none"
          />
          <PilihBanyak
            items={pilihanDepot}
            value={depot}
            onChange={setDepot}
            labelSemua="Semua Depot"
            satuan="Depot"
            cariPlaceholder="Cari depot..."
            kosong="Depot tidak ditemukan."
            className="min-w-0 flex-1 sm:w-44 sm:flex-none"
          />
          {adaFilter && (
            <Button variant="outline" className="h-11 shrink-0 px-4" onClick={() => { setDepot([]); setSearch(''); }}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {!dealerNightId ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Belum ada Dealer Night aktif.</p>
      ) : query.isError ? (
        <p className="rounded-2xl border border-destructive/40 bg-card p-4 text-sm text-destructive">Gagal memuat data. Sistem akan mencoba lagi otomatis.</p>
      ) : !query.data ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-xs">
          <Trophy className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
          <p className="mt-3 font-medium">{semua.length === 0 ? 'Leaderboard masih kosong' : 'Tidak ada toko yang cocok'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {semua.length === 0 ? 'Toko masuk leaderboard setelah targetnya diverifikasi admin DN.' : 'Coba ganti depot atau kata kunci.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <ol className="divide-y divide-border">
            {tampil.map((row) => (
              <li key={row.customerId} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums',
                    row.rank <= 3 ? MEDALI[row.rank - 1] : 'bg-secondary text-foreground',
                  )}
                >
                  {row.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-medium leading-snug">
                    <span className="min-w-0 break-words">{row.mgName}</span>
                    {row.rank <= 3 && <Trophy className="size-3.5 shrink-0 text-amber-500" aria-hidden />}
                  </p>
                  <p className="text-xs text-muted-foreground">{row.mgCode} · {row.depotName}</p>
                </div>
                <p className="shrink-0 text-base font-bold tabular-nums" title={`Rp${row.targetEfektif.toLocaleString('id-ID')}`}>
                  {formatRupiahRingkas(row.targetEfektif)}
                </p>
              </li>
            ))}
          </ol>
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Peringkat {(aman - 1) * PER_HALAMAN + 1}&ndash;{Math.min(aman * PER_HALAMAN, rows.length)} dari {rows.length} toko terverifikasi
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(aman - 1)}
                disabled={aman <= 1}
                aria-label="Halaman sebelumnya"
                className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs tabular-nums text-muted-foreground">{aman}/{totalPages}</span>
              <button
                type="button"
                onClick={() => setPage(aman + 1)}
                disabled={aman >= totalPages}
                aria-label="Halaman berikutnya"
                className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
