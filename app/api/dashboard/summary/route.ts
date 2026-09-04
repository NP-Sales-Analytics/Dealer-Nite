import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { cacheDashboard } from '@/lib/dashboard/cache';
import { attendanceRate } from '@/lib/dashboard/compute';
import { bacaKunci, filterKey, readFilter, terapkanScope } from '@/lib/dashboard/filters';
import { db } from '@/lib/db';

const load = cacheDashboard(async (key: string) => {
  const { wilayah, region, depot, kodeSap } = bacaKunci(key);
  const w = wilayah;
  const r = region;
  const d = depot;
  const k = kodeSap;

  // depot_efektif menghormati koreksi per-catatan lebih dulu, lalu master data,
  // baru depot manual - urutan yang sama dipakai di seluruh agregasi.
  const rows = (await db.execute(sql`
    with cust as (
      select * from public.customers
      where (${w}::text is null or wilayah = ${w}::text)
        and (${r}::text is null or region = ${r}::text)
        and (${d}::text is null or depot = ${d}::text)
        and (${k}::text is null or kode_sap = ${k}::text)
    ),
    res as (
      select r.customer_id, r.is_manual_entry, r.qty_hadir,
             coalesce(r.depot_override, c.depot, r.manual_depot) as depot_efektif,
             c.region as region, c.wilayah as wilayah, c.kode_sap as kode_sap
      from public.reservations r
      left join public.customers c on c.id = r.customer_id
    ),
    res_terfilter as (
      select * from res
      where (${w}::text is null or wilayah = ${w}::text)
        and (${r}::text is null or region = ${r}::text)
        and (${d}::text is null or depot_efektif = ${d}::text)
        and (${k}::text is null or kode_sap = ${k}::text)
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

  // terapkanScope SEBELUM filterKey: cakupan user ikut jadi bagian kunci cache.
  const s = await load(filterKey(terapkanScope(readFilter(request), user)));
  return NextResponse.json(
    { ...s, persentase: attendanceRate(s.totalHadir, s.totalUndangan) },
    { headers: CACHE },
  );
}
