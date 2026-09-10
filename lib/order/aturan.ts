/** Alasan sebuah penambahan ditolak. null berarti boleh disimpan. */
export type Tolakan = 'TENGGAT_HABIS' | 'NEGATIVE' | 'DI_BAWAH_AWAL' | 'SEKALI_TERLALU_BANYAK' | null;

/**
 * Batas SATU KALI penambahan, bukan batas total.
 *
 * Sebuah toko boleh saja mencapai 50.000 dus - tidak ada plafon di sana. Yang
 * dibatasi hanyalah lompatan dalam sekali simpan, dan alasannya salah ketik:
 * satu nol kelebihan mengubah 1.500 jadi 15.000, dan di ledger yang bersifat
 * tambah-terus koreksinya jauh lebih repot daripada mencegahnya. Yang butuh
 * lebih tinggal menyimpan beberapa kali.
 */
export const MAKS_SEKALI = 10_000;

/**
 * Satu-satunya tempat aturan penambahan order diputuskan, dipakai server
 * (/api/order/adjust) sebagai gerbang dan klien sebagai penjelasan.
 *
 * Urutannya disengaja: tenggat diperiksa lebih dulu karena ia mengunci semuanya,
 * baru batas bawah. dusAwal adalah pengambilan pertama yang tercatat - begitu
 * ada, angka tidak boleh turun di bawahnya lagi (lihat 0007_detail_order.sql).
 *
 * selisih hanya diperiksa bila diberikan. Koreksi admin lewat Detail Order
 * menetapkan total secara absolut dan SENGAJA tidak tunduk pada MAKS_SEKALI -
 * batas itu untuk mencegah salah ketik saat menambah, bukan untuk membatasi
 * otoritas admin yang sedang membetulkan angka.
 */
export function periksaPenambahan({
  totalBaru,
  dusAwal,
  tenggat,
  selisih,
  sekarang = Date.now(),
}: {
  totalBaru: number;
  dusAwal: number | null;
  tenggat: string | null;
  /** Lompatan sekali simpan. Diisi hanya oleh jalur penambahan. */
  selisih?: number;
  sekarang?: number;
}): Tolakan {
  if (tenggat && Date.parse(tenggat) <= sekarang) return 'TENGGAT_HABIS';
  if (totalBaru < 0) return 'NEGATIVE';
  if (dusAwal !== null && totalBaru < dusAwal) return 'DI_BAWAH_AWAL';
  if (selisih !== undefined && Math.abs(selisih) > MAKS_SEKALI) return 'SEKALI_TERLALU_BANYAK';
  return null;
}

/** Pesan siap tampil untuk tiap penolakan. */
export const PESAN_TOLAKAN: Record<NonNullable<Tolakan>, string> = {
  TENGGAT_HABIS: 'Waktu penambahan sudah habis.',
  NEGATIVE: 'Total tidak boleh kurang dari 0.',
  DI_BAWAH_AWAL: 'Tidak boleh kurang dari pengambilan pertama.',
  SEKALI_TERLALU_BANYAK: `Sekali simpan maksimal ${MAKS_SEKALI.toLocaleString('id-ID')} dus. Silakan simpan bertahap.`,
};
