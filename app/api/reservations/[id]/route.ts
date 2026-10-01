import { eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { canReadDealerNight } from '@/lib/access';
import { requireHalamanApi } from '@/lib/auth';
import { bersihkanCacheDashboard } from '@/lib/dashboard/cache';
import { db } from '@/lib/db';
import { reservations } from '@/lib/db/schema';
import { isDupUndian, pemegangUndian, undianDipakaiBody } from '@/lib/reservation/undian';
import { depotSatuDn } from '@/lib/target/dealer-night-options';
import { reservationPatchSchema } from '@/lib/validations/reservation';

type Context = { params: Promise<{ id: string }> };

async function authorize(id: string) {
  const user = await requireHalamanApi('/reservation');
  if (user instanceof NextResponse) return user;
  const [reservation] = await db.select({
    id: reservations.id, dealerNightId: reservations.dealerNightId, isManualEntry: reservations.isManualEntry,
  }).from(reservations).where(eq(reservations.id, id)).limit(1);
  if (!reservation) return NextResponse.json({ error: 'Catatan tidak ditemukan.' }, { status: 404 });
  if (!canReadDealerNight(user, reservation.dealerNightId)) {
    return NextResponse.json({ error: 'Tidak punya akses ke Dealer Night ini.' }, { status: 403 });
  }
  return reservation;
}

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const reservation = await authorize(id);
  if (reservation instanceof NextResponse) return reservation;
  const parsed = reservationPatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 });
  const { qtyHadir, nomorUndian, manualDepot } = parsed.data;
  if (manualDepot && !reservation.isManualEntry) {
    return NextResponse.json({ error: 'Depot customer terdaftar mengikuti master customer.' }, { status: 400 });
  }
  if (manualDepot && !(await depotSatuDn(reservation.dealerNightId)).some((item) => item.depot === manualDepot)) {
    return NextResponse.json({ error: 'Depot tidak termasuk Dealer Night ini.' }, { status: 400 });
  }

  const pemegang = await pemegangUndian(reservation.dealerNightId, nomorUndian, id);
  if (pemegang) return NextResponse.json(undianDipakaiBody(nomorUndian, pemegang), { status: 409 });

  try {
    await db.update(reservations)
      .set({ qtyHadir, nomorUndian, ...(manualDepot ? { manualDepot } : {}) })
      .where(eq(reservations.id, id));
  } catch (error) {
    if (isDupUndian(error)) return NextResponse.json(undianDipakaiBody(nomorUndian, 'toko lain'), { status: 409 });
    throw error;
  }
  bersihkanCacheDashboard();
  return NextResponse.json({ status: 'updated' });
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  const reservation = await authorize(id);
  if (reservation instanceof NextResponse) return reservation;
  await db.delete(reservations).where(eq(reservations.id, id));
  bersihkanCacheDashboard();
  return NextResponse.json({ status: 'deleted' });
}
