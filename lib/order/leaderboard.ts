export type LeaderRow = {
  customerId: string;
  namaToko: string;
  depot: string | null;
  total: number;
  rank: number;
  /** Kapan toko ini terakhir mencapai angkanya - pemecah seri peringkat. */
  terakhir: string | null;
  /**
   * Hanya dikirim ke sesi tim. kode_sap adalah kredensial login customer, jadi
   * papan peringkat tidak boleh membocorkannya antar toko - lihat pemangkasannya
   * di app/api/order/leaderboard/route.ts. Konsekuensinya, pencarian milik
   * customer otomatis terbatas pada nama toko dan depot saja.
   */
  kodeSap?: string;
  wilayah?: string | null;
  region?: string | null;
};

/**
 * Posisi sebuah toko, diambil dari papan peringkat yang sudah dihitung.
 *
 * Peringkatnya TIDAK dihitung ulang di sini: nomornya sudah final dari
 * row_number() di SQL, jadi baris "saya" mustahil menyebut angka yang berbeda
 * dari daftarnya. Toko tanpa dus tidak ada di papan - artinya total 0 dan belum
 * berperingkat.
 */
export function cariPosisi(
  papan: Pick<LeaderRow, 'customerId' | 'total' | 'rank' | 'terakhir'>[],
  customerId: string,
): { total: number; rank: number | null; terakhir: string | null } {
  const baris = papan.find((r) => r.customerId === customerId);
  return {
    total: baris?.total ?? 0,
    rank: baris?.rank ?? null,
    terakhir: baris?.terakhir ?? null,
  };
}

/**
 * Batas baris papan yang dikirim ke klien. Sengaja besar: baris "saya" harus
 * benar-benar ada di DOM supaya bilah melayang bisa menggulir ke posisinya,
 * sekalipun pesertanya ratusan.
 */
export const TOP_N = 500;
