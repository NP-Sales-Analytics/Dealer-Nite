import { asc, eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { customers, orderAdjustments } from '../lib/db/schema';

/**
 * Data sampel order untuk menguji papan Top Spender pada skala nyata.
 *
 *   npm run seed:orders        -> 100 toko
 *   npm run seed:orders 250    -> 250 toko
 *   npm run seed:orders 0      -> hapus sampel saja
 *
 * Semua baris ditandai note='sample' dan dihapus lebih dulu tiap kali dijalankan,
 * jadi aman diulang dan tidak menyentuh order asli (note-nya null).
 */
const CATATAN = 'sample';
const JUMLAH = Number(process.argv[2] ?? 100);

const acak = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  const dihapus = await db.delete(orderAdjustments).where(eq(orderAdjustments.note, CATATAN));
  console.log(`Sampel lama dihapus (${dihapus.count ?? 0} baris).`);

  if (!Number.isFinite(JUMLAH) || JUMLAH <= 0) {
    console.log('Selesai: mode bersih-bersih saja.');
    return;
  }

  const toko = await db
    .select({ id: customers.id })
    .from(customers)
    .orderBy(asc(customers.kodeSap))
    .limit(JUMLAH);

  if (toko.length === 0) throw new Error('Tabel customers kosong - jalankan npm run seed dulu.');

  const baris: typeof orderAdjustments.$inferInsert[] = [];
  const mulai = Date.now() - 6 * 3600_000; // sebar 6 jam ke belakang

  for (const t of toko) {
    // Kelipatan 5 supaya banyak angka kembar - justru itu yang menguji tie-break
    // waktu di papan peringkat.
    const total = acak(1, 40) * 5;
    const cicilan = acak(1, 3);
    let sisa = total;

    for (let i = 0; i < cicilan; i++) {
      const bagian = i === cicilan - 1 ? sisa : Math.max(1, Math.round(sisa / (cicilan - i)));
      sisa -= bagian;
      baris.push({
        customerId: t.id,
        qtyChange: bagian,
        note: CATATAN,
        createdAt: new Date(mulai + acak(0, 6 * 3600_000)),
      });
    }
  }

  await db.insert(orderAdjustments).values(baris);
  console.log(`${baris.length} baris sampel dibuat untuk ${toko.length} toko.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
