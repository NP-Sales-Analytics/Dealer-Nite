export type Summary = {
  targetPax: number;
  totalHadir: number;
  totalToko: number;
  tokoCheckin: number;
  manualEntry: number;
  persentase: number;
};

export type AttendanceRow = {
  id: string;
  nama: string;
  depot: string;
  kodeSap: string | null;
  region: string | null;
  wilayah: string | null;
  qtyHadir: number;
  /** Pax terdaftar di master; null untuk tamu manual / belum didata. */
  paxTerdaftar: number | null;
  nomorUndian: string | null;
  checkedInAt: string;
  isManualEntry: boolean;
  depotDiubah: boolean;
  dicatatOleh?: string | null;
};

export type AttendanceResponse = {
  rows: AttendanceRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
