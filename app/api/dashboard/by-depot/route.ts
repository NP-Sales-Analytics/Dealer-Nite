import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { cache15s } from '@/lib/dashboard/cache';
import { sortDepots, type DepotRow } from '@/lib/dashboard/compute';
import { filterKey, readFilter } from '@/lib/dashboard/filters';
import { db } from '@/lib/db';

// FULL OUTER JOIN supaya depot manual-entry yang tidak ada di master data
// tetap muncul di daftar.
const load = cache15s(async (key: string) => {
  const [region, depot] = key.split('|');
  const r = region || null;
  const d = depot || null;

  const rows = (await db.execute(sql`
    with target as (
      select coalesce(nullif(trim(depot), ''), '(Tanpa Depot)') as depot,
             sum(qty_undangan)::int as qty,
             count(*)::int as toko,
             -- Satu depot pada praktiknya berada di satu region; ambil yang
             -- paling sering muncul supaya labelnya stabil.
             mode() within group (order by region) as region
      from public.customers
      where (${r}::text is null or region = ${r}::text)
        and (${d}::text is null or depot = ${d}::text)
      group by 1
    ),
    actual as (
      select coalesce(nullif(trim(coalesce(r.depot_override, c.depot, r.manual_depot)), ''), '(Tanpa Depot)') as depot,
             sum(r.qty_hadir)::int as qty,
             -- Hanya toko terdaftar yang dihitung sebagai "toko hadir": manual
             -- entry bukan bagian dari daftar undangan, sehingga memasukkannya
             -- membuat hadir bisa melebihi diundang. Pax-nya tetap ikut dijumlah.
             count(*) filter (where r.customer_id is not null)::int as toko
      from public.reservations r
      left join public.customers c on c.id = r.customer_id
      where (${r}::text is null or c.region = ${r}::text)
        and (${d}::text is null or coalesce(r.depot_override, c.depot, r.manual_depot) = ${d}::text)
      group by 1
    )
    select coalesce(t.depot, a.depot)  as depot,
           t.region                    as region,
           coalesce(t.qty, 0)::int     as "qtyUndangan",
           coalesce(a.qty, 0)::int     as "qtyHadir",
           coalesce(t.toko, 0)::int    as "tokoDiundang",
           coalesce(a.toko, 0)::int    as "tokoHadir"
    from target t full outer join actual a on a.depot = t.depot
  `)) as unknown as DepotRow[];

  return sortDepots(rows);
});

export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'rsm', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  return NextResponse.json({ rows: await load(filterKey(readFilter(request))) });
}
