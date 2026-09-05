import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { infoCustomer, requireRoleApi } from '@/lib/auth';
import { cariPosisi } from '@/lib/order/leaderboard';
import { papan } from '@/lib/order/papan';
import { bacaTenggat } from '@/lib/settings';

// Total dus + posisi ranking + lantai pengambilan pertama sebuah toko, untuk
// panel staff "Tambah Order". Khusus staff: customer melihat miliknya sendiri
// lewat /api/order/me. Semuanya dari cache, tanpa query tambahan.
export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  const id = request.nextUrl.searchParams.get('customerId') ?? '';
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'customerId tidak valid' }, { status: 400 });
  }

  const info = await infoCustomer(id);
  return NextResponse.json({
    ...cariPosisi(await papan.get(), id),
    dusAwal: info?.dusAwal ?? null,
    tenggat: await bacaTenggat(),
  });
}
