import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { MAKS_PAX, type DealerNightMasterRow } from '@/lib/csv/parse-dealer-night';
import { depotPerKode } from '@/lib/dashboard/hierarchy';
import { db } from '@/lib/db';
import { customers, dealerNights } from '@/lib/db/schema';
import { depotSatuDn } from '@/lib/target/dealer-night-options';
import { BATAS_BAWAH_TARGET, pesanTargetMinimal } from '@/lib/target/rules';

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
  // Minimal per DN dicek di createMaster/updateMaster; di sini batas bawah global.
  targetDnAwal: z.number().int('Target DN harus bilangan bulat rupiah.').safe()
    .min(BATAS_BAWAH_TARGET, pesanTargetMinimal(BATAS_BAWAH_TARGET)),
  // Pax terdaftar; null/kosong = belum didata.
  qtyUndangan: z.number().int('Pax harus bilangan bulat.').min(1, 'Pax minimal 1.')
    .max(MAKS_PAX, `Pax maksimal ${MAKS_PAX}.`).nullable().default(null),
  // No. Undian dari master; kosong = belum didata.
  noUndian: z.string().trim().regex(/^\d{0,20}$/, 'No Undian harus berupa angka (maksimal 20 digit).')
    .nullable().default(null).transform((value) => value || null),
}).strict();

export type MasterInput = z.infer<typeof masterInputSchema>;

const isDup = (error: unknown) =>
  (error as { cause?: { code?: string } }).cause?.code === 'ER_DUP_ENTRY';

/** Pesan bentrok unik: MG Code atau No Undian, dilihat dari nama indeksnya. */
function pesanDup(error: unknown, input: { mgCode: string; noUndian: string | null }) {
  const pesan = (error as { cause?: { sqlMessage?: string } }).cause?.sqlMessage ?? '';
  return pesan.includes('customers_dn_undian_unique')
    ? `No Undian ${input.noUndian} sudah dipakai toko lain di Dealer Night ini.`
    : `MG Code ${input.mgCode} sudah terdaftar di Dealer Night ini.`;
}

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

export async function minTargetDn(dealerNightId: string): Promise<number> {
  const [row] = await db.select({ min: dealerNights.minTargetDn }).from(dealerNights)
    .where(eq(dealerNights.id, dealerNightId)).limit(1);
  if (!row) throw new MasterError('Dealer Night tidak ditemukan.', 404);
  return row.min;
}

async function cekTargetMinimal(dealerNightId: string, target: number) {
  const min = await minTargetDn(dealerNightId);
  if (target < min) throw new MasterError(pesanTargetMinimal(min));
}

export async function createMaster(input: MasterInput) {
  await cekTargetMinimal(input.dealerNightId, input.targetDnAwal);
  const depot = await depotDn(input.dealerNightId, input.depotCode);
  try {
    await db.insert(customers).values({ id: randomUUID(), ...input, ...depot });
  } catch (error) {
    if (isDup(error)) throw new MasterError(pesanDup(error, input), 409);
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
  // Target lama yang tidak diubah tetap sah walau minimal DN kemudian dinaikkan.
  if (existing.targetDnAwal !== input.targetDnAwal) await cekTargetMinimal(input.dealerNightId, input.targetDnAwal);
  const depot = await depotDn(input.dealerNightId, input.depotCode);
  try {
    await db.update(customers).set({ ...input, ...depot, updatedAt: new Date() }).where(eq(customers.id, id));
  } catch (error) {
    if (isDup(error)) throw new MasterError(pesanDup(error, input), 409);
    throw error;
  }
}

export async function deleteMaster(id: string) {
  await db.delete(customers).where(eq(customers.id, id));
}

/**
 * Upload massal: semua atau tidak sama sekali. MG Code yang sudah ada
 * diperbarui, kecuali toko yang targetnya sudah diverifikasi admin DN -
 * data itu dilewati supaya verifikasi tidak tertimpa data pusat. Pax dan
 * No Undian tetap diperbarui untuk toko terverifikasi karena bukan bagian target.
 */
export async function importMaster(dealerNightId: string, rows: DealerNightMasterRow[]) {
  const milikDn = new Set((await depotSatuDn(dealerNightId)).map((item) => item.kode));
  const salah = rows.find((row) => !milikDn.has(row.depotCode));
  if (salah) {
    throw new MasterError(`MG Code ${salah.mgCode}: depot ${salah.depotName} bukan bagian Dealer Night ini.`);
  }
  const min = await minTargetDn(dealerNightId);
  const kecil = rows.find((row) => row.targetDnAwal < min);
  if (kecil) throw new MasterError(`MG Code ${kecil.mgCode}: ${pesanTargetMinimal(min)}`);

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: customers.id, mgCode: customers.mgCode, mgName: customers.mgName, noUndian: customers.noUndian, verifiedAt: customers.verifiedAt })
      .from(customers)
      .where(eq(customers.dealerNightId, dealerNightId));
    const byMg = new Map(existing.map((row) => [row.mgCode, row]));

    // No Undian unik per DN. Toko yang ada di file boleh saling bertukar nomor,
    // jadi yang dicek hanya bentrok dengan toko yang TIDAK ada di file.
    const diFile = new Set(rows.map((row) => row.mgCode));
    const undianLain = new Map(existing.filter((row) => row.noUndian && !diFile.has(row.mgCode))
      .map((row) => [row.noUndian!, row]));
    const bentrok = rows.find((row) => row.noUndian && undianLain.has(row.noUndian));
    if (bentrok) {
      const pemilik = undianLain.get(bentrok.noUndian!)!;
      throw new MasterError(`MG Code ${bentrok.mgCode}: No Undian ${bentrok.noUndian} sudah dipakai ${pemilik.mgName} (${pemilik.mgCode}).`);
    }
    // Kosongkan dulu nomor toko di file supaya pertukaran nomor antartoko tidak
    // tersandung indeks unik di tengah jalan.
    const tukar = rows.filter((row) => row.noUndian !== undefined).map((row) => row.mgCode);
    if (tukar.length > 0) {
      await tx.update(customers).set({ noUndian: null })
        .where(and(eq(customers.dealerNightId, dealerNightId), inArray(customers.mgCode, tukar)));
    }
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
        // Tanpa kolom Pax di file, pax yang sudah didata tidak disentuh.
        ...(row.qtyUndangan === undefined ? {} : { qtyUndangan: row.qtyUndangan }),
        ...(row.noUndian === undefined ? {} : { noUndian: row.noUndian }),
      };
      const lama = byMg.get(row.mgCode);
      if (!lama) {
        await tx.insert(customers).values({ id: randomUUID(), ...values });
        baru += 1;
      } else if (lama.verifiedAt) {
        // Pax & No Undian bukan bagian target, jadi tetap diperbarui.
        const lain = {
          ...(row.qtyUndangan === undefined ? {} : { qtyUndangan: row.qtyUndangan }),
          ...(row.noUndian === undefined ? {} : { noUndian: row.noUndian }),
        };
        if (Object.keys(lain).length > 0) {
          await tx.update(customers).set({ ...lain, updatedAt: new Date() })
            .where(and(eq(customers.id, lama.id), eq(customers.dealerNightId, dealerNightId)));
        }
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
