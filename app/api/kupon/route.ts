import { NextResponse, type NextRequest } from 'next/server';
import { catatKupon, catatKuponSchema, dealerNightKupon } from '@/lib/kupon/service';
import { izinKupon, kuponErrorResponse } from './_auth';

export async function POST(request: NextRequest) {
  const parsed = catatKuponSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  try {
    const user = await izinKupon(await dealerNightKupon(parsed.data.customerId), true);
    if (user instanceof NextResponse) return user;
    await catatKupon({ ...parsed.data, actorId: user.id });
    return NextResponse.json({ status: 'ok' }, { status: 201 });
  } catch (error) {
    return kuponErrorResponse(error);
  }
}
