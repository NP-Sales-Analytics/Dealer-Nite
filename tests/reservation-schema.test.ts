import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, mysqlPool } from '@/lib/db';
import { customers, dealerNights, reservations } from '@/lib/db/schema';
import { reservationInputSchema, reservationPatchSchema } from '@/lib/validations/reservation';

const uuid = '9f1e4c2a-7b3d-4e5f-8a1b-2c3d4e5f6a7b';

describe('reservationInputSchema', () => {
  it('menerima check-in customer terdaftar', () => {
    const r = reservationInputSchema.safeParse({
      isManualEntry: false, customerId: uuid, qtyHadir: 3,
    });
    expect(r.success).toBe(true);
  });

  it('menerima qty 0 (tamu batal datang)', () => {
    const r = reservationInputSchema.safeParse({
      isManualEntry: false, customerId: uuid, qtyHadir: 0,
    });
    expect(r.success).toBe(true);
  });

  it('menolak qty negatif', () => {
    const r = reservationInputSchema.safeParse({
      isManualEntry: false, customerId: uuid, qtyHadir: -1,
    });
    expect(r.success).toBe(false);
  });

  it('menolak qty desimal', () => {
    const r = reservationInputSchema.safeParse({
      isManualEntry: false, customerId: uuid, qtyHadir: 1.5,
    });
    expect(r.success).toBe(false);
  });

  it('menolak customerId yang bukan uuid', () => {
    const r = reservationInputSchema.safeParse({
      isManualEntry: false, customerId: 'abc', qtyHadir: 1,
    });
    expect(r.success).toBe(false);
  });

  it('menerima manual entry lengkap', () => {
    const r = reservationInputSchema.safeParse({
      isManualEntry: true, manualNamaCustomer: 'CV Tamu Baru', manualDepot: '1A Jakarta', qtyHadir: 2,
    });
    expect(r.success).toBe(true);
  });

  it('menolak manual entry tanpa nama customer', () => {
    const r = reservationInputSchema.safeParse({
      isManualEntry: true, manualDepot: '1A Jakarta', qtyHadir: 2,
    });
    expect(r.success).toBe(false);
  });

  it('menolak manual entry yang menyelundupkan customerId', () => {
    const r = reservationInputSchema.safeParse({
      isManualEntry: true, customerId: uuid, manualNamaCustomer: 'X', manualDepot: 'Y', qtyHadir: 1,
    });
    expect(r.success).toBe(false);
  });
});

describe('reservationPatchSchema', () => {
  it('hanya menerima perubahan jumlah pax', () => {
    expect(reservationPatchSchema.safeParse({ qtyHadir: 5 }).success).toBe(true);
  });

  it('menolak perubahan depot meskipun jumlah pax valid', () => {
    expect(reservationPatchSchema.safeParse({
      qtyHadir: 5,
      depotOverride: 'Depot Lain',
    }).success).toBe(false);
  });

  it('menolak patch kosong', () => {
    expect(reservationPatchSchema.safeParse({}).success).toBe(false);
  });
});

describe('MySQL reservation constraints', () => {
  const dealerNightId = '55555555-5555-4555-8555-555555555555';
  const customerId = '66666666-6666-4666-8666-666666666666';

  afterAll(async () => {
    await db.delete(dealerNights).where(eq(dealerNights.id, dealerNightId));
    await mysqlPool.end();
  });

  it('allows multiple manual reservations but one reservation per customer', async () => {
    await db.delete(dealerNights).where(eq(dealerNights.id, dealerNightId));
    await db.insert(dealerNights).values({ id: dealerNightId, slug: 'reservation-test', name: 'Reservation Test' });
    await db.insert(customers).values({
      id: customerId,
      dealerNightId,
      mgCode: 'MG-RES',
      mgName: 'TOKO RESERVASI',
      sotpCode: 'SOTP-RES',
      sotpName: 'TOKO RESERVASI',
      depotCode: '1S',
      depotName: '1S Bogor',
      targetDnAwal: 50_000_000,
      qtyUndangan: 1,
    });

    await db.insert(reservations).values([
      { id: randomUUID(), dealerNightId, isManualEntry: true, manualNamaCustomer: 'Tamu A', manualDepot: '1S Bogor', qtyHadir: 1 },
      { id: randomUUID(), dealerNightId, isManualEntry: true, manualNamaCustomer: 'Tamu B', manualDepot: '1S Bogor', qtyHadir: 1 },
    ]);
    await db.insert(reservations).values({ id: randomUUID(), dealerNightId, customerId, isManualEntry: false, qtyHadir: 1 });

    await expect(db.insert(reservations).values({
      id: randomUUID(), dealerNightId, customerId, isManualEntry: false, qtyHadir: 1,
    })).rejects.toMatchObject({ cause: { code: 'ER_DUP_ENTRY' } });
  });
});
