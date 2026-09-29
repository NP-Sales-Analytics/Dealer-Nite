import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { resolveDashboardDealerNight } from '@/lib/dashboard/scope';
import { dashboardFilterOptions } from '@/lib/dashboard/service';
import { targetErrorResponse } from '@/app/api/targets/_response';

export type FilterOptions = {
  wilayahs: string[];
  regions: { region: string; wilayah: string | null }[];
  depots: { depot: string; region: string | null; wilayah: string | null }[];
};

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  try {
    const dealerNightId = resolveDashboardDealerNight(user, request.nextUrl.searchParams.get('dealerNightId'));
    return NextResponse.json(await dashboardFilterOptions(dealerNightId));
  } catch (error) {
    return targetErrorResponse(error);
  }
}
