import { eq, sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers, reservations } from '@/lib/db/schema';
import { rateLimit } from '@/lib/rate-limit';
import { reservationInputSchema } from '@/lib/validations/reservation';

export async function POST(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  const { ok } = await rateLimit(`submit:${user.id}`);
  if (!ok) return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });

  const parsed = reservationInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ code: 'INVALID', issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;

  if (input.isManualEntry) {
    await db.insert(reservations).values({
      isManualEntry: true,
      manualNamaCustomer: input.manualNamaCustomer,
      manualDepot: input.manualDepot,
      qtyHadir: input.qtyHadir,
      checkedInBy: user.id,
    });
    return NextResponse.json({ status: 'created' }, { status: 201 });
  }

  const [customer] = await db
    .select({ id: customers.id, namaToko: customers.namaToko, qtyUndangan: customers.qtyUndangan })
    .from(customers)
    .where(eq(customers.id, input.customerId))
    .limit(1);
  if (!customer) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });

  const [existing] = await db
    .select({ qtyHadir: reservations.qtyHadir, checkedInAt: reservations.checkedInAt })
    .from(reservations)
    .where(eq(reservations.customerId, input.customerId))
    .limit(1);

  if (existing && !input.confirmOverwrite) {
    return NextResponse.json(
      {
        code: 'ALREADY_CHECKED_IN',
        namaToko: customer.namaToko,
        existing: { qtyHadir: existing.qtyHadir, checkedInAt: existing.checkedInAt },
      },
      { status: 409 },
    );
  }

  if (input.qtyHadir > customer.qtyUndangan && !input.confirmOverQuota) {
    return NextResponse.json(
      {
        code: 'OVER_QUOTA',
        namaToko: customer.namaToko,
        qtyUndangan: customer.qtyUndangan,
        qtyHadir: input.qtyHadir,
      },
      { status: 409 },
    );
  }

  // Partial unique index di customer_id membuat ini idempotent: dua admin yang
  // mencatat toko sama tidak akan menghasilkan dua baris.
  await db
    .insert(reservations)
    .values({
      customerId: input.customerId,
      isManualEntry: false,
      qtyHadir: input.qtyHadir,
      checkedInBy: user.id,
    })
    .onConflictDoUpdate({
      target: reservations.customerId,
      targetWhere: sql`customer_id is not null`,
      set: { qtyHadir: input.qtyHadir, checkedInBy: user.id, checkedInAt: sql`now()` },
    });

  return NextResponse.json({ status: existing ? 'updated' : 'created' }, { status: existing ? 200 : 201 });
}
