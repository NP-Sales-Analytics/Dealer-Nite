import { readFileSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import { parseCustomerCsv } from '../lib/csv/parse-customers';
import { db } from '../lib/db';
import { customers } from '../lib/db/schema';

async function main() {
  const rows = parseCustomerCsv(readFileSync('Data_Awal_Customer.csv', 'utf8'));
  const total = rows.reduce((s, r) => s + r.qtyUndangan, 0);
  console.log(`Menyisipkan ${rows.length} customer, total ${total} undangan...`);

  // Idempotent: seed boleh dijalankan ulang tanpa menggandakan data.
  await db
    .insert(customers)
    .values(rows)
    .onConflictDoUpdate({
      target: customers.kodeSap,
      set: {
        namaToko: sql`excluded.nama_toko`,
        depot: sql`excluded.depot`,
        wilayah: sql`excluded.wilayah`,
        region: sql`excluded.region`,
        picRsmAsm: sql`excluded.pic_rsm_asm`,
        namaPemilik: sql`excluded.nama_pemilik`,
        qtyUndangan: sql`excluded.qty_undangan`,
        updatedAt: sql`now()`,
      },
    });

  console.log('Selesai.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
