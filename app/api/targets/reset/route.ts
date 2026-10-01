import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { bersihkanCacheDashboard } from '@/lib/dashboard/cache';
import { requireTargetAdjustment } from '@/lib/target/access';
import { getCustomerScope, resetVerifikasi } from '@/lib/target/service';
import { targetErrorResponse } from '../_response';

const schema = z.object({ customerId: z.string().uuid() }).strict();

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 });
  try {
    const scope = await getCustomerScope(parsed.data.customerId);
    if (!scope) return NextResponse.json({ error: 'Toko tidak ditemukan.' }, { status: 404 });
    requireTargetAdjustment(user, scope.dealerNightId, scope.depotCode);
    await resetVerifikasi(parsed.data.customerId);
    bersihkanCacheDashboard();
    return NextResponse.json({ status: 'reset' });
  } catch (error) {
    return targetErrorResponse(error);
  }
}
