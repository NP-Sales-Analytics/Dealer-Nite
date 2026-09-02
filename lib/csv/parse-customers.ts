import { parse } from 'csv-parse/sync';

export type CustomerSeedRow = {
  wilayah: string;
  region: string;
  depot: string;
  picRsmAsm: string;
  namaToko: string;
  namaPemilik: string;
  kodeSap: string;
  qtyUndangan: number;
};

const clean = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ');
// Nama toko disimpan huruf besar semua supaya daftar terlihat rapi dan
// pencarian tidak bergantung pada cara admin mengetik. Tanpa ini, menjalankan
// ulang seed akan mengembalikan huruf kecil dari CSV.
const upper = (v: unknown) => clean(v).toUpperCase();

export function parseCustomerCsv(csvText: string): CustomerSeedRow[] {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  }) as Record<string, string>[];

  // Kode SAP adalah kunci bisnis; baris tanpa kode SAP adalah baris total/kosong
  // dari spreadsheet asal, bukan data.
  const byKodeSap = new Map<string, CustomerSeedRow>();

  for (const rec of records) {
    const kodeSap = clean(rec['KODE SAP TOKO/PERUSAHAAN YANG DIUNDANG']);
    const namaToko = upper(rec['NAMA TOKO/PERUSAHAAN YANG DIUNDANG']);
    if (!kodeSap || !namaToko) continue;

    const qty = Number.parseInt(clean(rec['QTY']), 10);
    const qtyUndangan = Number.isFinite(qty) && qty > 0 ? qty : 1;

    const existing = byKodeSap.get(kodeSap);
    if (existing) {
      // Kode SAP yang sama diundang lebih dari sekali -> jumlahkan orangnya,
      // supaya total kapasitas tetap sama dengan data asal.
      existing.qtyUndangan += qtyUndangan;
      continue;
    }

    byKodeSap.set(kodeSap, {
      wilayah: clean(rec['WILAYAH']),
      region: clean(rec['REGION']),
      depot: clean(rec['DEPOT']),
      picRsmAsm: clean(rec['NAMA PIC RSM/ASM (yang ikut ke Jakarta)']),
      namaToko,
      namaPemilik: upper(rec['NAMA PEMILIK TOKO YANG DATANG']),
      kodeSap,
      qtyUndangan,
    });
  }

  return [...byKodeSap.values()];
}
