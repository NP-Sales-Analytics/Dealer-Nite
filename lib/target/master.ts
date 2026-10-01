import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { DealerNightMasterRow } from '@/lib/csv/parse-dealer-night';
import { depotPerKode } from '@/lib/dashboard/hierarchy';
import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { depotSatuDn } from '@/lib/target/dealer-night-options';
import { MIN_TARGET_DN } from '@/lib/target/rules';

export class MasterError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = 'MasterError';
  }
}

const teks = (max: number) => z.string().trim().min(1).max(max);
const opsional = z.string().trim().max(200).optional().transform((value) => value || null);

export const masterInputSchema = z.object({
  dealerNightId: teks(36),
  mgCode: teks(32),
  mgName: teks(200).transform((value) => value.toUpperCase()),
  sotpCode: teks(32),
  sotpName: teks(200).transform((value) => value.toUpperCase()),
  depotCode: teks(20),
  salesman: opsional,
  spv: opsional,
  targetDnAwal: z.number().int('Target DN harus bilangan bulat rupiah.').safe()
    .min(MIN_TARGET_DN, 'Target DN minimal Rp50.000.000.'),
}).strict();

export type MasterInput = z.infer<typeof masterInputSchema>;

const isDup = (error: unknown) =>
  (error as { cause?: { code?: string } }).cause?.code === 'ER_DUP_ENTRY';

/** Depot wajib termasuk DN tujuan, supaya toko tidak nyasar ke acara lain. */
async function depotDn(dealerNightId: string, depotCode: string) {
  const milikDn = await depotSatuDn(dealerNightId);
  const depot = milikDn.find((item) => item.kode === depotCode);
  if (!depot) {
    const daftar = milikDn.map((item) => item.depot).join(', ') || '-';
    throw new MasterError(`Depot ${depotCode} bukan bagian Dealer Night ini. Depot yang sah: ${daftar}.`);
  }
  const induk = depotPerKode().get(depotCode);
  return { depotName: depot.depot, wilayah: induk?.wilayah || null, region: induk?.region || null };
}

export async function createMaster(input: MasterInput) {
  const depot = await depotDn(input.dealerNightId, input.depotCode);
  try {
    await db.insert(customers).values({ id: randomUUID(), ...input, ...depot, qtyUndangan: 1 });
  } catch (error) {
    if (isDup(error)) throw new MasterError(`MG Code ${input.mgCode} sudah terdaftar di Dealer Night ini.`, 409);
    throw error;
  }
}

export async function getMaster(id: string) {
  const [row] = await db.select({
    id: customers.id,
    dealerNightId: customers.dealerNightId,
    depotCode: customers.depotCode,
    targetDnAwal: customers.targetDnAwal,
    verifiedAt: customers.verifiedAt,
  }).from(customers).where(eq(customers.id, id)).limit(1);
  return row ?? null;
}

export async function updateMaster(id: string, input: MasterInput) {
  const existing = await getMaster(id);
  if (!existing) throw new MasterError('Toko tidak ditemukan.', 404);
  if (existing.dealerNightId !== input.dealerNightId) throw new MasterError('Dealer Night toko tidak bisa dipindah.');
  if (existing.verifiedAt && existing.targetDnAwal !== input.targetDnAwal) {
    throw new MasterError('Target awal tidak bisa diubah setelah diverifikasi. Gunakan Sesuaikan Target.');
  }
  const depot = await depotDn(input.dealerNightId, input.depotCode);
  try {
    await db.update(customers).set({ ...input, ...depot, updatedAt: new Date() }).where(eq(customers.id, id));
  } catch (error) {
    if (isDup(error)) throw new MasterError(`MG Code ${input.mgCode} sudah terdaftar di Dealer Night ini.`, 409);
    throw error;
  }
}

export async function deleteMaster(id: string) {
  await db.delete(customers).where(eq(customers.id, id));
}

/**
 * Upload massal: semua atau tidak sama sekali. MG Code yang sudah ada
 * diperbarui, kecuali toko yang targetnya sudah diverifikasi admin DN -
 * data itu dilewati supaya verifikasi tidak tertimpa data pusat.
 */
export async function importMaster(dealerNightId: string, rows: DealerNightMasterRow[]) {
  const milikDn = new Set((await depotSatuDn(dealerNightId)).map((item) => item.kode));
  const salah = rows.find((row) => !milikDn.has(row.depotCode));
  if (salah) {
    throw new MasterError(`MG Code ${salah.mgCode}: depot ${salah.depotName} bukan bagian Dealer Night ini.`);
  }

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: customers.id, mgCode: customers.mgCode, verifiedAt: customers.verifiedAt })
      .from(customers)
      .where(eq(customers.dealerNightId, dealerNightId));
    const byMg = new Map(existing.map((row) => [row.mgCode, row]));
    let baru = 0;
    let diperbarui = 0;
    let dilewati = 0;

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
        qtyUndangan: 1,
      };
      const lama = byMg.get(row.mgCode);
      if (!lama) {
        await tx.insert(customers).values({ id: randomUUID(), ...values });
        baru += 1;
      } else if (lama.verifiedAt) {
        dilewati += 1;
      } else {
        await tx.update(customers).set({ ...values, updatedAt: new Date() })
          .where(and(eq(customers.id, lama.id), eq(customers.dealerNightId, dealerNightId)));
        diperbarui += 1;
      }
    }
    return { baru, diperbarui, dilewati };
  });
}
