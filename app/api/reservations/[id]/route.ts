import { eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { bersihkanCacheDashboard } from '@/lib/dashboard/cache';
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

  const updated = await db
    .update(reservations)
    .set({ qtyHadir: parsed.data.qtyHadir })
    .where(eq(reservations.id, id))
    .returning({ id: reservations.id });
  if (updated.length === 0) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });

  bersihkanCacheDashboard();
  return NextResponse.json({ status: 'updated' });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const deleted = await db.delete(reservations).where(eq(reservations.id, id)).returning({ id: reservations.id });
  if (deleted.length === 0) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });

  bersihkanCacheDashboard();
  return NextResponse.json({ status: 'deleted' });
}
