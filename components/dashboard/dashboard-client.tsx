'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { CapacityPieChart } from './capacity-pie-chart';
import { DepotBarChart } from './depot-bar-chart';
import { FilterBar, FILTER_KOSONG, paramFilter, type FilterState } from './filter-bar';
import { KpiCards } from './kpi-cards';
import type { FilterOptions } from '@/app/api/dashboard/filters/route';
import { Skeleton } from '@/components/ui/skeleton';
import type { DepotRow } from '@/lib/dashboard/compute';
import type { Summary } from '@/lib/dashboard/types';

export type { DepotRow };

const fetcher = <T,>(url: string) => async (): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url);
  return res.json();
};

const buildQuery = (f: FilterState) => {
  const s = paramFilter(f).toString();
  return s ? `?${s}` : '';
};

// Endpoint di-cache 15 detik di server; polling 15 detik membuat layar ikut
// segar tanpa menambah beban DB. keepPreviousData menahan angka lama saat
// filter berubah, jadi kartu tidak berkedip kosong sambil menunggu data baru.
const POLL = { refetchInterval: 15_000, placeholderData: keepPreviousData } as const;

export function DashboardClient() {
  const [filter, setFilter] = useState<FilterState>(FILTER_KOSONG);
  const qs = buildQuery(filter);

  const options = useQuery({
    queryKey: ['filters'],
    queryFn: fetcher<FilterOptions>('/api/dashboard/filters'),
    staleTime: 5 * 60_000,
  });
  const summary = useQuery({
    queryKey: ['dash', 'summary', qs],
    queryFn: fetcher<Summary>(`/api/dashboard/summary${qs}`),
    ...POLL,
  });
  const depot = useQuery({
    queryKey: ['dash', 'depot', qs],
    queryFn: fetcher<{ rows: DepotRow[] }>(`/api/dashboard/by-depot${qs}`),
    ...POLL,
  });

  const depotRows = useMemo(() => depot.data?.rows ?? [], [depot.data]);

  if (summary.isError) {
    return (
      <p className="rounded-2xl border border-destructive/50 bg-card p-4 text-sm text-destructive">
        Gagal memuat data dashboard. Halaman mencoba lagi otomatis setiap 15 detik.
      </p>
    );
  }

  return (
    <>
      <FilterBar value={filter} options={options.data} onChange={setFilter} />

      {!summary.data ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <div className="space-y-4 sm:space-y-6">
          <KpiCards summary={summary.data} />

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <DepotBarChart rows={depotRows} />
            </div>
            <CapacityPieChart summary={summary.data} />
          </div>

        </div>
      )}
    </>
  );
}
