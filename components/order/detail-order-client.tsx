'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { DetailOrderTable } from './detail-order-table';
import type { FilterOptions } from '@/app/api/dashboard/filters/route';
import type { OrderListResponse } from '@/app/api/order/list/route';
import { FilterBar, FILTER_KOSONG, type FilterState } from '@/components/dashboard/filter-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/lib/use-debounce';

const fetcher = <T,>(url: string) => async (): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url);
  return res.json();
};

const buildQuery = (f: FilterState, page: number, urut: 'asc' | 'desc') => {
  const p = new URLSearchParams();
  if (f.wilayah !== 'semua') p.set('wilayah', f.wilayah);
  if (f.region !== 'semua') p.set('region', f.region);
  if (f.depot !== 'semua') p.set('depot', f.depot);
  if (f.q) p.set('q', f.q);
  p.set('page', String(page));
  p.set('sort', urut);
  return p.toString();
};

export function DetailOrderClient({ bisaUbah }: { bisaUbah: boolean }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterState>(FILTER_KOSONG);
  const [page, setPage] = useState(1);
  const [urut, setUrut] = useState<'asc' | 'desc'>('desc');

  // Di-debounce DAN di-trim sebelum jadi kunci query: tanpa trim, "toko" dan
  // "toko " menghasilkan dua entri cache untuk pencarian yang sama.
  const q = useDebounce(filter.q, 300).trim();
  const filterEfektif = { ...filter, q };

  useEffect(() => {
    setPage(1);
  }, [filterEfektif.wilayah, filterEfektif.region, filterEfektif.depot, q]);

  const options = useQuery({
    queryKey: ['order-filters'],
    queryFn: fetcher<FilterOptions>('/api/order/filters'),
    staleTime: 5 * 60_000,
  });

  const data = useQuery({
    queryKey: ['order-list', filterEfektif, page, urut],
    queryFn: fetcher<OrderListResponse>(`/api/order/list?${buildQuery(filterEfektif, page, urut)}`),
    refetchInterval: 15_000,
    placeholderData: keepPreviousData,
  });

  const depots = options.data?.depots.map((d) => d.depot) ?? [];
  const adaFilter =
    filter.wilayah !== 'semua' || filter.region !== 'semua' || filter.depot !== 'semua' || q !== '';

  return (
    <div className="space-y-4 sm:space-y-6">
      <FilterBar
        value={filter}
        options={options.data}
        onChange={setFilter}
        withSearch
        searchPlaceholder="Cari nama toko atau kode SAP..."
      />

      {data.isError ? (
        <p className="rounded-2xl border border-destructive/50 bg-card p-4 text-sm text-destructive">
          Gagal memuat data order. Halaman mencoba lagi otomatis.
        </p>
      ) : !data.data ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : (
        <DetailOrderTable
          rows={data.data.rows}
          page={data.data.page}
          totalPages={data.data.totalPages}
          total={data.data.total}
          pageSize={data.data.pageSize}
          depots={depots}
          adaFilter={adaFilter}
          bisaUbah={bisaUbah}
          urut={urut}
          onPageChange={setPage}
          onUrutChange={setUrut}
          onChanged={() => queryClient.invalidateQueries({ queryKey: ['order-list'] })}
        />
      )}
    </div>
  );
}
