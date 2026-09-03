'use client';

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { AttendanceTable } from './attendance-table';
import type { FilterOptions } from '@/app/api/dashboard/filters/route';
import { FilterBar, FILTER_KOSONG, type FilterState } from '@/components/dashboard/filter-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/lib/use-debounce';
import type { AttendanceResponse } from '@/lib/dashboard/types';

const fetcher = <T,>(url: string) => async (): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url);
  return res.json();
};

const buildQuery = (f: FilterState, page: number, urut: 'asc' | 'desc') => {
  const p = new URLSearchParams({ page: String(page) });
  if (urut === 'asc') p.set('sort', 'asc');
  if (f.region !== 'semua') p.set('region', f.region);
  if (f.depot !== 'semua') p.set('depot', f.depot);
  if (f.q.trim()) p.set('q', f.q.trim());
  return p.toString();
};

export function AttendanceClient({ bisaUbah }: { bisaUbah: boolean }) {
  const [filter, setFilter] = useState<FilterState>(FILTER_KOSONG);
  const [page, setPage] = useState(1);
  const [urut, setUrut] = useState<'asc' | 'desc'>('desc');
  const queryClient = useQueryClient();

  // Ketikan di-debounce; region/depot langsung berlaku karena sekali klik.
  // Di-trim di sini, bukan hanya di buildQuery: kunci query yang menyimpan
  // "abc " terhitung beda dari "abc" dan memicu fetch untuk pencarian yang sama.
  const qDebounced = useDebounce(filter.q, 300).trim();
  const filterEfektif = useMemo(
    () => ({ ...filter, q: qDebounced }),
    [filter.region, filter.depot, qDebounced], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Filter berubah -> kembali ke halaman 1, kalau tidak nomor halaman bisa
  // menunjuk ke luar rentang hasil yang baru.
  useEffect(() => {
    setPage(1);
  }, [filterEfektif.region, filterEfektif.depot, filterEfektif.q]);

  const options = useQuery({
    queryKey: ['filters'],
    queryFn: fetcher<FilterOptions>('/api/dashboard/filters'),
    staleTime: 5 * 60_000,
  });

  const data = useQuery({
    queryKey: ['kehadiran', filterEfektif, page, urut],
    queryFn: fetcher<AttendanceResponse>(`/api/dashboard/recent?${buildQuery(filterEfektif, page, urut)}`),
    refetchInterval: 15_000,
    // Tahan hasil lama saat pindah halaman supaya tabel tidak berkedip kosong.
    placeholderData: keepPreviousData,
  });

  const namaDepot = useMemo(
    () => (options.data?.depots ?? []).map((d) => d.depot),
    [options.data],
  );

  const adaFilter =
    filterEfektif.region !== 'semua' || filterEfektif.depot !== 'semua' || filterEfektif.q.trim() !== '';

  return (
    <>
      <FilterBar
        value={filter}
        options={options.data}
        onChange={setFilter}
        withSearch
      />

      {data.isError ? (
        <p className="rounded-2xl border border-destructive/50 bg-card p-4 text-sm text-destructive">
          Gagal memuat daftar kehadiran. Halaman mencoba lagi otomatis setiap 15 detik.
        </p>
      ) : !data.data ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : (
        <AttendanceTable
          rows={data.data.rows}
          page={data.data.page}
          totalPages={data.data.totalPages}
          total={data.data.total}
          pageSize={data.data.pageSize}
          depots={namaDepot}
          adaFilter={adaFilter}
          bisaUbah={bisaUbah}
          urut={urut}
          onPageChange={setPage}
          onUrutChange={(v) => { setUrut(v); setPage(1); }}
          onChanged={() => queryClient.invalidateQueries()}
        />
      )}
    </>
  );
}
