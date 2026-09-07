import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { bolehUbahOrder, PESAN_LUAR_REGION } from '@/lib/order/akses';
import { getSession } from '@/lib/session';

export type RiwayatRow = {
  id: string;
  qtyChange: number;
  createdAt: string;
  note: string | null;
  pencatat: string | null;
};

const TEAM_ROLES = ['superadmin', 'admin_rsvp', 'marketing', 'rsm'] as const;

/**
 * Riwayat penyesuaian satu toko - dipakai dialog overview di Detail Order dan
 * panel Tambah Order. Diambil saat dibutuhkan saja, tidak ikut dipoll.
 *
 * Sesi customer hanya pernah melihat riwayatnya SENDIRI: idnya diambil dari
 * sesi dan parameter customerId diabaikan, sepola dengan /api/order/adjust.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  let id: string;
  if (session.kind === 'customer') {
    id = session.id;
  } else {
    const user = await getSessionUser();
    if (!user || !TEAM_ROLES.includes(user.role as (typeof TEAM_ROLES)[number])) {
      return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
    }
    id = request.nextUrl.searchParams.get('customerId') ?? '';
    if (!z.uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'customerId tidak valid' }, { status: 400 });
    }
    // RSM tetap terkunci region-nya, sama seperti jalur mencatat order.
    if (!(await bolehUbahOrder(user, id))) {
      return NextResponse.json({ error: PESAN_LUAR_REGION }, { status: 403 });
    }
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
