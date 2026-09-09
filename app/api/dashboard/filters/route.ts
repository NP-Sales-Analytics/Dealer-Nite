import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { cacheDashboard } from '@/lib/dashboard/cache';
import { bacaKunci, cocokSalahSatu, filterKey, readFilter, terapkanScope } from '@/lib/dashboard/filters';
import { lengkapiInduk } from '@/lib/dashboard/hierarchy';
import { db } from '@/lib/db';

export type FilterOptions = {
  wilayahs: string[];
  regions: { region: string; wilayah: string | null }[];
  depots: { depot: string; region: string | null; wilayah: string | null }[];
};

/**
 * Isi dropdown diturunkan dari catatan kehadiran yang SUDAH masuk, bukan dari
 * seluruh master data. Menampilkan 36 depot padahal baru 5 yang punya tamu
 * membuat daftar terasa seolah semua sudah hadir, dan sebagian besar pilihannya
 * dijamin menghasilkan nol baris.
 */
// Isi dropdown ikut dibatasi cakupan data: RSM yang terkunci di satu region
// tidak boleh melihat nama region lain di daftar pilihan, karena itu sudah
// membocorkan keberadaannya walau barisnya sendiri tidak bisa dibuka.
const load = cacheDashboard(async (key: string) => {
  const { region: r, kodeSap: k } = bacaKunci(key);

  const rows = (await db.execute(sql`
    select distinct
      coalesce(nullif(trim(coalesce(r.depot_override, c.depot, r.manual_depot)), ''), '(Tanpa Depot)') as depot,
      nullif(trim(c.region), '')  as region,
      nullif(trim(c.wilayah), '') as wilayah
    from public.reservations r
    left join public.customers c on c.id = r.customer_id
    where ${cocokSalahSatu(sql`c.region`, r)}
      and (${k}::text is null or c.kode_sap = ${k}::text)
    order by depot
  `)) as unknown as { depot: string; region: string | null; wilayah: string | null }[];

  // Region/wilayah tiap depot dilengkapi dari hierarki resmi lebih dulu. Tanpa
  // ini, depot yang hanya punya baris manual entry ber-region null dan akhirnya
  // muncul di SEMUA pilihan region.
  const lengkap = rows.map((r) => ({ depot: r.depot, ...lengkapiInduk(r.depot, r.region, r.wilayah) }));

  const wilayahs = [...new Set(lengkap.map((r) => r.wilayah).filter((v): v is string => !!v))].sort();

  // Region -> wilayah induknya, supaya memilih wilayah bisa mempersempit
  // daftar region di dropdown berikutnya.
  const perRegion = new Map<string, string | null>();
  for (const r of lengkap) {
    if (!r.region) continue;
    const lama = perRegion.get(r.region);
    if (lama === undefined || (lama === null && r.wilayah)) perRegion.set(r.region, r.wilayah);
  }

  // Satu depot bisa muncul dua kali kalau ada baris manual (region null) di
  // depot yang sama; ambil baris yang terisi bila ada.
  const perDepot = new Map<string, { region: string | null; wilayah: string | null }>();
  for (const r of lengkap) {
    const lama = perDepot.get(r.depot);
    if (lama === undefined || (!lama.region && r.region)) {
      perDepot.set(r.depot, { region: r.region, wilayah: r.wilayah });
    }
  }

  return {
    wilayahs,
    regions: [...perRegion.entries()].map(([region, wilayah]) => ({ region, wilayah })).sort((a, b) => a.region.localeCompare(b.region)),
    depots: [...perDepot.entries()].map(([depot, v]) => ({ depot, ...v })),
  };
});

export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'rsm', 'admin_rsvp', 'marketing']);
  if (user instanceof NextResponse) return user;

  // Isi dropdown jarang berubah; satu menit di browser sepadan dengan
  // staleTime 5 menit di klien. `private` karena route ini dijaga login, dan
  // `Vary: Cookie` supaya dua akun di browser yang sama tidak saling mewarisi
  // daftar filter - inilah yang membuat superadmin sempat melihat daftar region
  // milik RSM yang login sebelumnya.
  return NextResponse.json(await load(filterKey(terapkanScope(readFilter(request), user))), {
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      Vary: 'Cookie',
    },
  });
}
