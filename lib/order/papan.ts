import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { LeaderRow } from '@/lib/order/leaderboard';
import { ttlCache } from '@/lib/ttl-cache';

/** Baris papan apa adanya dari DB - belum dipangkas per sesi. */
export type BarisPapan = Required<LeaderRow>;

/**
 * Satu-satunya sumber peringkat, dipakai bersama oleh /api/order/leaderboard,
 * /api/order/me, dan /api/order/total.
 *
 * Kenapa harus di-cache: agregat GROUP BY atas seluruh ledger tidak bisa
 * memanfaatkan index (index customer_id tidak menolong agregat penuh), sedangkan
 * /leaderboard adalah halaman tujuan SETIAP customer setelah login. Tanpa cache,
 * ratusan pengunjung mengalikan satu query mahal menjadi ratusan query per detik
 * dan menjenuhkan pool yang dipakai bersama modul kehadiran.
 *
 * ttlCache dipakai LANGSUNG, bukan cacheDashboard: cacheDashboard mendaftarkan
 * diri ke daftar yang dibersihkan setiap pencatatan kehadiran, dan itu akan
 * membuang cache ini tanpa alasan. Bonusnya, ttlCache men-dedup permintaan
 * bersamaan saat cache dingin - jadi habisnya TTL tidak memicu badai.
 *
 * Sengaja TANPA LIMIT: daftar penuh membuat posisi tiap toko bisa diturunkan
 * lewat cariPosisi() tanpa query kedua. Jumlah barisnya dibatasi oleh isi tabel
 * customers (ratusan), bukan oleh jumlah order.
 */
export const papan = ttlCache(async () => {
  return (await db.execute(sql`
    with totals as (
      select customer_id,
             sum(qty_change)::int as total,
             max(created_at) as last_at
      from public.order_adjustments
      group by customer_id
      having sum(qty_change) > 0
    )
    select t.customer_id as "customerId", t.total,
           row_number() over (order by t.total desc, t.last_at asc)::int as rank,
           -- Waktu inilah pemecah seri di ORDER BY di atas, jadi ikut dikirim
           -- supaya papan bisa menjelaskan sendiri kenapa urutannya begitu.
           t.last_at as "terakhir",
           c.nama_toko as "namaToko", c.kode_sap as "kodeSap",
           c.wilayah, c.region, c.depot
    from totals t
    join public.customers c on c.id = t.customer_id
    order by rank asc
  `)) as unknown as BarisPapan[];
  // 2 detik. Sebelumnya 15, dengan alasan tiap instance Vercel punya cache
  // sendiri sehingga TTL pendek melipatgandakan query saat banyak instance
  // menyala. Alasan itu BERUBAH sejak fungsi pindah ke icn1, satu region dengan
  // database: query agregat ini tidak lagi membayar RTT lintas-region.
  //
  // Dan sekarang ada alasan tandingan yang lebih kuat: papan inilah yang
  // menentukan berapa lama perubahan sebuah toko terlihat di layar toko lain.
  // TTL 15 detik berarti device lain bisa tertinggal belasan detik walau sinyal
  // realtime-nya sudah sampai. Dedup in-flight ttlCache tetap menjaga tiap
  // instance hanya melakukan SATU query per 2 detik, berapa pun pembacanya.
}, 2_000);
