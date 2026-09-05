import { infoCustomer, type SessionUser } from '@/lib/auth';

/**
 * Region yang mengunci seorang user, atau null bila ia melihat semua toko.
 *
 * Hanya RSM yang punya cakupan region (data_scope). Superadmin, Admin RSVP, dan
 * Marketing melihat seluruh toko - sama dengan aturan terapkanScope di
 * lib/dashboard/filters.ts.
 */
export const lingkupRegion = (user: SessionUser): string | null =>
  user.role === 'rsm' ? user.dataScope : null;

/**
 * Bolehkah user tim menyentuh order sebuah toko.
 *
 * PENTING - ini HANYA berlaku untuk mencatat order (cari toko, lihat totalnya,
 * simpan penambahan). Papan Top Spender sengaja TIDAK dibatasi: semua peran tim,
 * termasuk RSM, tetap melihat seluruh toko di sana. Jadi RSM 3A hanya bisa
 * menambah order untuk toko 3A, tapi tetap bisa melihat peringkat semua toko.
 */
export async function bolehUbahOrder(user: SessionUser, customerId: string): Promise<boolean> {
  const region = lingkupRegion(user);
  if (!region) return true;
  const info = await infoCustomer(customerId);
  return info?.region === region;
}

/** Balasan seragam saat toko berada di luar cakupan region user. */
export const PESAN_LUAR_REGION = 'Toko ini di luar region Anda.';
