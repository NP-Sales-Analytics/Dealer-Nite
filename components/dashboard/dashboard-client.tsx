'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { CapacityPieChart } from './capacity-pie-chart';
import { DepotBarChart } from './depot-bar-chart';
import { FilterBar, FILTER_KOSONG, paramFilter, type FilterState } from './filter-bar';
import { KpiCards } from './kpi-cards';
import { DealerNightSelect } from '@/components/target/dealer-night-select';
import type { DealerNightOption } from '@/components/target/types';
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

const buildQuery = (f: FilterState, dealerNightId: string) => {
  const params = paramFilter(f);
  params.set('dealerNightId', dealerNightId);
  const s = params.toString();
  return s ? `?${s}` : '';
};

// Polling 10 detik membuat layar ikut segar. keepPreviousData
// menahan angka lama saat
// filter berubah, jadi kartu tidak berkedip kosong sambil menunggu data baru.
const POLL = {
  refetchInterval: () => document.visibilityState === 'visible' ? 10_000 : false,
  placeholderData: keepPreviousData,
} as const;

export function DashboardClient({ dealerNights, initialDealerNightId, fixedDealerNight }: {
  dealerNights: DealerNightOption[];
  initialDealerNightId: string;
  fixedDealerNight: boolean;
}) {
  const [filter, setFilter] = useState<FilterState>(FILTER_KOSONG);
  const [dealerNightId, setDealerNightId] = useState(initialDealerNightId);
  const qs = buildQuery(filter, dealerNightId);

  const options = useQuery({
    queryKey: ['filters', dealerNightId],
    queryFn: fetcher<FilterOptions>(`/api/dashboard/filters?dealerNightId=${encodeURIComponent(dealerNightId)}`),
    enabled: !!dealerNightId,
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
        Gagal memuat data dashboard. Halaman mencoba lagi otomatis setiap 10 detik.
      </p>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <DealerNightSelect options={dealerNights} value={dealerNightId} onChange={setDealerNightId} fixed={fixedDealerNight} />
      </div>
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
