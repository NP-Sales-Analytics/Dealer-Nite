import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCustomerCsv } from '@/lib/csv/parse-customers';

const csv = readFileSync('Data_Awal_Customer.csv', 'utf8');

describe('parseCustomerCsv', () => {
  const rows = parseCustomerCsv(csv);

  it('membuang baris sampah tanpa kode SAP', () => {
    expect(rows.every((r) => r.kodeSap.length > 0)).toBe(true);
  });

  // Angka ini mengikuti Data_Awal_Customer.csv yang berlaku - master source-nya.
  // Kalau CSV diperbarui lagi dan angka ini berubah, itu memang harus diperbarui
  // di sini juga: test ini penjaga supaya perubahan master data tidak lewat
  // tanpa ada yang menyadari.
  it('menghasilkan 135 customer unik', () => {
    expect(rows).toHaveLength(135);
    expect(new Set(rows.map((r) => r.kodeSap)).size).toBe(135);
  });

  it('mempertahankan total undangan 164 orang', () => {
    expect(rows.reduce((s, r) => s + r.qtyUndangan, 0)).toBe(164);
  });

  it('membaca field bertanda kutip yang mengandung koma', () => {
    const row = rows.find((r) => r.kodeSap === '648574');
    expect(row?.namaPemilik).toBe('IBU VIVI, BAPAK ADI');
    expect(row?.qtyUndangan).toBe(2);
  });

  it('merapikan spasi berlebih di nama toko', () => {
    expect(rows.some((r) => r.namaToko.startsWith(' '))).toBe(false);
  });
});

// Diuji dengan CSV buatan, BUKAN dengan file master. Versi lamanya bersandar pada
// satu kode SAP yang kebetulan terduplikat di data asli, jadi ia ikut mati begitu
// duplikat itu dibersihkan di sumbernya - padahal perilakunya sendiri tidak
// berubah. Perilaku diuji dengan datanya sendiri; file master diuji terpisah di
// atas.
describe('parseCustomerCsv - perilaku', () => {
  const header =
    'Timestamp,WILAYAH,REGION,DEPOT,NAMA PIC RSM/ASM (yang ikut ke Jakarta),' +
    'NAMA TOKO/PERUSAHAAN YANG DIUNDANG,KODE SAP TOKO/PERUSAHAAN YANG DIUNDANG,' +
    'NAMA PEMILIK TOKO YANG DATANG,QTY';
  const baris = (kodeSap: string, namaToko: string, qty: string) =>
    `01/09/2026 10:00:00,Indonesia Barat,3A,1A Jakarta,PIC,${namaToko},${kodeSap},,${qty}`;

  it('menjumlahkan qty untuk kode SAP yang sama - satu toko, dua undangan', () => {
    const rows = parseCustomerCsv(
      [header, baris('900001', 'TOKO A', '1'), baris('900001', 'TOKO A', '2')].join('\n'),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].qtyUndangan).toBe(3);
  });

  it('QTY kosong dihitung sebagai 1 undangan, bukan 0', () => {
    const rows = parseCustomerCsv([header, baris('900002', 'TOKO B', '')].join('\n'));
    expect(rows[0].qtyUndangan).toBe(1);
  });

  it('baris total dari spreadsheet dibuang - tidak ada kode SAP, bukan data', () => {
    const rows = parseCustomerCsv([header, ',,,,,,,,166'].join('\n'));
    expect(rows).toHaveLength(0);
  });

  it('nama toko dan pemilik disimpan huruf besar', () => {
    const rows = parseCustomerCsv([header, baris('900003', 'toko kecil', '1')].join('\n'));
    expect(rows[0].namaToko).toBe('TOKO KECIL');
  });
});
