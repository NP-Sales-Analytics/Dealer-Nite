import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { parseDealerNightCsv } from '@/lib/csv/parse-dealer-night';
import { db as appDb, mysqlPool } from '@/lib/db';
import { customers, dealerNights } from '@/lib/db/schema';

type SeedDatabase = typeof appDb;

export type SeedDealerNightInput = {
  file: string;
  hierarchyFile: string;
  slug: string;
  name: string;
  db: SeedDatabase;
};

export async function seedDealerNight(input: SeedDealerNightInput) {
  const rows = parseDealerNightCsv(
    readFileSync(input.file, 'utf8'),
    readFileSync(input.hierarchyFile, 'utf8'),
  );

  return input.db.transaction(async (tx) => {
    const [existingDealerNight] = await tx
      .select({ id: dealerNights.id })
      .from(dealerNights)
      .where(eq(dealerNights.slug, input.slug))
      .limit(1);

    const dealerNightId = existingDealerNight?.id ?? randomUUID();
    if (existingDealerNight) {
      await tx
        .update(dealerNights)
        .set({ name: input.name, active: true })
        .where(eq(dealerNights.id, dealerNightId));
    } else {
      await tx.insert(dealerNights).values({
        id: dealerNightId,
        slug: input.slug,
        name: input.name,
        active: true,
      });
    }

    const existingCustomers = await tx
      .select({ id: customers.id, mgCode: customers.mgCode })
      .from(customers)
      .where(eq(customers.dealerNightId, dealerNightId));
    const existingByMgCode = new Map(existingCustomers.map((row) => [row.mgCode, row.id]));
    let inserted = 0;
    let updated = 0;

    for (const row of rows) {
      const values = {
        dealerNightId,
        mgCode: row.mgCode,
        mgName: row.mgName,
        sotpCode: row.sotpCode,
        sotpName: row.sotpName,
        depotCode: row.depotCode,
        depotName: row.depotName,
        wilayah: row.wilayah || null,
        region: row.region || null,
        salesman: row.salesman || null,
        spv: row.spv || null,
        targetDnAwal: row.targetDnAwal,
        qtyUndangan: row.qtyUndangan,
      };
      const existingId = existingByMgCode.get(row.mgCode);

      if (existingId) {
        await tx.update(customers).set(values).where(eq(customers.id, existingId));
        updated += 1;
      } else {
        await tx.insert(customers).values({ id: randomUUID(), ...values });
        inserted += 1;
      }
    }

    return { inserted, updated };
  });
}

function argument(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : fallback;
  if (!value) throw new Error(`Argumen --${name} wajib diisi.`);
  return value;
}

async function main() {
  const result = await seedDealerNight({
    file: argument('file'),
    hierarchyFile: argument('hierarchy-file', 'public/Hierarchy Depot.csv'),
    slug: argument('slug'),
    name: argument('name'),
    db: appDb,
  });
  console.log(`Seed selesai: ${result.inserted} baru, ${result.updated} diperbarui.`);
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/seed-dealer-night.ts')) {
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(() => mysqlPool.end());
}
