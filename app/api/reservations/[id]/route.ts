import { eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { bersihkanCacheDashboard } from '@/lib/dashboard/cache';
import { db } from '@/lib/db';
import { reservations } from '@/lib/db/schema';
import { reservationPatchSchema } from '@/lib/validations/reservation';

type Context = { params: Promise<{ id: string }> };

async function authorize(id: string) {
  const user = await requireRoleApi(['superadmin', 'admin']);
  if (user instanceof NextResponse) return user;
  const [reservation] = await db.select({ id: reservations.id }).from(reservations)
    .where(eq(reservations.id, id)).limit(1);
  if (!reservation) return NextResponse.json({ error: 'Catatan tidak ditemukan.' }, { status: 404 });
  return user;
}

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const authorization = await authorize(id);
  if (authorization instanceof NextResponse) return authorization;
  const parsed = reservationPatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 });
  await db.update(reservations).set(parsed.data).where(eq(reservations.id, id));
  bersihkanCacheDashboard();
  return NextResponse.json({ status: 'updated' });
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  const authorization = await authorize(id);
  if (authorization instanceof NextResponse) return authorization;
  await db.delete(reservations).where(eq(reservations.id, id));
  bersihkanCacheDashboard();
  return NextResponse.json({ status: 'deleted' });
}
