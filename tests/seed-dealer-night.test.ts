import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, mysqlPool } from '@/lib/db';
import { customers, dealerNights, targetAdjustments } from '@/lib/db/schema';
import { seedDealerNight } from '@/scripts/seed-dealer-night';

const SLUG = 'test-bogor-seed';

async function resetFixture() {
  await db.delete(dealerNights).where(eq(dealerNights.slug, SLUG));
}

describe('seedDealerNight', () => {
  beforeEach(resetFixture);
  afterAll(async () => {
    await resetFixture();
    await mysqlPool.end();
  });

  it('seeds DN Bogor idempotently without erasing adjustments', async () => {
    const input = {
      file: 'Master_Toko Bogor.csv',
      hierarchyFile: 'public/Hierarchy Depot.csv',
      slug: SLUG,
      name: 'DN Bogor Test',
      db,
    };

    expect(await seedDealerNight(input)).toEqual({ inserted: 113, updated: 0 });

    const [dealerNight] = await db
      .select({ id: dealerNights.id })
      .from(dealerNights)
      .where(eq(dealerNights.slug, SLUG));
    const seeded = await db.select().from(customers).where(eq(customers.dealerNightId, dealerNight.id));
    const customer = seeded.find((row) => row.mgCode === '632723');
    expect(customer).toBeDefined();

    await db.insert(targetAdjustments).values({
      id: randomUUID(),
      customerId: customer!.id,
      delta: 1_000_000,
      note: 'test preserves ledger',
      recordedBy: null,
    });

    expect(await seedDealerNight(input)).toEqual({ inserted: 0, updated: 113 });

    const reseeded = await db.select().from(customers).where(eq(customers.dealerNightId, dealerNight.id));
    const ledger = await db
      .select({ id: targetAdjustments.id })
      .from(targetAdjustments)
      .where(eq(targetAdjustments.customerId, customer!.id));

    expect(reseeded).toHaveLength(113);
    expect(new Set(reseeded.map((row) => row.depotCode)).size).toBe(2);
    expect(new Set(reseeded.map((row) => row.qtyUndangan))).toEqual(new Set([1]));
    expect(Math.min(...reseeded.map((row) => row.targetDnAwal))).toBe(53_000_000);
    expect(reseeded.reduce((total, row) => total + row.targetDnAwal, 0)).toBe(42_955_000_000);
    expect(ledger).toHaveLength(1);
  }, 15_000);
});
