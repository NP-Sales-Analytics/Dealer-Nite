import type { KonfigKupon } from '@/lib/target/kupon';

export type DealerNightOption = {
  id: string;
  name: string;
  targetDn?: number;
  /** Target DN minimal per toko di DN ini. */
  minTargetDn?: number;
  eventDate?: string | null;
  /** DN tampilan awal pilihan Super Admin. */
  bawaan?: boolean;
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
  /** No. Undian dari master; null = belum didata. */
  undianMaster: string | null;
  nomorUndian: string | null;
  checkedInAt: string | null;
  /** Semua Sold To Party MG ini; [0] = SOTP utama. */
  sotp: { kode: string; nama: string }[];
  /** Semua No. Formulir toko ini, untuk pencarian. */
  formulir: number[];
  rank?: number;
};

export type TargetResponse = { dealerNightId: string; rows: TargetRow[] };
