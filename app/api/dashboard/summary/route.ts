import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { cacheDashboard } from '@/lib/dashboard/cache';
import { attendanceRate } from '@/lib/dashboard/compute';
import { filterKey, readFilter, type DashboardFilter } from '@/lib/dashboard/filters';
import { db } from '@/lib/db';

const load = cacheDashboard(async (key: string) => {
  const [region, depot] = key.split('|');
  const r = region || null;
  const d = depot || null;

  // depot_efektif menghormati koreksi per-catatan lebih dulu, lalu master data,
  // baru depot manual - urutan yang sama dipakai di seluruh agregasi.
  const rows = (await db.execute(sql`
    with cust as (
      select * from public.customers
      where (${r}::text is null or region = ${r}::text)
        and (${d}::text is null or depot = ${d}::text)
    ),
    res as (
      select r.customer_id, r.is_manual_entry, r.qty_hadir,
             coalesce(r.depot_override, c.depot, r.manual_depot) as depot_efektif,
             c.region as region
      from public.reservations r
      left join public.customers c on c.id = r.customer_id
    ),
    res_terfilter as (
      select * from res
      where (${r}::text is null or region = ${r}::text)
        and (${d}::text is null or depot_efektif = ${d}::text)
    )
    select
      (select count(*) from cust)::int                                          as "totalToko",
      (select coalesce(sum(qty_undangan), 0) from cust)::int                    as "totalUndangan",
      (select count(*) from res_terfilter where customer_id is not null)::int   as "tokoCheckin",
      (select coalesce(sum(qty_hadir), 0) from res_terfilter)::int              as "totalHadir",
      (select count(*) from res_terfilter where is_manual_entry)::int           as "manualEntry"
  `)) as unknown as Record<string, number>[];

  return rows[0];
});

export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'rsm', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  const filter: DashboardFilter = readFilter(request);
  const s = await load(filterKey(filter));
  return NextResponse.json({ ...s, persentase: attendanceRate(s.totalHadir, s.totalUndangan) });
}
