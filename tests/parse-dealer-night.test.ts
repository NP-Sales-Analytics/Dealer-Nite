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
      depotCode: '1S',
      depotName: '1S Bogor',
      wilayah: 'Indonesia Barat',
      region: '4',
      salesman: 'Sales A',
      spv: 'SPV A',
      targetDnAwal: 5_619_000_000,
      qtyUndangan: 1,
    });
  });

  it('accepts the Rp53 million source row', () => {
    const csv = [
      HEADER,
      '662404,Dian Jaya,662404,Dian Jaya,5C,Sales B,SPV B," 53,000,000 "',
    ].join('\n');
    expect(parseDealerNightCsv(csv, HIERARCHY)[0].targetDnAwal).toBe(53_000_000);
  });

  it('rejects duplicate MG codes with the source row', () => {
    const csv = [
      HEADER,
      '632723,Toko A,632723,Toko A,1S,Sales,SPV," 60,000,000 "',
      '632723,Toko B,632723,Toko B,1S,Sales,SPV," 70,000,000 "',
    ].join('\n');
    expect(() => parseDealerNightCsv(csv, HIERARCHY)).toThrow('Baris 3: MG Code 632723 duplikat');
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
    expect(rows.every((row) => row.qtyUndangan === 1)).toBe(true);
  });
});
