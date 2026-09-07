'use client';

import { useQuery } from '@tanstack/react-query';
import type { RiwayatRow } from '@/app/api/order/history/route';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, jamJakarta, tanggalJakarta } from '@/lib/utils';

/**
 * Riwayat penyesuaian order sebuah toko, dipakai bersama dialog Detail Order
 * dan panel Tambah Order.
 *
 * customerId hanya diisi jalur staff. Sesi customer memanggil tanpa parameter
 * dan server menurunkan idnya dari sesi, jadi toko tidak bisa mengintip riwayat
 * toko lain sekalipun idnya diketahui.
 */
export function RiwayatOrder({ customerId }: { customerId?: string }) {
  const q = useQuery({
    queryKey: ['order-history', customerId ?? 'saya'],
    queryFn: async (): Promise<{ rows: RiwayatRow[] }> => {
      const r = await fetch(
        customerId ? `/api/order/history?customerId=${customerId}` : '/api/order/history',
      );
      if (!r.ok) throw new Error('history');
      return r.json();
    },
  });

  if (!q.data) return <Skeleton className="h-24 w-full rounded-xl" />;
  const { rows } = q.data;

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-secondary/30 px-4 py-6 text-center text-sm text-muted-foreground">
        Belum ada penyesuaian. Toko ini belum mengambil dus.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-secondary/30">
      {rows.map((r, i) => (
        <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
            {i + 1}
          </span>
          <span
            className={cn(
              'w-14 shrink-0 text-sm font-bold tabular-nums',
              r.qtyChange > 0 ? 'text-emerald-700' : 'text-red-700',
            )}
          >
            {r.qtyChange > 0 ? '+' : ''}
            {r.qtyChange}
          </span>
          <span className="min-w-0 flex-1">
            {/* Waktu ditebalkan: inilah yang ditelusuri orang saat memeriksa
                urutan penambahan, dan sejak papan memakai waktu sebagai pemecah
                seri, ia ikut menentukan peringkat. */}
            <span className="block text-xs font-semibold leading-tight text-foreground">
              {tanggalJakarta(r.createdAt)}, {jamJakarta(r.createdAt)}
            </span>
            <span className="block text-[11px] leading-tight text-muted-foreground">
              {/* recorded_by kosong = toko mencatat sendiri lewat Tambah Order. */}
              {r.pencatat ? `dicatat oleh ${r.pencatat}` : 'input mandiri oleh toko'}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
