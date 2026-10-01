import { NextResponse, type NextRequest } from 'next/server';
import { bolehDepot } from '@/lib/access';
import { getSessionUser } from '@/lib/auth';
import { resolveDealerNightId } from '@/lib/target/access';
import { listTargets } from '@/lib/target/service';
import { targetErrorResponse } from '../_response';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  try {
    const dealerNightId = resolveDealerNightId(user, request.nextUrl.searchParams.get('dealerNightId'));
    return NextResponse.json({ dealerNightId, rows: (await listTargets(dealerNightId)).filter((row) => bolehDepot(user, row.depotCode)) });
  } catch (error) {
    return targetErrorResponse(error);
  }
}
