'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { OrderPanel } from './order-panel';
import { SearchBar, type CustomerSearchResult } from '@/components/reservation/search-bar';
import { Skeleton } from '@/components/ui/skeleton';

export function StaffOrderClient() {
  const [sel, setSel] = useState<CustomerSearchResult | null>(null);

  const info = useQuery({
    queryKey: ['order', 'total', sel?.id],
    enabled: !!sel,
    queryFn: async (): Promise<{ total: number; rank: number | null }> => {
      const r = await fetch(`/api/order/total?customerId=${sel!.id}`);
      if (!r.ok) throw new Error('total');
      return r.json();
    },
  });

  if (!sel) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <SearchBar onSelect={setSel} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {!info.data ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : (
        // key ikut totalnya: kalau catatan berubah di perangkat lain, panel
        // dipasang ulang dengan angka terbaru alih-alih memakai basis usang.
        <OrderPanel
          key={`${sel.id}-${info.data.total}`}
          target={sel}
          total={info.data.total}
          rank={info.data.rank}
          customerId={sel.id}
          onBatal={() => setSel(null)}
          labelBatal="Ganti toko"
        />
      )}
    </div>
  );
}
