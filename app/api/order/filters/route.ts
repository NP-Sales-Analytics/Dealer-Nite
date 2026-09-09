import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import type { FilterOptions } from '@/app/api/dashboard/filters/route';
import { requireRoleApi } from '@/lib/auth';
import { cacheDashboard } from '@/lib/dashboard/cache';
import { bacaKunci, cocokSalahSatu, filterKey, readFilter, terapkanScope } from '@/lib/dashboard/filters';
import { lengkapiInduk } from '@/lib/dashboard/hierarchy';
import { db } from '@/lib/db';

/**
 * Isi dropdown untuk Detail Order, diturunkan dari SELURUH master customer.
 *
 * Sengaja tidak memakai /api/dashboard/filters: yang itu menurunkan pilihannya
 * dari tabel reservations, sehingga depot yang belum punya satu pun kehadiran
 * akan hilang diam-diam dari halaman master ini. Di sini justru semua depot
 * harus bisa dipilih, termasuk yang belum ada ordernya.
 */
const load = cacheDashboard(async (key: string) => {
  const { region: r, kodeSap: k } = bacaKunci(key);

  const rows = (await db.execute(sql`
    select distinct
      coalesce(nullif(trim(c.depot), ''), '(Tanpa Depot)') as depot,
      nullif(trim(c.region), '')  as region,
      nullif(trim(c.wilayah), '') as wilayah
    from public.customers c
    where ${cocokSalahSatu(sql`c.region`, r)}
      and (${k}::text is null or c.kode_sap = ${k}::text)
    order by depot
  `)) as unknown as { depot: string; region: string | null; wilayah: string | null }[];

  // Sama seperti route filter kehadiran: hierarki resmi melengkapi region/wilayah
  // yang kosong, supaya depot ber-region null tidak muncul di SEMUA pilihan region.
  const lengkap = rows.map((x) => ({ depot: x.depot, ...lengkapiInduk(x.depot, x.region, x.wilayah) }));

  const wilayahs = [...new Set(lengkap.map((x) => x.wilayah).filter((v): v is string => !!v))].sort();

  const perRegion = new Map<string, string | null>();
  for (const x of lengkap) {
    if (!x.region) continue;
    const lama = perRegion.get(x.region);
    if (lama === undefined || (lama === null && x.wilayah)) perRegion.set(x.region, x.wilayah);
  }

  const perDepot = new Map<string, { region: string | null; wilayah: string | null }>();
  for (const x of lengkap) {
    const lama = perDepot.get(x.depot);
    if (lama === undefined || (!lama.region && x.region)) {
      perDepot.set(x.depot, { region: x.region, wilayah: x.wilayah });
    }
  }

  const hasil: FilterOptions = {
    wilayahs,
    regions: [...perRegion.entries()]
      .map(([region, wilayah]) => ({ region, wilayah }))
      .sort((a, b) => a.region.localeCompare(b.region)),
    depots: [...perDepot.entries()].map(([depot, v]) => ({ depot, ...v })),
  };
  return hasil;
});

export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp', 'marketing', 'rsm']);
  if (user instanceof NextResponse) return user;

  return NextResponse.json(await load(filterKey(terapkanScope(readFilter(request), user))), {
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      Vary: 'Cookie',
    },
  });
}
