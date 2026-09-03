export type LeaderRow = {
  customerId: string;
  namaToko: string;
  depot: string | null;
  total: number;
  rank: number;
};

/** Rank customer yang login. null bila belum punya dus (di luar papan). */
export function posisiSaya(myTotal: number, jumlahDiAtas: number): number | null {
  return myTotal > 0 ? jumlahDiAtas + 1 : null;
}

export const TOP_N = 20;
