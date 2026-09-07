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
// ponytail: 10 dipilih dari uji coba, bukan angka pasti dari dashboard Supabase
// (tidak bisa dicek dari sini). Kalau produksi mulai menunjukkan error koneksi
// ("too many clients"/"MaxClientsInSessionMode") saat banyak instance Vercel
// aktif bersamaan, turunkan lagi - itu tandanya batas Supavisor sudah tercapai.
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // Saat DB jenuh, lebih baik gagal bersih dan MELEPAS koneksi daripada
  // menggantung sampai fungsi Vercel time out - request yang menggantung
  // menahan koneksi dan memperparah kemacetan.
  connection: { statement_timeout: 5_000 },
});

export const db = drizzle(client, { schema });
