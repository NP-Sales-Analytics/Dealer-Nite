import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posisiSaya } from '@/lib/order/leaderboard';
import { getCustomerId } from '@/lib/session';

// Identitas + total dus + posisi ranking milik customer yang sedang login.
export async function GET() {
  const customerId = await getCustomerId();
  if (!customerId) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  // Tie-break sama dengan /api/order/leaderboard: seri dimenangkan yang lebih
  // dulu mencapai angkanya.
  const rows = (await db.execute(sql`
    with totals as (
      select customer_id, sum(qty_change)::int as total, max(created_at) as last_at
      from public.order_adjustments
      group by customer_id
      having sum(qty_change) > 0
    ),
    mine as (
      select coalesce(sum(qty_change), 0)::int as total, max(created_at) as last_at
      from public.order_adjustments where customer_id = ${customerId}
    )
    select c.nama_toko as "namaToko", c.kode_sap as "kodeSap", c.depot, c.wilayah, c.region,
           m.total,
           (select count(*) from totals t
             where t.total > m.total
                or (t.total = m.total and t.last_at < m.last_at))::int as "jumlahDiAtas"
    from public.customers c, mine m
    where c.id = ${customerId}
  `)) as unknown as {
    namaToko: string;
    kodeSap: string;
    depot: string | null;
    wilayah: string | null;
    region: string | null;
    total: number;
    jumlahDiAtas: number;
  }[];

  const row = rows[0];
  if (!row) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  // jumlahDiAtas hanya perantara untuk menghitung rank; tidak perlu ikut keluar.
  const { jumlahDiAtas, ...info } = row;
  return NextResponse.json({ ...info, rank: posisiSaya(row.total, jumlahDiAtas) });
}
