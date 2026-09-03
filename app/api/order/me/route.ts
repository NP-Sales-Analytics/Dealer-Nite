import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customers, orderAdjustments } from '@/lib/db/schema';
import { getCustomerId } from '@/lib/order-session';

export async function GET() {
  const customerId = await getCustomerId();
  if (!customerId) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  const [row] = await db
    .select({
      namaToko: customers.namaToko,
      depot: customers.depot,
      kodeSap: customers.kodeSap,
      total: sql<number>`coalesce((
        select sum(qty_change) from ${orderAdjustments} where customer_id = ${customers.id}
      ), 0)::int`,
    })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!row) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  return NextResponse.json(row);
}
