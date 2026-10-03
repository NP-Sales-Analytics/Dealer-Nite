/**
 * Koreksi sekali pakai untuk waktu yang terlanjur tersimpan dengan jam WIB
 * server MySQL, sebelum sesi aplikasi dikunci ke UTC (lib/db/index.ts).
 * Waktu itu 7 jam terlalu maju: check-in 17.26 WIB tampil 00.26.
 *
 * Nilai lama (jam WIB) dan nilai baru (UTC) tidak bisa dibedakan dari isinya,
 * jadi koreksinya dua tahap:
 *   1. SEBELUM deploy perbaikan: semua baris digeser mundur, lalu penanda
 *      `koreksi-waktu-wib` dicatat di schema_migrations.
 *   2. SETELAH deploy (paling lambat 7 jam setelah tahap 1): hanya baris yang
 *      waktunya melewati jam UTC sekarang. Itu pasti tulisan jam WIB dari kode
 *      lama di sela tahap 1 dan deploy; nilai UTC tidak pernah di masa depan.
 *      Tahap ini aman diulang dan aman selagi ada input.
 * Tahap dipilih otomatis dari ada-tidaknya penanda. Tanpa --jalankan hanya pratinjau.
 *
 *   npx tsx --env-file=.env.loadtest scripts/koreksi-waktu-wib.ts [--jalankan]
 */
import { createConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';

const PENANDA = 'koreksi-waktu-wib';

// Kolom yang tampil di aplikasi dan diisi jam MySQL.
// ponytail: check-in yang ditimpa ulang (konfirmasi check-in kedua) memakai jam
// aplikasi dan sebenarnya sudah benar, tetapi tanpa kolom pembanding tidak bisa
// dibedakan, jadi ikut tergeser 7 jam lebih awal. Jarang; koreksi manual per toko.
const KOLOM = [
  ['Check-in kehadiran', 'reservations', 'checked_in_at', 'true'],
  ['Riwayat target', 'target_adjustments', 'created_at', 'true'],
  ['Verifikasi target', 'customers', 'verified_at', 'verified_at is not null'],
  ['Catatan kupon', 'kupon_proses', 'created_at', 'true'],
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL belum diset.');
  const jalankan = process.argv.includes('--jalankan');

  const db = await createConnection({ uri: url });
  try {
    // Diukur sebelum sesi diubah: selisih zona bawaan server terhadap UTC.
    const [[{ geser }]] = await db.query<RowDataPacket[]>('select timestampdiff(second, utc_timestamp(), now()) as geser');
    if (Number(geser) === 0) {
      console.log('Zona server sudah UTC, tidak ada yang perlu dikoreksi.');
      return;
    }
    await db.query("set time_zone = '+00:00'");
    const [penanda] = await db.query<RowDataPacket[]>('select 1 from schema_migrations where name = ?', [PENANDA]);
    const susulan = penanda.length > 0;
    console.log(susulan
      ? `Tahap 2 (susulan): hanya waktu yang melewati jam UTC sekarang, mundur ${geser / 3600} jam.`
      : `Tahap 1: SEMUA waktu mundur ${geser / 3600} jam. Jalankan SEBELUM perbaikan zona di-deploy.`);

    await db.beginTransaction();
    for (const [label, tabel, kolom, syarat] of KOLOM) {
      const where = susulan ? `${syarat} and ${kolom} > utc_timestamp(3)` : syarat;
      const [contoh] = await db.query<RowDataPacket[]>(`
        select count(*) over () as jumlah,
          date_format(${kolom} + interval ? second, '%d/%m %H:%i') as sekarang,
          date_format(${kolom}, '%d/%m %H:%i') as benar
        from ${tabel} where ${where} order by ${kolom} desc limit 3`, [geser]);
      const jumlah = Number(contoh[0]?.jumlah ?? 0);
      const sampel = contoh.map((row) => `${row.sekarang} -> ${row.benar}`).join(', ');
      console.log(`- ${label}: ${jumlah} baris${sampel ? ` (tampil WIB sekarang -> setelah koreksi: ${sampel})` : ''}`);
      if (jalankan && jumlah > 0) {
        const [hasil] = await db.query<ResultSetHeader>(
          `update ${tabel} set ${kolom} = ${kolom} - interval ? second where ${where}`, [geser]);
        console.log(`  diperbarui ${hasil.affectedRows} baris`);
      }
    }
    if (!jalankan) {
      await db.rollback();
      console.log('Pratinjau saja. Tambahkan --jalankan untuk menerapkan.');
      return;
    }
    if (!susulan) await db.query('insert into schema_migrations (name) values (?)', [PENANDA]);
    await db.commit();
    console.log(susulan ? 'Susulan selesai.' : 'Tahap 1 selesai. Deploy perbaikan, lalu jalankan skrip ini lagi untuk susulan.');
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
