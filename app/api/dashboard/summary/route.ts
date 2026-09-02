import { sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { attendanceRate } from '@/lib/dashboard/compute';
import { db } from '@/lib/db';

const load = unstable_cache(
  async () => {
    const rows = (await db.execute(sql`
      select
        (select coalesce(sum(qty_undangan), 0) from public.customers)::int            as "totalUndangan",
        (select coalesce(sum(qty_hadir), 0)   from public.reservations)::int          as "totalHadir",
        (select count(*) from public.customers)::int                                  as "totalToko",
        (select count(*) from public.reservations where customer_id is not null)::int as "tokoCheckin",
        (select count(*) from public.reservations where is_manual_entry)::int         as "manualEntry"
    `)) as unknown as Record<string, number>[];
    return rows[0];
  },
  ['dashboard-summary'],
  { revalidate: 15, tags: ['dashboard'] },
);

export async function GET() {
  const user = await requireRoleApi(['superadmin', 'rsm', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  const s = await load();
  return NextResponse.json({ ...s, persentase: attendanceRate(s.totalHadir, s.totalUndangan) });
}
