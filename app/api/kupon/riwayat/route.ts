import { NextResponse, type NextRequest } from 'next/server';
import { dealerNightKupon, riwayatKupon } from '@/lib/kupon/service';
import { izinKupon, kuponErrorResponse } from '../_auth';

export async function GET(request: NextRequest) {
  const customerId = request.nextUrl.searchParams.get('customerId') ?? '';
  try {
    const user = await izinKupon(await dealerNightKupon(customerId));
    if (user instanceof NextResponse) return user;
    return NextResponse.json({ history: await riwayatKupon(customerId) });
  } catch (error) {
    return kuponErrorResponse(error);
  }
}
