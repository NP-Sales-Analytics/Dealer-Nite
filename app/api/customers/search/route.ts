import { and, eq, like, or } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { resolveDashboardDealerNight } from '@/lib/dashboard/scope';
import { db } from '@/lib/db';
import { customers, reservations } from '@/lib/db/schema';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'admin']);
  if (user instanceof NextResponse) return user;
  const { ok } = await rateLimit(`search:${user.id}`);
  if (!ok) return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });

  const query = (request.nextUrl.searchParams.get('q') ?? '').trim();
  if (query.length < 2) return NextResponse.json({ results: [] });

  let dealerNightId: string;
  try {
    dealerNightId = resolveDashboardDealerNight(user, request.nextUrl.searchParams.get('dealerNightId'));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Tidak punya akses' }, { status: 403 });
  }

  const needle = `%${query}%`;
  const rows = await db
    .select({
      id: customers.id,
      namaToko: customers.mgName,
      kodeSap: customers.mgCode,
      depot: customers.depotName,
      wilayah: customers.wilayah,
      region: customers.region,
      qtyUndangan: customers.qtyUndangan,
      reservationId: reservations.id,
      qtyHadirSebelumnya: reservations.qtyHadir,
    })
    .from(customers)
    .leftJoin(reservations, eq(reservations.customerId, customers.id))
    .where(and(
      eq(customers.dealerNightId, dealerNightId),
      or(like(customers.mgName, needle), like(customers.mgCode, needle)),
    ))
    .orderBy(customers.mgName)
    .limit(10);

  return NextResponse.json({ results: rows.map((row) => ({
    ...row,
    namaPemilik: null,
    sudahHadir: !!row.reservationId,
    reservationId: undefined,
  })) });
}
