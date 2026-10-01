import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, mysqlPool } from '@/lib/db';
import { customers, dealerNights, profiles } from '@/lib/db/schema';
import { batalkanKupon, catatKupon, catatKuponMassal, listKupon, riwayatKupon } from '@/lib/kupon/service';
import { prosesKupon } from '@/lib/target/kupon';
import { adjustTarget } from '@/lib/target/service';

const ids = {
  dealerNight: '77777777-7777-4777-8777-777777777777',
  customer: '88888888-8888-4888-8888-888888888888',
  actor: '99999999-9999-4999-8999-999999999999',
};

async function resetFixture() {
  await db.delete(dealerNights).where(eq(dealerNights.id, ids.dealerNight));
  await db.delete(profiles).where(eq(profiles.id, ids.actor));
  await db.insert(dealerNights).values({ id: ids.dealerNight, slug: 'kupon-service-test', name: 'Kupon DN' });
  await db.insert(profiles).values({
    id: ids.actor, fullName: 'Admin Kupon', passwordHash: randomUUID().replaceAll('-', ''),
    role: 'admin', allowedPages: [], dealerNightIds: null, bolehUnduh: false,
  });
  await db.insert(customers).values({
    id: ids.customer, dealerNightId: ids.dealerNight, mgCode: 'MG-KUPON', mgName: 'TOKO KUPON',
    sotpCode: 'S', sotpName: 'TOKO KUPON', depotCode: '1S', depotName: '1S Bogor',
    targetDnAwal: 100_000_000, qtyUndangan: 1,
  });
}

const posisi = async () => {
  const [row] = await listKupon(ids.dealerNight);
  return prosesKupon({ verified: row.verified, target: row.targetEfektif, dibuat: row.dibuat, diberikan: row.diberikan });
};
const catat = (tahap: 'dibuat' | 'diberikan', pink: number, hijau: number) =>
  catatKupon({ customerId: ids.customer, tahap, pink, hijau, actorId: ids.actor });

describe('Proses kupon', () => {
  beforeEach(resetFixture);
  afterAll(async () => {
    await db.delete(dealerNights).where(eq(dealerNights.id, ids.dealerNight));
    await db.delete(profiles).where(eq(profiles.id, ids.actor));
    await mysqlPool.end();
  });

  it('menolak kupon sebelum target diverifikasi', async () => {
    await expect(catat('dibuat', 1, 4)).rejects.toThrow('belum diverifikasi');
  });

  it('membatasi pembuatan pada hak dan pemberian pada yang sudah dibuat', async () => {
    await adjustTarget({ customerId: ids.customer, newTarget: 100_000_000, actorId: ids.actor });
    await expect(catat('dibuat', 2, 4)).rejects.toThrow('Maksimal yang bisa dibuat');
    await catat('dibuat', 1, 2);
    await expect(catat('diberikan', 1, 3)).rejects.toThrow('Maksimal yang bisa diberikan');
    await catat('diberikan', 1, 2);
    expect(await posisi()).toMatchObject({ status: 'perlu_dibuat', perluDibuat: { pink: 0, hijau: 2 } });
  });

  it('penyesuaian setelah kupon diberikan memunculkan kekurangan', async () => {
    await adjustTarget({ customerId: ids.customer, newTarget: 100_000_000, actorId: ids.actor });
    await catat('dibuat', 1, 4);
    await catat('diberikan', 1, 4);
    expect((await posisi()).status).toBe('selesai');

    await adjustTarget({ customerId: ids.customer, newTarget: 250_000_000, actorId: ids.actor });
    expect(await posisi()).toMatchObject({ status: 'perlu_dibuat', perluDibuat: { pink: 1, hijau: 6 } });
  });

  it('memproses massal seluruh sisa dan melewati yang tidak punya sisa', async () => {
    await adjustTarget({ customerId: ids.customer, newTarget: 100_000_000, actorId: ids.actor });
    const hasil = await catatKuponMassal({ dealerNightId: ids.dealerNight, customerIds: [ids.customer], tahap: 'dibuat', actorId: ids.actor, bolehDepot: () => true });
    expect(hasil).toEqual({ diproses: 1, dilewati: 0 });
    expect((await posisi()).status).toBe('siap_diberikan');
    expect(await catatKuponMassal({ dealerNightId: ids.dealerNight, customerIds: [ids.customer], tahap: 'dibuat', actorId: ids.actor, bolehDepot: () => true }))
      .toEqual({ diproses: 0, dilewati: 1 });
  });

  it('tidak bisa membatalkan pembuatan yang kuponnya sudah diberikan', async () => {
    await adjustTarget({ customerId: ids.customer, newTarget: 100_000_000, actorId: ids.actor });
    await catat('dibuat', 1, 4);
    await catat('diberikan', 1, 4);
    const [diberikan, dibuat] = await riwayatKupon(ids.customer);
    expect(dibuat.tahap).toBe('dibuat');
    await expect(batalkanKupon(dibuat.id)).rejects.toThrow('Batalkan catatan pemberiannya dulu');
    await batalkanKupon(diberikan.id);
    await batalkanKupon(dibuat.id);
    expect((await posisi()).status).toBe('perlu_dibuat');
  });
});
