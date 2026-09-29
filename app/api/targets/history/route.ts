import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { requireTargetRead } from '@/lib/target/access';
import { getCustomerDealerNightId, getTargetHistory, getTargetSnapshot } from '@/lib/target/service';
import { targetErrorResponse } from '../_response';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  try {
    const customerId = request.nextUrl.searchParams.get('customerId');
    if (!customerId) return NextResponse.json({ error: 'customerId wajib diisi.' }, { status: 400 });
    const dealerNightId = await getCustomerDealerNightId(customerId);
    if (!dealerNightId) return NextResponse.json({ error: 'Toko tidak ditemukan.' }, { status: 404 });
    requireTargetRead(user, dealerNightId);
    const [snapshot, history] = await Promise.all([getTargetSnapshot(customerId), getTargetHistory(customerId)]);
    return NextResponse.json({ snapshot, history });
  } catch (error) {
    return targetErrorResponse(error);
  }
}
