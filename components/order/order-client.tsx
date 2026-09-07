'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { OrderPanel } from './order-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { selangPolling, useRealtimeRefresh } from '@/lib/order/use-realtime-refresh';

type Me = {
  namaToko: string;
  kodeSap: string;
  depot: string | null;
  wilayah: string | null;
  region: string | null;
  total: number;
  rank: number | null;
  dusAwal: number | null;
  tenggat: string | null;
};

const ME_KEY = ['order', 'me'] as const;

export function OrderClient() {
  const qc = useQueryClient();

  // Dipanggil lebih dulu supaya status koneksinya bisa menentukan laju polling.
  const { tersambung } = useRealtimeRefresh(() =>
    qc.invalidateQueries({ queryKey: ME_KEY }),
  );

  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: async (): Promise<Me> => {
      const r = await fetch('/api/order/me');
      if (!r.ok) throw new Error('me');
      return r.json();
    },
    // Realtime yang jadi jalur cepat; polling murni cadangan - lambat saat
    // koneksi sehat, dipercepat hanya kalau realtime benar-benar putus.
    refetchInterval: selangPolling(tersambung),
  });

  if (!me.data) return <Skeleton className="mx-auto h-80 w-full max-w-2xl rounded-2xl" />;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <OrderPanel
        key={`${me.data.kodeSap}-${me.data.total}`}
        target={me.data}
        total={me.data.total}
        rank={me.data.rank}
        dusAwal={me.data.dusAwal}
        tenggat={me.data.tenggat}
        onBatal={() => {}}
        labelBatal="Reset"
      />
    </div>
  );
}
