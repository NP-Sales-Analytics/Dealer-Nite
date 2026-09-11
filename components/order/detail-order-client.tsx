'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DetailOrderTable } from './detail-order-table';
import { MasterCustomerDialog } from './master-customer-dialog';
import type { FilterOptions } from '@/app/api/dashboard/filters/route';
import type { OrderListResponse } from '@/app/api/order/list/route';
import {
  adaFilterAktif, FilterBar, FILTER_KOSONG, paramFilter, type FilterState,
} from '@/components/dashboard/filter-bar';
import { TombolUnduh } from '@/components/shared/tombol-unduh';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { PilihanDepot } from '@/lib/dashboard/hierarchy';
import { useDebounce } from '@/lib/use-debounce';

const fetcher = <T,>(url: string) => async (): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url);
  return res.json();
};

const buildQuery = (f: FilterState, page: number, urut: 'asc' | 'desc') => {
  const p = paramFilter(f);
  p.set('page', String(page));
  p.set('sort', urut);
  return p.toString();
};

export function DetailOrderClient({
  bisaUbah,
  bisaUnduh,
  depotOptions,
}: {
  bisaUbah: boolean;
  bisaUnduh: boolean;
  depotOptions: PilihanDepot[];
}) {
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

  const [tambah, setTambah] = useState(false);
  const adaFilter = adaFilterAktif({ ...filter, q });
  const jumlah = data.data?.total ?? 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Urutannya sengaja: ringkasan + aksi utama di paling atas, penyaring di
          bawahnya, baru tabelnya. Aksi yang paling sering dicari tidak perlu
          dilewati dulu oleh sebaris filter. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{jumlah}</span> toko terdaftar
        </p>
        {/* Kedua aksi disamakan tingginya - dua tombol berdampingan dengan
            ukuran berbeda terbaca seperti yang satu lebih penting dari yang
            lain, padahal keduanya sama-sama aksi utama. */}
        <div className="flex items-center gap-2.5">
          {bisaUnduh && (
            <TombolUnduh
              url={`/api/order/export?${buildQuery(filterEfektif, 1, urut)}`}
              namaBawaan="Detail-Order-Pylox.xlsx"
              jumlah={jumlah}
              className="h-11 gap-2"
            />
          )}
          {bisaUbah && (
            <Button className="h-11 gap-2" onClick={() => setTambah(true)}>
              <Plus className="size-4" />
              Tambah Master Data
            </Button>
          )}
        </div>
      </div>

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
          depotOptions={depotOptions}
          adaFilter={adaFilter}
          bisaUbah={bisaUbah}
          urut={urut}
          onPageChange={setPage}
          onUrutChange={setUrut}
          onChanged={() => queryClient.invalidateQueries({ queryKey: ['order-list'] })}
        />
      )}

      <MasterCustomerDialog
        open={tambah}
        depotOptions={depotOptions}
        onOpenChange={setTambah}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['order-list'] })}
      />
    </div>
  );
}
