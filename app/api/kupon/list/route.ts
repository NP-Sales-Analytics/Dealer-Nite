import { NextResponse, type NextRequest } from 'next/server';
import { bolehDepot } from '@/lib/access';
import { listKupon } from '@/lib/kupon/service';
import { izinKupon, kuponErrorResponse } from '../_auth';

export async function GET(request: NextRequest) {
  const dealerNightId = request.nextUrl.searchParams.get('dealerNightId') ?? '';
  const user = await izinKupon(dealerNightId);
  if (user instanceof NextResponse) return user;
  try {
    return NextResponse.json({ rows: (await listKupon(dealerNightId)).filter((row) => bolehDepot(user, row.depotCode)) });
  } catch (error) {
    return kuponErrorResponse(error);
  }
}
