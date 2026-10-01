export type DepotRow = {
  depot: string;
  region: string | null;
  qtyHadir: number;
  tokoDiundang: number;
  tokoHadir: number;
};

export function attendanceRate(hadir: number, undangan: number): number {
  if (undangan <= 0) return 0;
  return Math.round((hadir / undangan) * 100);
}

// Diurutkan menurut jumlah TOKO yang hadir, bukan pax: satu toko bisa membawa
// banyak orang, sehingga urutan berbasis pax menonjolkan depot dengan sedikit
// toko tapi rombongan besar.
export function sortDepots(rows: DepotRow[]): DepotRow[] {
  return [...rows].sort(
    (a, b) => b.tokoHadir - a.tokoHadir || b.qtyHadir - a.qtyHadir || a.depot.localeCompare(b.depot),
  );
}
