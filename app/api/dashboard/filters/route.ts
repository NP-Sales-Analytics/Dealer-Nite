import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { cache15s } from '@/lib/dashboard/cache';
import { db } from '@/lib/db';

export type FilterOptions = {
  regions: string[];
  depots: { depot: string; region: string | null }[];
};

// Isi dropdown TIDAK ikut terfilter: kalau daftarnya menyusut mengikuti pilihan
// sendiri, user tidak bisa lagi berpindah ke region lain tanpa mereset dulu.
const load = cache15s(async () => {
  const regions = (await db.execute(sql`
    select distinct region from public.customers
    where region is not null and trim(region) <> ''
    order by region
  `)) as unknown as { region: string }[];

  // Depot manual entry ikut, supaya tamu di luar master data tetap bisa difilter.
  const depots = (await db.execute(sql`
    select depot, mode() within group (order by region) as region
    from (
      select coalesce(nullif(trim(depot), ''), null) as depot, region from public.customers
      union all
      select coalesce(nullif(trim(coalesce(r.depot_override, r.manual_depot)), ''), null) as depot, null as region
      from public.reservations r
      where r.customer_id is null or r.depot_override is not null
    ) g
    where depot is not null
    group by depot
    order by depot
  `)) as unknown as { depot: string; region: string | null }[];

  return { regions: regions.map((r) => r.region), depots };
});

export async function GET() {
  const user = await requireRoleApi(['superadmin', 'rsm', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  return NextResponse.json(await load());
}
