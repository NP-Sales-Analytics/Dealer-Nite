import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { cacheDashboard } from '@/lib/dashboard/cache';
import { db } from '@/lib/db';

export type FilterOptions = {
  regions: string[];
  depots: { depot: string; region: string | null }[];
};

/**
 * Isi dropdown diturunkan dari catatan kehadiran yang SUDAH masuk, bukan dari
 * seluruh master data. Menampilkan 36 depot padahal baru 5 yang punya tamu
 * membuat daftar terasa seolah semua sudah hadir, dan sebagian besar pilihannya
 * dijamin menghasilkan nol baris.
 */
const load = cacheDashboard(async () => {
  const rows = (await db.execute(sql`
    select distinct
      coalesce(nullif(trim(coalesce(r.depot_override, c.depot, r.manual_depot)), ''), '(Tanpa Depot)') as depot,
      nullif(trim(c.region), '') as region
    from public.reservations r
    left join public.customers c on c.id = r.customer_id
    order by depot
  `)) as unknown as { depot: string; region: string | null }[];

  const regions = [...new Set(rows.map((r) => r.region).filter((v): v is string => !!v))].sort();

  // Satu depot bisa muncul dua kali kalau ada baris manual (region null) di
  // depot yang sama; ambil region yang terisi bila ada.
  const perDepot = new Map<string, string | null>();
  for (const r of rows) {
    const lama = perDepot.get(r.depot);
    if (lama === undefined || (lama === null && r.region)) perDepot.set(r.depot, r.region);
  }

  return {
    regions,
    depots: [...perDepot.entries()].map(([depot, region]) => ({ depot, region })),
  };
});

export async function GET() {
  const user = await requireRoleApi(['superadmin', 'rsm', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  return NextResponse.json(await load());
}
