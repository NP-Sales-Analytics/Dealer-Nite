import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// prepare:false wajib untuk Supavisor transaction mode.
//
// max:1 sengaja TIDAK dipakai: dengan satu koneksi, satu query yang tersendat
// membuat semua request berikutnya antre di belakangnya dan aplikasi beku total
// sampai proses di-restart. Terbukti terjadi saat pengujian - DB sehat, tapi
// server tidak melayani satu pun rute ber-DB.
//
// max:3 (nilai sebelumnya) ternyata masih terlalu kecil untuk beban tulis
// bersamaan: uji beban 150 VU ke /api/order/adjust menunjukkan p95 11,6 detik
// tanpa satu pun error - bukan query lambat (jauh di bawah statement_timeout),
// melainkan request mengantre menunggu salah satu dari 3 koneksi kosong.
// Supavisor (transaction pooler Supabase) memang dirancang untuk memultipleks
// banyak koneksi sisi-app ke sedikit koneksi backend, jadi menaikkannya aman
// selama tidak melampaui pool sisi Supavisor sendiri.
//
// KOREKSI: pool dinaikkan lagi ke 20 saat uji beban 250 VU menunjukkan p95
// 615ms, dengan dugaan penyebabnya sama seperti kenaikan 3->10 dulu. Dugaan itu
// SALAH - instrumentasi Server-Timing membuktikannya: transaksi lengkap (lock +
// select + insert + update) hanya makan ~43ms rata-rata bahkan di bawah 60
// request bersamaan. Pool bukan lagi titik sempitnya; penyebab sesungguhnya
// ada di lib/rate-limit.ts (Redis Upstash di region berbeda, bukan Postgres).
// 20 tetap dipertahankan - tidak salah, hanya tidak relevan untuk temuan itu -
// karena menaikkannya tidak berbahaya dan memberi headroom untuk skenario lain.
//
// ponytail: 20 dipilih dari uji coba, bukan angka pasti dari dashboard Supabase
// (tidak bisa dicek dari sini). Kalau produksi mulai menunjukkan error koneksi
// ("too many clients"/"MaxClientsInSessionMode") saat banyak instance Vercel
// aktif bersamaan, turunkan lagi - itu tandanya batas Supavisor sudah tercapai.
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  // Saat DB jenuh, lebih baik gagal bersih dan MELEPAS koneksi daripada
  // menggantung sampai fungsi Vercel time out - request yang menggantung
  // menahan koneksi dan memperparah kemacetan.
  connection: { statement_timeout: 5_000 },
});

export const db = drizzle(client, { schema });
