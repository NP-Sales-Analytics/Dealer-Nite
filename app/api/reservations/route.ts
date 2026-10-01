import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { requireHalamanApi } from '@/lib/auth';
import { bersihkanCacheDashboard } from '@/lib/dashboard/cache';
import { resolveDashboardDealerNight } from '@/lib/dashboard/scope';
import { db } from '@/lib/db';
import { customers, reservations } from '@/lib/db/schema';
import { rateLimit } from '@/lib/rate-limit';
import { isDupUndian, pemegangUndian, undianDipakaiBody } from '@/lib/reservation/undian';
import { depotSatuDn } from '@/lib/target/dealer-night-options';
import { reservationInputSchema } from '@/lib/validations/reservation';

export async function POST(request: NextRequest) {
  const user = await requireHalamanApi('/reservation');
  if (user instanceof NextResponse) return user;
  const { ok } = await rateLimit(`submit:${user.id}`);
  if (!ok) return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });

  let dealerNightId: string;
  try {
    dealerNightId = resolveDashboardDealerNight(user, request.nextUrl.searchParams.get('dealerNightId'));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Tidak punya akses' }, { status: 403 });
  }
  const parsed = reservationInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ code: 'INVALID', issues: parsed.error.issues }, { status: 400 });
  const input = parsed.data;

  if (input.isManualEntry) {
    if (!(await depotSatuDn(dealerNightId)).some((item) => item.depot === input.manualDepot)) {
      return NextResponse.json({ error: 'Depot tidak termasuk Dealer Night ini.' }, { status: 400 });
    }
    const pemegang = await pemegangUndian(dealerNightId, input.nomorUndian);
    if (pemegang) return NextResponse.json(undianDipakaiBody(input.nomorUndian, pemegang), { status: 409 });
    try {
      await db.insert(reservations).values({
        id: randomUUID(),
        dealerNightId,
        isManualEntry: true,
        manualNamaCustomer: input.manualNamaCustomer,
        manualDepot: input.manualDepot,
        qtyHadir: input.qtyHadir,
        nomorUndian: input.nomorUndian,
        checkedInBy: user.id,
      });
    } catch (error) {
      if (isDupUndian(error)) return NextResponse.json(undianDipakaiBody(input.nomorUndian, 'toko lain'), { status: 409 });
      throw error;
    }
    bersihkanCacheDashboard();
    return NextResponse.json({ status: 'created' }, { status: 201 });
  }

  const [customer] = await db.select({
    id: customers.id, namaToko: customers.mgName, dealerNightId: customers.dealerNightId,
  }).from(customers).where(eq(customers.id, input.customerId)).limit(1);
  if (!customer) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
  if (customer.dealerNightId !== dealerNightId) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });

  const [existing] = await db.select({
    id: reservations.id, qtyHadir: reservations.qtyHadir, checkedInAt: reservations.checkedInAt,
  }).from(reservations).where(eq(reservations.customerId, input.customerId)).limit(1);

  if (existing && !input.confirmOverwrite) {
    return NextResponse.json({
      code: 'ALREADY_CHECKED_IN', namaToko: customer.namaToko,
      existing: { qtyHadir: existing.qtyHadir, checkedInAt: existing.checkedInAt },
    }, { status: 409 });
  }

  const pemegang = await pemegangUndian(dealerNightId, input.nomorUndian, existing?.id);
  if (pemegang) return NextResponse.json(undianDipakaiBody(input.nomorUndian, pemegang), { status: 409 });

  try {
    if (existing) {
      await db.update(reservations).set({
        qtyHadir: input.qtyHadir, nomorUndian: input.nomorUndian, checkedInBy: user.id, checkedInAt: new Date(),
      }).where(eq(reservations.id, existing.id));
    } else {
      await db.insert(reservations).values({
        id: randomUUID(), dealerNightId, customerId: input.customerId,
        isManualEntry: false, qtyHadir: input.qtyHadir, nomorUndian: input.nomorUndian, checkedInBy: user.id,
      });
    }
  } catch (error) {
    if (isDupUndian(error)) return NextResponse.json(undianDipakaiBody(input.nomorUndian, 'toko lain'), { status: 409 });
    const code = (error as { cause?: { code?: string } }).cause?.code;
    if (code === 'ER_DUP_ENTRY') return NextResponse.json({ code: 'ALREADY_CHECKED_IN' }, { status: 409 });
    throw error;
  }

  bersihkanCacheDashboard();
  return NextResponse.json({ status: existing ? 'updated' : 'created' }, { status: existing ? 200 : 201 });
}
