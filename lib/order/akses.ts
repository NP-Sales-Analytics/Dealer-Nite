import { daftarRegion } from '@/lib/access';
import { infoCustomer, type SessionUser } from '@/lib/auth';

/**
 * Daftar region yang mengunci seorang user. Kosong berarti ia melihat semua
 * toko - dipilih daripada null supaya pemanggil bisa langsung menyodorkannya
 * ke cocokSalahSatu() di lib/dashboard/filters.ts tanpa pengecekan tambahan.
 *
 * Hanya RSM yang punya cakupan region (data_scope), dan seorang RSM boleh
 * merangkap lebih dari satu (lihat daftarRegion). Superadmin, Admin RSVP, dan
 * Marketing melihat seluruh toko - sama dengan aturan terapkanScope di
 * lib/dashboard/filters.ts.
 */
export const lingkupRegion = (user: SessionUser): string[] =>
  user.role === 'rsm' ? daftarRegion(user.dataScope) : [];

/**
 * Bolehkah user tim menyentuh order sebuah toko.
 *
 * PENTING - ini HANYA berlaku untuk mencatat order (cari toko, lihat totalnya,
 * simpan penambahan). Papan Top Spender sengaja TIDAK dibatasi: semua peran tim,
 * termasuk RSM, tetap melihat seluruh toko di sana. Jadi RSM 3A hanya bisa
 * menambah order untuk toko 3A (atau region-region rangkapannya), tapi tetap
 * bisa melihat peringkat semua toko.
 */
export async function bolehUbahOrder(user: SessionUser, customerId: string): Promise<boolean> {
  const regions = lingkupRegion(user);
  if (regions.length === 0) return true;
  const info = await infoCustomer(customerId);
  return !!info?.region && regions.includes(info.region);
}

/**
 * Balasan seragam saat toko berada di luar cakupan region user.
 * Kalimatnya tinggal di lib/order/aturan.ts bersama pesan aturan lain supaya
 * klien bisa membacanya tanpa ikut menarik lib/auth ke dalam bundel.
 */
export { PESAN_LUAR_REGION } from '@/lib/order/aturan';
