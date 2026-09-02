import { eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { reservations } from '@/lib/db/schema';
import { rateLimit } from '@/lib/rate-limit';
import { reservationPatchSchema } from '@/lib/validations/reservation';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  const { ok } = await rateLimit(`patch:${user.id}`);
  if (!ok) return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });

  const { id } = await params;
  const parsed = reservationPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ code: 'INVALID', issues: parsed.error.issues }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: reservations.id, isManualEntry: reservations.isManualEntry })
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1);
  if (!existing) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });

  // Nama hanya milik manual entry; toko terdaftar namanya dari master data.
  if (parsed.data.manualNamaCustomer !== undefined && !existing.isManualEntry) {
    return NextResponse.json({ code: 'NAMA_TERKUNCI' }, { status: 400 });
  }

  const patch = parsed.data;
  await db
    .update(reservations)
    .set({
      ...(patch.qtyHadir !== undefined && { qtyHadir: patch.qtyHadir }),
      ...(patch.depotOverride !== undefined && { depotOverride: patch.depotOverride }),
      ...(patch.manualNamaCustomer !== undefined && { manualNamaCustomer: patch.manualNamaCustomer }),
    })
    .where(eq(reservations.id, id));

  return NextResponse.json({ status: 'updated' });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const deleted = await db.delete(reservations).where(eq(reservations.id, id)).returning({ id: reservations.id });
  if (deleted.length === 0) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });

  return NextResponse.json({ status: 'deleted' });
}
