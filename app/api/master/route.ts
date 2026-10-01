import { NextResponse, type NextRequest } from 'next/server';
import { bersihkanCacheDashboard } from '@/lib/dashboard/cache';
import { createMaster, masterInputSchema } from '@/lib/target/master';
import { izinMaster, masterErrorResponse } from './_auth';

export async function POST(request: NextRequest) {
  const parsed = masterInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  const user = await izinMaster(parsed.data.dealerNightId);
  if (user instanceof NextResponse) return user;
  try {
    await createMaster(parsed.data);
    bersihkanCacheDashboard();
    return NextResponse.json({ status: 'created' }, { status: 201 });
  } catch (error) {
    return masterErrorResponse(error);
  }
}
