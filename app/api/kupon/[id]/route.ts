import { NextResponse, type NextRequest } from 'next/server';
import { batalkanKupon, eventKupon } from '@/lib/kupon/service';
import { izinKupon, kuponErrorResponse } from '../_auth';

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  const event = await eventKupon(id);
  if (!event) return NextResponse.json({ error: 'Catatan kupon tidak ditemukan.' }, { status: 404 });
  const user = await izinKupon(event.dealerNightId, true);
  if (user instanceof NextResponse) return user;
  try {
    await batalkanKupon(id);
    return NextResponse.json({ status: 'deleted' });
  } catch (error) {
    return kuponErrorResponse(error);
  }
}
