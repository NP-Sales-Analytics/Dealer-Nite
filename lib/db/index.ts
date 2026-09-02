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
// idle_timeout menutup koneksi nganggur lebih dulu, karena Supavisor memutus
// koneksi diam-diam dan socket mati akan dipakai lagi tanpa ini.
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  max: 3,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
