import { NextResponse, type NextRequest } from 'next/server';
import { riwayatKupon, scopeKupon } from '@/lib/kupon/service';
import { izinKupon, kuponErrorResponse } from '../_auth';

export async function GET(request: NextRequest) {
  const customerId = request.nextUrl.searchParams.get('customerId') ?? '';
  try {
    const scope = await scopeKupon(customerId);
    const user = await izinKupon(scope.dealerNightId, false, scope.depotCode);
    if (user instanceof NextResponse) return user;
    return NextResponse.json({ history: await riwayatKupon(customerId) });
  } catch (error) {
    return kuponErrorResponse(error);
  }
}
