'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { logoutCustomer } from '@/app/order/login/actions';
import { Button } from '@/components/ui/button';
import { useRealtimeRefresh } from '@/lib/order/use-realtime-refresh';

type Me = { namaToko: string; depot: string | null; kodeSap: string; total: number };
const ME_KEY = ['order', 'me'] as const;

export function OrderClient() {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: async (): Promise<Me> => {
      const r = await fetch('/api/order/me');
      if (!r.ok) throw new Error('me');
      return r.json();
    },
    refetchInterval: 10_000,
  });

  useRealtimeRefresh(() => qc.invalidateQueries({ queryKey: ME_KEY }));

  const adjust = useMutation({
    mutationFn: async (qtyChange: number) => {
      const r = await fetch('/api/order/adjust', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ qtyChange }),
      });
      const data = await r.json();
      if (!r.ok) throw Object.assign(new Error(data.code ?? 'error'), { data });
      return data as { total: number };
    },
    onMutate: async (qtyChange) => {
      await qc.cancelQueries({ queryKey: ME_KEY });
      const prev = qc.getQueryData<Me>(ME_KEY);
      if (prev) qc.setQueryData<Me>(ME_KEY, { ...prev, total: Math.max(0, prev.total + qtyChange) });
      return { prev };
    },
    onError: (err: unknown, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ME_KEY, ctx.prev);
      const code = (err as { data?: { code?: string } })?.data?.code;
      toast.error(code === 'NEGATIVE' ? 'Total tidak boleh kurang dari 0.' : 'Gagal menyimpan. Coba lagi.');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ME_KEY }),
  });

  const total = me.data?.total ?? 0;
  const busy = adjust.isPending;

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 p-4">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold">{me.data?.namaToko ?? '...'}</h1>
          <p className="text-sm text-muted-foreground">
            {me.data?.depot ?? ''} · {me.data?.kodeSap ?? ''}
          </p>
        </div>
        <form action={logoutCustomer}>
          <Button variant="ghost" size="sm" type="submit">Keluar</Button>
        </form>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6 text-center shadow-xs">
        <p className="text-sm text-muted-foreground">Total dus tercatat</p>
        <p className="my-2 text-6xl font-bold tabular-nums">{total}</p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <Button
            size="lg"
            variant="outline"
            className="size-16 rounded-full"
            disabled={busy || total <= 0}
            onClick={() => adjust.mutate(-1)}
            aria-label="Kurangi satu dus"
          >
            <Minus className="size-7" />
          </Button>
          <Button
            size="lg"
            className="size-16 rounded-full"
            disabled={busy}
            onClick={() => adjust.mutate(1)}
            aria-label="Tambah satu dus"
          >
            <Plus className="size-7" />
          </Button>
        </div>
      </section>

      <a href="/leaderboard" className="text-center text-sm text-primary underline">
        Lihat papan Top Spender
      </a>
    </main>
  );
}
