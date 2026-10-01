import { NextResponse, type NextRequest } from 'next/server';
import { bolehDepot } from '@/lib/access';
import { catatKuponMassal, catatMassalSchema } from '@/lib/kupon/service';
import { izinKupon, kuponErrorResponse } from '../_auth';

export async function POST(request: NextRequest) {
  const parsed = catatMassalSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 });
  const user = await izinKupon(parsed.data.dealerNightId, true);
  if (user instanceof NextResponse) return user;
  try {
    return NextResponse.json(await catatKuponMassal({
      ...parsed.data, actorId: user.id, bolehDepot: (kode) => bolehDepot(user, kode),
    }));
  } catch (error) {
    return kuponErrorResponse(error);
  }
}
