'use client';

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { AttendanceTable } from './attendance-table';
import type { FilterOptions } from '@/app/api/dashboard/filters/route';
import {
  adaFilterAktif, FilterBar, FILTER_KOSONG, paramFilter, type FilterState,
} from '@/components/dashboard/filter-bar';
import { TombolUnduh } from '@/components/shared/tombol-unduh';
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
  return paramFilter(f, p).toString();
};

export function AttendanceClient({
  bisaUbah,
  bisaUnduh,
}: {
  bisaUbah: boolean;
  bisaUnduh: boolean;
}) {
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
    [filter.wilayah, filter.region, filter.depot, qDebounced], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Filter berubah -> kembali ke halaman 1, kalau tidak nomor halaman bisa
  // menunjuk ke luar rentang hasil yang baru.
  useEffect(() => {
    setPage(1);
  }, [filterEfektif.wilayah, filterEfektif.region, filterEfektif.depot, filterEfektif.q]);

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

  const adaFilter = adaFilterAktif(filterEfektif);

  const jumlah = data.data?.total ?? 0;


  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
        <p className="text-sm text-muted-foreground">
          {data.data ? (
            <>
              <span className="font-semibold text-foreground tabular-nums">{jumlah}</span> catatan
              kehadiran{adaFilter && ' (tersaring)'}
            </>
          ) : (
            'Memuat...'
          )}
        </p>
        {/* Mengikuti filter yang sedang aktif - kalau daftarnya disaring per
            depot, yang terunduh juga depot itu saja. */}
        {bisaUnduh && (
          <TombolUnduh
            url={`/api/kehadiran/export?${buildQuery(filterEfektif, 1, urut)}`}
            namaBawaan="Kehadiran-Pylox.xlsx"
            jumlah={jumlah}
            className="h-11 gap-2"
          />
        )}
      </div>

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
