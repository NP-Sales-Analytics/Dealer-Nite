import type { KonfigKupon } from '@/lib/target/kupon';

export type DealerNightOption = {
  id: string;
  name: string;
  targetDn?: number;
  eventDate?: string | null;
  kupon?: KonfigKupon;
  depots?: { kode: string; depot: string }[];
};

export type TargetRow = {
  customerId: string;
  dealerNightId: string;
  mgCode: string;
  mgName: string;
  sotpCode: string;
  sotpName: string;
  depotCode: string;
  depotName: string;
  wilayah: string | null;
  region: string | null;
  salesman: string | null;
  spv: string | null;
  targetAwal: number;
  targetEfektif: number;
  delta: number;
  jumlahPenyesuaian: number;
  lastAdjustedAt: string | null;
  verifiedAt: string | null;
  verifiedByName: string | null;
  targetVerifikasi: number | null;
  formVerifikasi: number | null;
  formTerakhir: number | null;
  qtyHadir: number | null;
  /** Pax terdaftar dari master; null = belum didata. */
  paxTerdaftar: number | null;
  nomorUndian: string | null;
  checkedInAt: string | null;
  rank?: number;
};

export type TargetResponse = { dealerNightId: string; rows: TargetRow[] };
