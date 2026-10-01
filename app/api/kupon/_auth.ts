import { NextResponse } from 'next/server';
import { bisaKelolaKupon, canReadDealerNight } from '@/lib/access';
import { requireHalamanApi, type SessionUser } from '@/lib/auth';
import { KuponError } from '@/lib/kupon/service';

/** Halaman Detail Kupon + cakupan DN; `tulis` juga mensyaratkan role pengelola. */
export async function izinKupon(dealerNightId: string, tulis = false): Promise<SessionUser | NextResponse> {
  const user = await requireHalamanApi('/kupon');
  if (user instanceof NextResponse) return user;
  if (!dealerNightId || !canReadDealerNight(user, dealerNightId)) {
    return NextResponse.json({ error: 'Tidak punya akses ke Dealer Night ini.' }, { status: 403 });
  }
  if (tulis && !bisaKelolaKupon(user)) {
    return NextResponse.json({ error: 'Akun ini hanya bisa melihat data kupon.' }, { status: 403 });
  }
  return user;
}

export function kuponErrorResponse(error: unknown) {
  if (error instanceof KuponError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(error);
  return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
}
