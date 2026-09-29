import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { readFilter } from '@/lib/dashboard/filters';
import { resolveDashboardDealerNight } from '@/lib/dashboard/scope';
import { dashboardSummary } from '@/lib/dashboard/service';
import { targetErrorResponse } from '@/app/api/targets/_response';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  try {
    const dealerNightId = resolveDashboardDealerNight(user, request.nextUrl.searchParams.get('dealerNightId'));
    return NextResponse.json(await dashboardSummary(dealerNightId, readFilter(request)));
  } catch (error) {
    return targetErrorResponse(error);
  }
}
