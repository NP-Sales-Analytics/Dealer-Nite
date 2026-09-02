import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCustomerCsv } from '@/lib/csv/parse-customers';

const csv = readFileSync('Data_Awal_Customer.csv', 'utf8');

describe('parseCustomerCsv', () => {
  const rows = parseCustomerCsv(csv);

  it('membuang baris sampah tanpa kode SAP', () => {
    expect(rows.every((r) => r.kodeSap.length > 0)).toBe(true);
    expect(rows.some((r) => r.qtyUndangan === 166)).toBe(false);
  });

  it('menghasilkan 136 customer unik', () => {
    expect(rows).toHaveLength(136);
    expect(new Set(rows.map((r) => r.kodeSap)).size).toBe(136);
  });

  it('mempertahankan total undangan 166 orang', () => {
    expect(rows.reduce((s, r) => s + r.qtyUndangan, 0)).toBe(166);
  });

  it('menjumlahkan qty untuk kode SAP duplikat', () => {
    const dup = rows.find((r) => r.kodeSap === '624628');
    expect(dup?.qtyUndangan).toBe(2);
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
