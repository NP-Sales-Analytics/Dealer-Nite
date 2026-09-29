import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { readFilter } from '@/lib/dashboard/filters';
import { resolveDashboardDealerNight } from '@/lib/dashboard/scope';
import { attendancePage } from '@/lib/dashboard/service';
import { targetErrorResponse } from '@/app/api/targets/_response';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  try {
    const dealerNightId = resolveDashboardDealerNight(user, request.nextUrl.searchParams.get('dealerNightId'));
    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') ?? 1) || 1);
    const sort = request.nextUrl.searchParams.get('sort') === 'asc' ? 'asc' : 'desc';
    return NextResponse.json(await attendancePage(dealerNightId, readFilter(request), page, sort));
  } catch (error) {
    return targetErrorResponse(error);
  }
}
