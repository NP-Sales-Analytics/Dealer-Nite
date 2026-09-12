import { sql } from 'drizzle-orm';
import { bersihkanCacheDashboard } from '@/lib/dashboard/cache';
import { db } from '@/lib/db';
import { depotPaxTargets } from '@/lib/db/schema';
import { KOMUNITAS_MEDIA } from '@/lib/dashboard/komunitas-media';
import { targetPaxListSchema, type TargetPaxItem } from '@/lib/validations/pax-target';

export { KOMUNITAS_MEDIA };

export type DepotTargetPax = {
  depot: string;
  wilayah: string | null;
  region: string | null;
  targetPax: number;
};

/**
 * Daftar depot berasal dari master customer Detail Order. Komunitas & Media
 * adalah satu-satunya depot tambahan karena memang bukan customer master.
 */
export async function bacaDaftarTargetPax(): Promise<DepotTargetPax[]> {
  return (await db.execute(sql`
    with katalog as (
      select btrim(depot) as depot,
             mode() within group (order by nullif(btrim(wilayah), '')) as wilayah,
             mode() within group (order by nullif(btrim(region), '')) as region
      from public.customers
      where nullif(btrim(depot), '') is not null
      group by btrim(depot)

      union all

      select ${KOMUNITAS_MEDIA}::text, ${KOMUNITAS_MEDIA}::text, ${KOMUNITAS_MEDIA}::text
    )
    select k.depot,
           k.wilayah,
           k.region,
           coalesce(t.target_pax, 0)::int as "targetPax"
    from katalog k
    left join public.depot_pax_targets t on t.depot = k.depot
    order by k.depot
  `)) as unknown as DepotTargetPax[];
}

/** Menyimpan semua target dalam satu transaksi dan satu upsert per batch. */
export async function simpanTargetPax(input: TargetPaxItem[]) {
  const parsed = targetPaxListSchema.parse(input);
  const katalog = await bacaDaftarTargetPax();
  const metadata = new Map(katalog.map((row) => [row.depot, row]));

  if (parsed.some((item) => !metadata.has(item.depot))) {
    throw new Error('Ada depot yang tidak lagi tersedia di master customer. Muat ulang halaman.');
  }

  await db
    .insert(depotPaxTargets)
    .values(parsed.map((item) => {
      const depot = metadata.get(item.depot)!;
      return {
        depot: item.depot,
        wilayah: depot.wilayah,
        region: depot.region,
        targetPax: item.targetPax,
        updatedAt: new Date(),
      };
    }))
    .onConflictDoUpdate({
      target: depotPaxTargets.depot,
      set: {
        // Metadata disegarkan dari master setiap penyimpanan. target_pax tidak
        // pernah lagi bergantung pada qty_undangan.
        wilayah: sql`excluded.wilayah`,
        region: sql`excluded.region`,
        targetPax: sql`excluded.target_pax`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  bersihkanCacheDashboard();
}

