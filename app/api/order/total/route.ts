import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { infoCustomer, requireRoleApi } from '@/lib/auth';
import { bolehUbahOrder, PESAN_LUAR_REGION } from '@/lib/order/akses';
import { cariPosisi } from '@/lib/order/leaderboard';
import { papan } from '@/lib/order/papan';
import { bacaTenggat } from '@/lib/settings';

// Total dus + posisi ranking + lantai pengambilan pertama sebuah toko, untuk
// panel staff "Tambah Order". Khusus staff: customer melihat miliknya sendiri
// lewat /api/order/me. Semuanya dari cache, tanpa query tambahan.
export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp', 'rsm']);
  if (user instanceof NextResponse) return user;

  const id = request.nextUrl.searchParams.get('customerId') ?? '';
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'customerId tidak valid' }, { status: 400 });
  }

  if (!(await bolehUbahOrder(user, id))) {
    return NextResponse.json({ error: PESAN_LUAR_REGION }, { status: 403 });
  }

  const info = await infoCustomer(id);
  return NextResponse.json({
    ...cariPosisi(await papan.get(), id),
    dusAwal: info?.dusAwal ?? null,
    tenggat: await bacaTenggat(),
  });
}
