import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, mysqlPool } from '@/lib/db';
import { customers, dealerNights, profiles, targetAdjustments } from '@/lib/db/schema';
import { resolveDealerNightId } from '@/lib/target/access';
import { adjustTarget, getTargetSnapshot, listTargets, noFormulirBerikut, resetVerifikasi, ubahNoFormulir } from '@/lib/target/service';

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
    const ledger = await db.select().from(targetAdjustments)
      .where(eq(targetAdjustments.customerId, ids.customer)).orderBy(targetAdjustments.noFormulir);
    expect(ledger.map((row) => [row.jenis, row.delta, row.noFormulir])).toEqual([
      ['verifikasi', 0, 1],
      ['penyesuaian', 80_000_000, 2],
    ]);
  });

  it('nomor formulir berurutan lintas toko, tidak dipakai ulang setelah reset', async () => {
    const tokoB = '35353535-3535-4353-8353-353535353535';
    await db.insert(customers).values({
      id: tokoB, dealerNightId: ids.dealerNight, mgCode: 'MG-B', mgName: 'TOKO B', sotpCode: 'S-B', sotpName: 'TOKO B',
      depotCode: '5C', depotName: '5C Cianjur', targetDnAwal: 100_000_000, qtyUndangan: 1,
    });
    expect(await noFormulirBerikut(ids.dealerNight)).toBe(1);
    expect((await adjustTarget({ customerId: ids.customer, newTarget: 820_000_000, actorId: ids.actor })).noFormulir).toBe(1);
    expect((await adjustTarget({ customerId: tokoB, newTarget: 100_000_000, actorId: ids.actor })).noFormulir).toBe(2);
    expect((await adjustTarget({ customerId: ids.customer, newTarget: 900_000_000, actorId: ids.actor })).noFormulir).toBe(3);

    await resetVerifikasi(ids.customer);
    expect(await noFormulirBerikut(ids.dealerNight)).toBe(4);
    expect((await adjustTarget({ customerId: ids.customer, newTarget: 820_000_000, actorId: ids.actor })).noFormulir).toBe(4);
  });

  it('nomor formulir bisa diubah manual, ditukar, dan penghitung ikut naik', async () => {
    const tokoB = '36363636-3636-4363-8363-363636363636';
    await db.insert(customers).values({
      id: tokoB, dealerNightId: ids.dealerNight, mgCode: 'MG-C', mgName: 'TOKO C', sotpCode: 'S-C', sotpName: 'TOKO C',
      depotCode: '5C', depotName: '5C Cianjur', targetDnAwal: 100_000_000, qtyUndangan: 1,
    });
    await adjustTarget({ customerId: ids.customer, newTarget: 820_000_000, actorId: ids.actor }); // Form 1
    await adjustTarget({ customerId: ids.customer, newTarget: 900_000_000, actorId: ids.actor }); // Form 2
    await adjustTarget({ customerId: tokoB, newTarget: 100_000_000, actorId: ids.actor }); // Form 3
    const riwayat = await db.select().from(targetAdjustments)
      .where(eq(targetAdjustments.customerId, ids.customer)).orderBy(targetAdjustments.noFormulir);

    // Ditukar dan dinaikkan ke nomor manual.
    await ubahNoFormulir(ids.customer, [{ id: riwayat[0].id, noFormulir: 41 }, { id: riwayat[1].id, noFormulir: 40 }]);
    const sesudah = await db.select().from(targetAdjustments).where(eq(targetAdjustments.customerId, ids.customer));
    expect(Object.fromEntries(sesudah.map((row) => [row.jenis, row.noFormulir]))).toEqual({ verifikasi: 41, penyesuaian: 40 });
    expect(await noFormulirBerikut(ids.dealerNight)).toBe(42);

    // Nomor milik toko lain ditolak dengan nama tokonya.
    await expect(ubahNoFormulir(ids.customer, [{ id: riwayat[0].id, noFormulir: 3 }]))
      .rejects.toThrow('No. Formulir 3 sudah dipakai oleh TOKO C');
  });

  it('penyesuaian tanpa perubahan ditolak dan tidak memakai nomor formulir', async () => {
    await adjustTarget({ customerId: ids.customer, newTarget: 820_000_000, actorId: ids.actor });
    await expect(adjustTarget({ customerId: ids.customer, newTarget: 820_000_000, actorId: ids.actor }))
      .rejects.toMatchObject({ code: 'NO_CHANGE' });
    expect(await noFormulirBerikut(ids.dealerNight)).toBe(2);
  });

  it('simpan bersamaan tetap mendapat nomor formulir berbeda', async () => {
    await adjustTarget({ customerId: ids.customer, newTarget: 820_000_000, actorId: ids.actor });
    const hasil = await Promise.all([
      adjustTarget({ customerId: ids.customer, newTarget: 900_000_000, actorId: ids.actor }),
      adjustTarget({ customerId: ids.customer, newTarget: 850_000_000, actorId: ids.actor }),
    ]);
    expect(hasil.map((row) => row.noFormulir).sort()).toEqual([2, 3]);
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
