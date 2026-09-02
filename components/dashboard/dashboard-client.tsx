'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { CapacityPieChart } from './capacity-pie-chart';
import { DepotBarChart } from './depot-bar-chart';
import { KpiCards } from './kpi-cards';
import { RecentCheckinList } from './recent-checkin-list';
import { Skeleton } from '@/components/ui/skeleton';
import type { DepotRow } from '@/lib/dashboard/compute';

export type { DepotRow };
export type Summary = {
  totalUndangan: number;
  totalHadir: number;
  totalToko: number;
  tokoCheckin: number;
  manualEntry: number;
  persentase: number;
};
export type RecentRow = {
  id: string;
  nama: string;
  depot: string;
  kodeSap: string | null;
  qtyHadir: number;
  qtyUndangan: number | null;
  checkedInAt: string;
  isManualEntry: boolean;
  depotDiubah: boolean;
};
type RecentResponse = {
  rows: RecentRow[];
  page: number;
  totalPages: number;
  total: number;
};

const fetcher = <T,>(url: string) => async (): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url);
  return res.json();
};

// Endpoint summary & by-depot di-cache 15 detik di server; polling 15 detik
// membuat layar ikut segar tanpa menambah beban DB.
const POLL = { refetchInterval: 15_000 } as const;

export function DashboardClient() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const summary = useQuery({
    queryKey: ['dash', 'summary'],
    queryFn: fetcher<Summary>('/api/dashboard/summary'),
    ...POLL,
  });
  const depot = useQuery({
    queryKey: ['dash', 'depot'],
    queryFn: fetcher<{ rows: DepotRow[] }>('/api/dashboard/by-depot'),
    ...POLL,
  });
  const recent = useQuery({
    queryKey: ['dash', 'recent', page],
    queryFn: fetcher<RecentResponse>(`/api/dashboard/recent?page=${page}`),
    ...POLL,
  });

  const depotRows = useMemo(() => depot.data?.rows ?? [], [depot.data]);

  // Daftar depot untuk autocomplete di dialog edit diambil dari data yang sudah
  // dimuat, jadi tidak perlu query tambahan.
  const namaDepot = useMemo(
    () => depotRows.map((r) => r.depot).filter((d) => d && d !== '(Tanpa Depot)').sort(),
    [depotRows],
  );

  // Setelah edit/hapus, ketiga angka bisa berubah sekaligus.
  const refreshSemua = () => {
    queryClient.invalidateQueries({ queryKey: ['dash'] });
  };

  if (summary.isError) {
    return (
      <p className="rounded-2xl border border-destructive/50 bg-card p-4 text-sm text-destructive">
        Gagal memuat data dashboard. Halaman mencoba lagi otomatis setiap 15 detik.
      </p>
    );
  }
  if (!summary.data) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <KpiCards summary={summary.data} />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <DepotBarChart rows={depotRows} />
        </div>
        <CapacityPieChart summary={summary.data} />
      </div>

      <RecentCheckinList
        rows={recent.data?.rows ?? []}
        page={recent.data?.page ?? page}
        totalPages={recent.data?.totalPages ?? 1}
        total={recent.data?.total ?? 0}
        depots={namaDepot}
        onPageChange={setPage}
        onChanged={refreshSemua}
      />
    </div>
  );
}
