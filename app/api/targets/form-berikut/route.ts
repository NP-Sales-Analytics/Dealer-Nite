import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { requireTargetAdjustment } from '@/lib/target/access';
import { noFormulirBerikut } from '@/lib/target/service';
import { targetErrorResponse } from '../_response';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  try {
    const dealerNightId = request.nextUrl.searchParams.get('dealerNightId') ?? '';
    requireTargetAdjustment(user, dealerNightId);
    return NextResponse.json({ nomor: await noFormulirBerikut(dealerNightId) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return targetErrorResponse(error);
  }
}
