import { NextResponse, type NextRequest } from 'next/server';
import { listKupon } from '@/lib/kupon/service';
import { izinKupon, kuponErrorResponse } from '../_auth';

export async function GET(request: NextRequest) {
  const dealerNightId = request.nextUrl.searchParams.get('dealerNightId') ?? '';
  const user = await izinKupon(dealerNightId);
  if (user instanceof NextResponse) return user;
  try {
    return NextResponse.json({ rows: await listKupon(dealerNightId) });
  } catch (error) {
    return kuponErrorResponse(error);
  }
}
