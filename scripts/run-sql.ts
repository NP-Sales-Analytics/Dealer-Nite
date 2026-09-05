import { readFileSync } from 'node:fs';
import postgres from 'postgres';

/**
 * Menjalankan satu berkas SQL ke database.
 *
 *   npm run sql supabase/migrations/0007_detail_order.sql
 *
 * Dipakai untuk menerapkan migrasi tanpa Supabase CLI. sql.unsafe() memakai
 * simple query protocol, jadi berkas berisi banyak statement sekaligus jalan.
 */
async function main() {
  const berkas = process.argv[2];
  if (!berkas) throw new Error('Pemakaian: npm run sql <berkas.sql>');

  const isi = readFileSync(berkas, 'utf8');
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  try {
    await sql.unsafe(isi);
    console.log(`OK: ${berkas}`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
