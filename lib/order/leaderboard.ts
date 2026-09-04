export type LeaderRow = {
  customerId: string;
  namaToko: string;
  depot: string | null;
  total: number;
  rank: number;
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

/** Rank customer yang login. null bila belum punya dus (di luar papan). */
export function posisiSaya(myTotal: number, jumlahDiAtas: number): number | null {
  return myTotal > 0 ? jumlahDiAtas + 1 : null;
}

/**
 * Batas baris papan. Sengaja besar: baris "saya" harus benar-benar ada di DOM
 * supaya bilah melayang bisa menggulir ke posisinya, sekalipun pesertanya ratusan.
 */
export const TOP_N = 500;
