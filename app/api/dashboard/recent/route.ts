import { sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { db } from '@/lib/db';

const load = unstable_cache(
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
  ['dashboard-recent'],
  { revalidate: 15, tags: ['dashboard'] },
);

export async function GET() {
  const user = await requireRoleApi(['superadmin', 'rsm', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;
  return NextResponse.json({ rows: await load() });
}
