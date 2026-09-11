import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { cacheDashboard } from '@/lib/dashboard/cache';
import { sortDepots, type DepotRow } from '@/lib/dashboard/compute';
import { bacaKunci, cocokSalahSatu, filterKey, readFilter, terapkanScope } from '@/lib/dashboard/filters';
import { db } from '@/lib/db';

// FULL OUTER JOIN supaya depot manual-entry tetap muncul di daftar. Metadata
// wilayah/region untuk manual entry diambil dari setting target depot.
const load = cacheDashboard(async (key: string) => {
  const { wilayah, region, depot, kodeSap } = bacaKunci(key);
  const w = wilayah;
  const r = region;
  const d = depot;
  const k = kodeSap;

  const rows = (await db.execute(sql`
    with katalog_depot as (
      select btrim(depot) as depot,
             mode() within group (order by nullif(btrim(region), '')) as region,
             mode() within group (order by nullif(btrim(wilayah), '')) as wilayah,
             count(*)::int as toko
      from public.customers
      where nullif(btrim(depot), '') is not null
        and (${k}::text is null or kode_sap = ${k}::text)
      group by btrim(depot)

      union all

      select 'Komunitas & Media', 'Komunitas & Media', 'Komunitas & Media', 0
      where ${k}::text is null
    ),
    target as (
      select kd.depot,
             kd.region,
             coalesce(t.target_pax, 0)::int as target_pax,
             kd.toko
      from katalog_depot kd
      left join public.depot_pax_targets t on t.depot = kd.depot
      where ${cocokSalahSatu(sql`kd.wilayah`, w)}
        and ${cocokSalahSatu(sql`kd.region`, r)}
        and ${cocokSalahSatu(sql`kd.depot`, d)}
    ),
    actual as (
      select x.depot,
             mode() within group (order by x.region) as region,
             sum(x.qty_hadir)::int as qty,
             count(*) filter (where x.customer_id is not null)::int as toko
      from (
        select coalesce(nullif(btrim(coalesce(rv.depot_override, c.depot, rv.manual_depot)), ''), '(Tanpa Depot)') as depot,
               coalesce(c.region, pt.region) as region,
               coalesce(c.wilayah, pt.wilayah) as wilayah,
               c.kode_sap,
               rv.customer_id,
               rv.qty_hadir
        from public.reservations rv
        left join public.customers c on c.id = rv.customer_id
        left join public.depot_pax_targets pt
          on pt.depot = coalesce(rv.depot_override, c.depot, rv.manual_depot)
      ) x
      where ${cocokSalahSatu(sql`x.wilayah`, w)}
        and ${cocokSalahSatu(sql`x.region`, r)}
        and ${cocokSalahSatu(sql`x.depot`, d)}
        and (${k}::text is null or x.kode_sap = ${k}::text)
      group by x.depot
    )
    select coalesce(t.depot, a.depot)  as depot,
           coalesce(t.region, a.region) as region,
           coalesce(t.target_pax, 0)::int as "targetPax",
           coalesce(a.qty, 0)::int     as "qtyHadir",
           coalesce(t.toko, 0)::int    as "tokoDiundang",
           coalesce(a.toko, 0)::int    as "tokoHadir"
    from target t full outer join actual a on a.depot = t.depot
  `)) as unknown as DepotRow[];

  return sortDepots(rows);
});

// Cache di browser, bukan di CDN. `private` wajib: route ini dijaga login,
// dan cache bersama akan menyajikan angkanya ke siapa pun tanpa cek auth.
// stale-while-revalidate membuat reload cepat memakai salinan lama dulu.
//
// `Vary: Cookie` sama wajibnya sejak ada cakupan data: `private` berarti "milik
// browser ini", BUKAN "milik user ini". Tanpa Vary, login sebagai RSM 3A lalu
// berganti ke superadmin di browser yang sama masih menyajikan jawaban ber-scope
// 3A selama cache belum basi. Cookie sesi berbeda per user, jadi menjadikannya
// bagian kunci cache memisahkan keduanya.
const CACHE = {
  'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
  Vary: 'Cookie',
};

export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'rsm', 'admin_rsvp', 'marketing']);
  if (user instanceof NextResponse) return user;

  return NextResponse.json(
    { rows: await load(filterKey(terapkanScope(readFilter(request), user))) },
    { headers: CACHE },
  );
}
