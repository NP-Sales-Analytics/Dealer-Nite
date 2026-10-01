import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { namaDepotDiizinkan } from '@/lib/depot-scope';
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
    const opsi = await dashboardFilterOptions(dealerNightId);
    const izin = namaDepotDiizinkan(user);
    if (!izin) return NextResponse.json(opsi);
    const depots = opsi.depots.filter((row) => izin.has(row.depot));
    const regions = new Set(depots.map((row) => row.region));
    return NextResponse.json({
      wilayahs: [...new Set(depots.map((row) => row.wilayah).filter((v): v is string => !!v))],
      regions: opsi.regions.filter((row) => regions.has(row.region)),
      depots,
    });
  } catch (error) {
    return targetErrorResponse(error);
  }
}
