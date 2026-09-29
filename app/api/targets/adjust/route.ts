import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { requireTargetAdjustment } from '@/lib/target/access';
import { adjustTarget, getCustomerDealerNightId } from '@/lib/target/service';
import { targetAdjustmentSchema } from '@/lib/validations/target';
import { targetErrorResponse } from '../_response';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  try {
    const parsed = targetAdjustmentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
    }
    const dealerNightId = await getCustomerDealerNightId(parsed.data.customerId);
    if (!dealerNightId) return NextResponse.json({ error: 'Toko tidak ditemukan.' }, { status: 404 });
    requireTargetAdjustment(user, dealerNightId);
    const result = await adjustTarget({ ...parsed.data, actorId: user.id });
    return NextResponse.json(result);
  } catch (error) {
    return targetErrorResponse(error);
  }
}
