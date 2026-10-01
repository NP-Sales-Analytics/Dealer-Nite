import { NextResponse } from 'next/server';
import { canAdjustTarget } from '@/lib/access';
import { requireRoleApi, type SessionUser } from '@/lib/auth';
import { MasterError } from '@/lib/target/master';

/** Kelola master toko: superadmin/admin, hanya untuk DN dalam cakupannya. */
export async function izinMaster(dealerNightId: string): Promise<SessionUser | NextResponse> {
  const user = await requireRoleApi(['superadmin', 'admin']);
  if (user instanceof NextResponse) return user;
  if (!canAdjustTarget(user, dealerNightId)) {
    return NextResponse.json({ error: 'Tidak punya akses ke Dealer Night ini.' }, { status: 403 });
  }
  return user;
}

export function masterErrorResponse(error: unknown) {
  if (error instanceof MasterError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(error);
  return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
}
