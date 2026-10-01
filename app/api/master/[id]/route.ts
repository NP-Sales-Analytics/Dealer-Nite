import { NextResponse, type NextRequest } from 'next/server';
import { bersihkanCacheDashboard } from '@/lib/dashboard/cache';
import { deleteMaster, getMaster, masterInputSchema, updateMaster } from '@/lib/target/master';
import { izinMaster, masterErrorResponse } from '../_auth';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const parsed = masterInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const existing = await getMaster(id);
  if (!existing) return NextResponse.json({ error: 'Toko tidak ditemukan.' }, { status: 404 });
  const user = await izinMaster(existing.dealerNightId, [existing.depotCode, parsed.data.depotCode]);
  if (user instanceof NextResponse) return user;
  try {
    await updateMaster(id, parsed.data);
    bersihkanCacheDashboard();
    return NextResponse.json({ status: 'updated' });
  } catch (error) {
    return masterErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  const existing = await getMaster(id);
  if (!existing) return NextResponse.json({ error: 'Toko tidak ditemukan.' }, { status: 404 });
  const user = await izinMaster(existing.dealerNightId, [existing.depotCode]);
  if (user instanceof NextResponse) return user;
  await deleteMaster(id);
  bersihkanCacheDashboard();
  return NextResponse.json({ status: 'deleted' });
}
