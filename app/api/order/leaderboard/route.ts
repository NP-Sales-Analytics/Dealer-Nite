import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCustomerId } from '@/lib/order-session';
import { posisiSaya, TOP_N, type LeaderRow } from '@/lib/order/leaderboard';

export async function GET() {
  const top = (await db.execute(sql`
    with totals as (
      select customer_id, sum(qty_change)::int as total
      from public.order_adjustments
      group by customer_id
      having sum(qty_change) > 0
    )
    select t.customer_id as "customerId", t.total,
           rank() over (order by t.total desc)::int as rank,
           c.nama_toko as "namaToko", c.depot
    from totals t
    join public.customers c on c.id = t.customer_id
    order by rank asc, c.nama_toko asc
    limit ${TOP_N}
  `)) as unknown as LeaderRow[];

  const customerId = await getCustomerId();
  let me = null;
  if (customerId) {
    const rows = (await db.execute(sql`
      with mine as (
        select coalesce(sum(qty_change), 0)::int as total
        from public.order_adjustments where customer_id = ${customerId}
      )
      select c.id as "customerId", c.nama_toko as "namaToko", c.depot, m.total,
             (select count(*) from (
                select customer_id, sum(qty_change)::int as total
                from public.order_adjustments group by customer_id
                having sum(qty_change) > (select total from mine)
              ) s)::int as "jumlahDiAtas"
      from public.customers c, mine m
      where c.id = ${customerId}
    `)) as unknown as {
      customerId: string;
      namaToko: string;
      depot: string | null;
      total: number;
      jumlahDiAtas: number;
    }[];
    const row = rows[0];
    if (row) me = { ...row, rank: posisiSaya(row.total, row.jumlahDiAtas) };
  }

  return NextResponse.json({ top, me });
}
