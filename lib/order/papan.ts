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
           c.nama_toko as "namaToko", c.kode_sap as "kodeSap",
           c.wilayah, c.region, c.depot
    from totals t
    join public.customers c on c.id = t.customer_id
    order by rank asc
  `)) as unknown as BarisPapan[];
}, 5_000);
