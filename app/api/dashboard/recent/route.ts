import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { cache15s } from '@/lib/dashboard/cache';
import { db } from '@/lib/db';

const load = cache15s(
  async () => db.execute(sql`
    select r.id,
           coalesce(c.nama_toko, r.manual_nama_customer)  as nama,
           coalesce(c.depot, r.manual_depot, '-')         as depot,
           r.qty_hadir::int                               as "qtyHadir",
           r.checked_in_at                                as "checkedInAt",
           r.is_manual_entry                              as "isManualEntry"
    from public.reservations r
    left join public.customers c on c.id = r.customer_id
    order by r.checked_in_at desc
    limit 15
  `),
);

export async function GET() {
  const user = await requireRoleApi(['superadmin', 'rsm', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;
  return NextResponse.json({ rows: await load() });
}
