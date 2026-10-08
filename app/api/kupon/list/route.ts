import { NextResponse, type NextRequest } from 'next/server';
import { bolehDepot } from '@/lib/access';
import { konfigKupon, listKupon } from '@/lib/kupon/service';
import { izinKupon, kuponErrorResponse } from '../_auth';

export async function GET(request: NextRequest) {
  const dealerNightId = request.nextUrl.searchParams.get('dealerNightId') ?? '';
  const user = await izinKupon(dealerNightId);
  if (user instanceof NextResponse) return user;
  try {
    const [rows, kupon] = await Promise.all([listKupon(dealerNightId), konfigKupon(dealerNightId)]);
    return NextResponse.json({ rows: rows.filter((row) => bolehDepot(user, row.depotCode)), kupon });
  } catch (error) {
    return kuponErrorResponse(error);
  }
}
