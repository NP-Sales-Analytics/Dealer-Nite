/** Alasan sebuah penambahan ditolak. null berarti boleh disimpan. */
export type Tolakan = 'TENGGAT_HABIS' | 'NEGATIVE' | 'DI_BAWAH_AWAL' | null;

/**
 * Satu-satunya tempat aturan penambahan order diputuskan, dipakai server
 * (/api/order/adjust) sebagai gerbang dan klien sebagai penjelasan.
 *
 * Urutannya disengaja: tenggat diperiksa lebih dulu karena ia mengunci semuanya,
 * baru batas bawah. dusAwal adalah pengambilan pertama yang tercatat - begitu
 * ada, angka tidak boleh turun di bawahnya lagi (lihat 0007_detail_order.sql).
 */
export function periksaPenambahan({
  totalBaru,
  dusAwal,
  tenggat,
  sekarang = Date.now(),
}: {
  totalBaru: number;
  dusAwal: number | null;
  tenggat: string | null;
  sekarang?: number;
}): Tolakan {
  if (tenggat && Date.parse(tenggat) <= sekarang) return 'TENGGAT_HABIS';
  if (totalBaru < 0) return 'NEGATIVE';
  if (dusAwal !== null && totalBaru < dusAwal) return 'DI_BAWAH_AWAL';
  return null;
}

/** Pesan siap tampil untuk tiap penolakan. */
export const PESAN_TOLAKAN: Record<NonNullable<Tolakan>, string> = {
  TENGGAT_HABIS: 'Waktu penambahan sudah habis.',
  NEGATIVE: 'Total tidak boleh kurang dari 0.',
  DI_BAWAH_AWAL: 'Tidak boleh kurang dari pengambilan pertama.',
};
