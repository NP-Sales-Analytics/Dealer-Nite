export type DepotRow = {
  depot: string;
  region: string | null;
  qtyUndangan: number;
  qtyHadir: number;
  tokoDiundang: number;
  tokoHadir: number;
};

export function attendanceRate(hadir: number, undangan: number): number {
  if (undangan <= 0) return 0;
  return Math.round((hadir / undangan) * 100);
}

export function sortDepots(rows: DepotRow[]): DepotRow[] {
  return [...rows].sort((a, b) => b.qtyHadir - a.qtyHadir || a.depot.localeCompare(b.depot));
}
