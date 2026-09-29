import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { bersihkanCacheDashboard } from '@/lib/dashboard/cache';
import { KOMUNITAS_MEDIA } from '@/lib/dashboard/komunitas-media';
import { db } from '@/lib/db';
import { customers, depotPaxTargets } from '@/lib/db/schema';
import { targetPaxListSchema, type TargetPaxItem } from '@/lib/validations/pax-target';

export { KOMUNITAS_MEDIA };
export type DepotTargetPax = {
  depot: string;
  depotCode: string;
  wilayah: string | null;
  region: string | null;
  targetPax: number;
};

export async function bacaDaftarTargetPax(dealerNightId: string): Promise<DepotTargetPax[]> {
  const [customerRows, targetRows] = await Promise.all([
    db.select({
      depot: customers.depotName,
      depotCode: customers.depotCode,
      wilayah: customers.wilayah,
      region: customers.region,
    }).from(customers).where(eq(customers.dealerNightId, dealerNightId)),
    db.select().from(depotPaxTargets).where(eq(depotPaxTargets.dealerNightId, dealerNightId)),
  ]);
  const targets = new Map(targetRows.map((row) => [row.depotName, row.targetPax]));
  const metadata = new Map<string, Omit<DepotTargetPax, 'targetPax'>>();
  for (const row of customerRows) if (!metadata.has(row.depot)) metadata.set(row.depot, row);
  if (!metadata.has(KOMUNITAS_MEDIA)) {
    metadata.set(KOMUNITAS_MEDIA, {
      depot: KOMUNITAS_MEDIA,
      depotCode: 'MANUAL',
      wilayah: KOMUNITAS_MEDIA,
      region: KOMUNITAS_MEDIA,
    });
  }
  return [...metadata.values()]
    .map((row) => ({ ...row, targetPax: targets.get(row.depot) ?? 0 }))
    .sort((left, right) => left.depot.localeCompare(right.depot, 'id'));
}

export async function simpanTargetPax(dealerNightId: string, input: TargetPaxItem[]) {
  const parsed = targetPaxListSchema.parse(input);
  const catalog = await bacaDaftarTargetPax(dealerNightId);
  const metadata = new Map(catalog.map((row) => [row.depot, row]));
  if (parsed.some((item) => !metadata.has(item.depot))) throw new Error('Ada depot yang tidak tersedia.');

  for (const item of parsed) {
    const depot = metadata.get(item.depot)!;
    const [existing] = await db.select({ id: depotPaxTargets.id }).from(depotPaxTargets).where(and(
      eq(depotPaxTargets.dealerNightId, dealerNightId),
      eq(depotPaxTargets.depotCode, depot.depotCode),
    )).limit(1);
    const values = {
      dealerNightId,
      depotCode: depot.depotCode,
      depotName: depot.depot,
      wilayah: depot.wilayah,
      region: depot.region,
      targetPax: item.targetPax,
      updatedAt: new Date(),
    };
    if (existing) await db.update(depotPaxTargets).set(values).where(eq(depotPaxTargets.id, existing.id));
    else await db.insert(depotPaxTargets).values({ id: randomUUID(), ...values });
  }
  bersihkanCacheDashboard();
}
