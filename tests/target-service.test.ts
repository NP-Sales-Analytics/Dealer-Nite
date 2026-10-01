import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, mysqlPool } from '@/lib/db';
import { customers, dealerNights, profiles, targetAdjustments } from '@/lib/db/schema';
import { resolveDealerNightId } from '@/lib/target/access';
import { adjustTarget, getTargetSnapshot, listTargets, resetVerifikasi } from '@/lib/target/service';

const ids = {
  dealerNight: '22222222-2222-4222-8222-222222222222',
  customer: '33333333-3333-4333-8333-333333333333',
  actor: '44444444-4444-4444-8444-444444444444',
};

async function resetFixture() {
  await db.delete(dealerNights).where(eq(dealerNights.id, ids.dealerNight));
  await db.delete(profiles).where(eq(profiles.id, ids.actor));
  await db.insert(dealerNights).values({ id: ids.dealerNight, slug: 'target-service-test', name: 'Test DN' });
  await db.insert(profiles).values({
    id: ids.actor,
    fullName: 'Test Admin',
    passwordHash: randomUUID().replaceAll('-', ''),
    role: 'admin',
    allowedPages: [],
    dealerNightIds: null,
    bolehUnduh: false,
  });
  await db.insert(customers).values({
    id: ids.customer,
    dealerNightId: ids.dealerNight,
    mgCode: 'MG-TEST',
    mgName: 'TOKO TEST',
    sotpCode: 'SOTP-TEST',
    sotpName: 'TOKO TEST',
    depotCode: '1S',
    depotName: '1S Bogor',
    targetDnAwal: 820_000_000,
    qtyUndangan: 1,
  });
}

describe('Target DN ledger', () => {
  beforeEach(resetFixture);
  afterAll(async () => {
    await db.delete(dealerNights).where(eq(dealerNights.id, ids.dealerNight));
    await db.delete(profiles).where(eq(profiles.id, ids.actor));
    await mysqlPool.end();
  });

  it('stores the delta from the requested absolute target', async () => {
    const result = await adjustTarget({
      customerId: ids.customer,
      newTarget: 900_000_000,
      actorId: ids.actor,
    });

    expect(result).toMatchObject({
      targetAwal: 820_000_000,
      targetEfektif: 900_000_000,
      delta: 80_000_000,
    });
    expect(await db.select().from(targetAdjustments).where(eq(targetAdjustments.customerId, ids.customer))).toHaveLength(1);
  });

  it('verifies the target on the first submit even without a value change', async () => {
    const before = await listTargets(ids.dealerNight);
    expect(before[0].verifiedAt).toBeNull();

    await adjustTarget({ customerId: ids.customer, newTarget: 820_000_000, actorId: ids.actor });

    const [after] = await listTargets(ids.dealerNight);
    expect(after.verifiedAt).not.toBeNull();
    expect(after.verifiedByName).toBe('Test Admin');
    expect(after.jumlahPenyesuaian).toBe(0);
    expect(after.targetVerifikasi).toBe(820_000_000);

    await adjustTarget({ customerId: ids.customer, newTarget: 900_000_000, actorId: ids.actor });
    const [adjusted] = await listTargets(ids.dealerNight);
    expect(adjusted.targetVerifikasi).toBe(820_000_000);
    expect(adjusted.targetEfektif).toBe(900_000_000);
    const [ledger] = await db.select().from(targetAdjustments).where(eq(targetAdjustments.customerId, ids.customer));
    expect(ledger.jenis).toBe('penyesuaian');
    await db.delete(targetAdjustments).where(eq(targetAdjustments.customerId, ids.customer));
  });

  it('reset verifikasi mengembalikan toko ke target pusat', async () => {
    await adjustTarget({ customerId: ids.customer, newTarget: 900_000_000, actorId: ids.actor });
    await adjustTarget({ customerId: ids.customer, newTarget: 950_000_000, actorId: ids.actor });
    await resetVerifikasi(ids.customer);
    const [row] = await listTargets(ids.dealerNight);
    expect(row).toMatchObject({ verifiedAt: null, targetVerifikasi: null, targetEfektif: 820_000_000, jumlahPenyesuaian: 0 });
    expect(await db.select().from(targetAdjustments).where(eq(targetAdjustments.customerId, ids.customer))).toHaveLength(0);
  });

  it('allows decreases but not below Rp50 million', async () => {
    await expect(adjustTarget({
      customerId: ids.customer,
      newTarget: 50_000_000,
      actorId: ids.actor,
    })).resolves.toBeDefined();
    await expect(adjustTarget({
      customerId: ids.customer,
      newTarget: 49_999_999,
      actorId: ids.actor,
    })).rejects.toMatchObject({ code: 'BELOW_MINIMUM' });
  });

  it('serializes concurrent adjustments without losing a write', async () => {
    const results = await Promise.all([
      adjustTarget({ customerId: ids.customer, newTarget: 900_000_000, actorId: ids.actor }),
      adjustTarget({ customerId: ids.customer, newTarget: 850_000_000, actorId: ids.actor }),
    ]);

    expect(results.map((row) => row.targetEfektif).sort()).toEqual([850_000_000, 900_000_000]);
    const ledger = await db.select().from(targetAdjustments).where(eq(targetAdjustments.customerId, ids.customer));
    const final = await getTargetSnapshot(ids.customer);
    expect(ledger).toHaveLength(2);
    expect(final.targetEfektif).toBe(820_000_000 + ledger.reduce((sum, row) => sum + row.delta, 0));
    expect([850_000_000, 900_000_000]).toContain(final.targetEfektif);
  });
});

describe('Target DN Dealer Night scope', () => {
  it('rejects a DN account that requests another event', () => {
    expect(() => resolveDealerNightId(
      { role: 'dn_user', dealerNightIds: ['dn-bogor'] },
      'dn-bandung',
    )).toThrow('Tidak punya akses');
  });

  it('forces a DN account to its assignment when no query is supplied', () => {
    expect(resolveDealerNightId({ role: 'dn_user', dealerNightIds: ['dn-bogor'] }, null)).toBe('dn-bogor');
  });
});
