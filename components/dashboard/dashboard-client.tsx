'use client';

import { useQuery } from '@tanstack/react-query';
import { CapacityPieChart } from './capacity-pie-chart';
import { DepotBarChart } from './depot-bar-chart';
import { KpiCards } from './kpi-cards';
import { RecentCheckinList } from './recent-checkin-list';
import { Skeleton } from '@/components/ui/skeleton';
import type { DepotRow } from '@/lib/dashboard/compute';

export type { DepotRow };
export type Summary = {
  totalUndangan: number; totalHadir: number; totalToko: number;
  tokoCheckin: number; manualEntry: number; persentase: number;
};
export type RecentRow = {
  id: string; nama: string; depot: string;
  qtyHadir: number; checkedInAt: string; isManualEntry: boolean;
};

const fetcher = <T,>(url: string) => async (): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url);
  return res.json();
};

// Endpoint sudah di-cache 15 detik di server; polling 15 detik membuat layar
// ikut segar tanpa menambah beban DB.
const POLL = { refetchInterval: 15_000 } as const;

export function DashboardClient() {
  const summary = useQuery({ queryKey: ['dash', 'summary'], queryFn: fetcher<Summary>('/api/dashboard/summary'), ...POLL });
  const depot = useQuery({ queryKey: ['dash', 'depot'], queryFn: fetcher<{ rows: DepotRow[] }>('/api/dashboard/by-depot'), ...POLL });
  const recent = useQuery({ queryKey: ['dash', 'recent'], queryFn: fetcher<{ rows: RecentRow[] }>('/api/dashboard/recent'), ...POLL });

  if (summary.isError) {
    return (
      <p className="rounded-md border border-destructive/50 p-4 text-sm text-destructive">
        Gagal memuat data dashboard. Halaman mencoba lagi otomatis setiap 15 detik.
      </p>
    );
  }
  if (!summary.data) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <KpiCards summary={summary.data} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><DepotBarChart rows={depot.data?.rows ?? []} /></div>
        <CapacityPieChart summary={summary.data} />
      </div>
      <RecentCheckinList rows={recent.data?.rows ?? []} />
    </div>
  );
}
