import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRoleApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { bolehUbahOrder, PESAN_LUAR_REGION } from '@/lib/order/akses';

export type RiwayatRow = {
  id: string;
  qtyChange: number;
  createdAt: string;
  note: string | null;
  pencatat: string | null;
};

// Riwayat penyesuaian satu toko, untuk dialog overview di Detail Order.
// Diambil saat dialog dibuka saja - tidak ikut dipoll.
export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp', 'marketing', 'rsm']);
  if (user instanceof NextResponse) return user;

  const id = request.nextUrl.searchParams.get('customerId') ?? '';
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'customerId tidak valid' }, { status: 400 });
  }

  if (!(await bolehUbahOrder(user, id))) {
    return NextResponse.json({ error: PESAN_LUAR_REGION }, { status: 403 });
  }

  const rows = (await db.execute(sql`
    select oa.id,
           oa.qty_change  as "qtyChange",
           oa.created_at  as "createdAt",
           oa.note,
           p.full_name    as "pencatat"
    from public.order_adjustments oa
    left join public.profiles p on p.id = oa.recorded_by
    where oa.customer_id = ${id}
    order by oa.created_at asc
  `)) as unknown as RiwayatRow[];

  return NextResponse.json({ rows });
}
