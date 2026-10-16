import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDealerNightCsv } from '@/lib/csv/parse-dealer-night';

const HEADER =
  'MG Code,MG Name,SOTP Code,SOTP Name,Depot Code,Salesman,SPV,Target DN Pembulatan Inc. PPN';
const HIERARCHY = [
  'Wilayah,REGION,KODE DEPOT,DEPOT',
  'Indonesia Barat,4,1S,1S Bogor',
  'Indonesia Barat,4,5C,5C Cianjur',
].join('\n');

describe('parseDealerNightCsv', () => {
  it('maps Bogor master fields and parses rupiah', () => {
    const csv = [
      HEADER,
      '632723,CV. HALIM JAYA BERSAMA,632723,CV. HALIM JAYA BERSAMA,1S,Sales A,SPV A," 5,619,000,000 "',
    ].join('\n');

    const [row] = parseDealerNightCsv(csv, HIERARCHY);

    expect(row).toEqual({
      mgCode: '632723',
      mgName: 'CV. HALIM JAYA BERSAMA',
      sotpCode: '632723',
      sotpName: 'CV. HALIM JAYA BERSAMA',
      sotp: [{ kode: '632723', nama: 'CV. HALIM JAYA BERSAMA' }],
      depotCode: '1S',
      depotName: '1S Bogor',
      wilayah: 'Indonesia Barat',
      region: '4',
      salesman: 'Sales A',
      spv: 'SPV A',
      targetDnAwal: 5_619_000_000,
    });
  });

  it('membaca kolom Pax: angka, kosong = belum didata, salah = ditolak', () => {
    const csv = [
      `${HEADER},Pax`,
      '632723,Toko A,632723,Toko A,1S,Sales,SPV," 60,000,000 ",3',
      '632724,Toko B,632724,Toko B,1S,Sales,SPV," 70,000,000 ",',
    ].join('\n');
    expect(parseDealerNightCsv(csv, HIERARCHY).map((row) => row.qtyUndangan)).toEqual([3, null]);
    const nol = [`${HEADER},Pax`, '632723,Toko A,632723,Toko A,1S,Sales,SPV," 60,000,000 ",0'].join('\n');
    expect(() => parseDealerNightCsv(nol, HIERARCHY)).toThrow('Baris 2: Pax harus bilangan bulat 1 sampai 1000');
  });

  it('tanpa kolom Pax, pax tidak disentuh (undefined)', () => {
    const csv = [HEADER, '632723,Toko A,632723,Toko A,1S,Sales,SPV," 60,000,000 "'].join('\n');
    expect(parseDealerNightCsv(csv, HIERARCHY)[0]).not.toHaveProperty('qtyUndangan');
    expect(parseDealerNightCsv(csv, HIERARCHY)[0]).not.toHaveProperty('noUndian');
  });

  it('membaca kolom No Undian: angka (nol depan tetap), kosong = blank, salah/duplikat = ditolak', () => {
    const csv = [
      `${HEADER},Pax,No. Undian`,
      '632723,Toko A,632723,Toko A,1S,Sales,SPV," 60,000,000 ",3,0123',
      '632724,Toko B,632724,Toko B,1S,Sales,SPV," 70,000,000 ",,',
    ].join('\n');
    expect(parseDealerNightCsv(csv, HIERARCHY).map((row) => row.noUndian)).toEqual(['0123', null]);

    const huruf = [`${HEADER},No Undian`, '632723,Toko A,632723,Toko A,1S,Sales,SPV," 60,000,000 ",A12'].join('\n');
    expect(() => parseDealerNightCsv(huruf, HIERARCHY)).toThrow('Baris 2: No Undian harus berupa angka');
    const dobel = [
      `${HEADER},Nomor Undian`,
      '632723,Toko A,632723,Toko A,1S,Sales,SPV," 60,000,000 ",7',
      '632724,Toko B,632724,Toko B,1S,Sales,SPV," 70,000,000 ",7',
    ].join('\n');
    expect(() => parseDealerNightCsv(dobel, HIERARCHY)).toThrow('Baris 3: No Undian 7 sudah dipakai MG Code 632723');
  });

  it('accepts the Rp53 million source row', () => {
    const csv = [
      HEADER,
      '662404,Dian Jaya,662404,Dian Jaya,5C,Sales B,SPV B," 53,000,000 "',
    ].join('\n');
    expect(parseDealerNightCsv(csv, HIERARCHY)[0].targetDnAwal).toBe(53_000_000);
  });

  it('MG Code berulang = beberapa SOTP; baris tambahan cukup MG Code + SOTP', () => {
    const csv = [
      HEADER,
      '640100,PT Grup,640101,Cabang A,1S,Sales,SPV," 250,000,000 "',
      '632723,Toko A,632723,Toko A,1S,Sales,SPV," 60,000,000 "',
      '640100,,640102,Cabang B,,,,',
      '640100,PT GRUP,640103,Cabang C,1S,,," 250,000,000 "',
    ].join('\n');
    const rows = parseDealerNightCsv(csv, HIERARCHY);
    expect(rows.map((row) => row.mgCode)).toEqual(['640100', '632723']);
    expect(rows[0].sotp).toEqual([
      { kode: '640101', nama: 'CABANG A' },
      { kode: '640102', nama: 'CABANG B' },
      { kode: '640103', nama: 'CABANG C' },
    ]);
    expect([rows[0].sotpCode, rows[0].targetDnAwal]).toEqual(['640101', 250_000_000]);
  });

  it('menolak baris SOTP tambahan yang kolom MG-nya berbeda, SOTP dobel, atau lebih dari 30', () => {
    const beda = [
      HEADER,
      '640100,PT Grup,640101,Cabang A,1S,Sales,SPV," 250,000,000 "',
      '640100,,640102,Cabang B,,,," 300,000,000 "',
    ].join('\n');
    expect(() => parseDealerNightCsv(beda, HIERARCHY))
      .toThrow('Baris 3: Target DN Pembulatan Inc. PPN berbeda dengan baris 2 (MG Code 640100 sama)');

    const dobel = [
      HEADER,
      '640100,PT Grup,640101,Cabang A,1S,Sales,SPV," 250,000,000 "',
      '640100,,640101,Cabang A lagi,,,,',
    ].join('\n');
    expect(() => parseDealerNightCsv(dobel, HIERARCHY)).toThrow('Baris 3: SOTP Code 640101 duplikat di MG Code 640100');

    const banyak = [
      HEADER,
      '640100,PT Grup,S1,Cabang 1,1S,Sales,SPV," 250,000,000 "',
      ...Array.from({ length: 30 }, (_, i) => `640100,,S${i + 2},Cabang ${i + 2},,,,`),
    ].join('\n');
    expect(() => parseDealerNightCsv(banyak, HIERARCHY)).toThrow('Baris 32: MG Code 640100 melebihi 30 SOTP');
  });

  it('rejects unknown depots instead of guessing metadata', () => {
    const csv = [
      HEADER,
      '632723,Toko A,632723,Toko A,XX,Sales,SPV," 60,000,000 "',
    ].join('\n');
    expect(() => parseDealerNightCsv(csv, HIERARCHY)).toThrow('Baris 2: Depot Code XX tidak dikenal');
  });

  it('parses the complete Bogor master deterministically', () => {
    const rows = parseDealerNightCsv(
      readFileSync('Master_Toko Bogor.csv', 'utf8'),
      readFileSync('public/Hierarchy Depot.csv', 'utf8'),
    );
    expect(rows).toHaveLength(113);
    expect(new Set(rows.map((row) => row.mgCode)).size).toBe(113);
    expect(rows.reduce((total, row) => total + row.targetDnAwal, 0)).toBe(42_955_000_000);
    expect(rows.every((row) => row.qtyUndangan === undefined)).toBe(true);
  });
});
