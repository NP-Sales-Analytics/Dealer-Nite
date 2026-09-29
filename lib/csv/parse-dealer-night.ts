import { parse } from 'csv-parse/sync';
import { validateTargetDn } from '@/lib/target/rules';

export type DealerNightMasterRow = {
  mgCode: string;
  mgName: string;
  sotpCode: string;
  sotpName: string;
  depotCode: string;
  depotName: string;
  wilayah: string;
  region: string;
  salesman: string;
  spv: string;
  targetDnAwal: number;
  qtyUndangan: 1;
};

const HEADERS = [
  'MG Code',
  'MG Name',
  'SOTP Code',
  'SOTP Name',
  'Depot Code',
  'Salesman',
  'SPV',
  'Target DN Pembulatan Inc. PPN',
] as const;

const clean = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ');

function hierarchyByCode(csv: string) {
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as Record<string, string>[];

  return new Map(records.map((row) => [clean(row['KODE DEPOT']), {
    depotName: clean(row.DEPOT),
    wilayah: clean(row.Wilayah),
    region: clean(row.REGION),
  }]));
}

export function parseDealerNightCsv(csv: string, hierarchyCsv: string): DealerNightMasterRow[] {
  const [headers = []] = parse(csv, { bom: true, to_line: 1 }) as string[][];
  for (const header of HEADERS) {
    if (!headers.includes(header)) throw new Error(`Header wajib tidak ditemukan: ${header}`);
  }

  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: false,
  }) as Record<string, string>[];
  const depots = hierarchyByCode(hierarchyCsv);
  const seen = new Set<string>();

  return records.map((record, index) => {
    const rowNumber = index + 2;
    const mgCode = clean(record['MG Code']);
    if (!mgCode) throw new Error(`Baris ${rowNumber}: MG Code wajib diisi`);
    if (seen.has(mgCode)) throw new Error(`Baris ${rowNumber}: MG Code ${mgCode} duplikat`);
    seen.add(mgCode);

    const mgName = clean(record['MG Name']).toUpperCase();
    const sotpCode = clean(record['SOTP Code']);
    const sotpName = clean(record['SOTP Name']).toUpperCase();
    const depotCode = clean(record['Depot Code']);
    if (!mgName || !sotpCode || !sotpName) {
      throw new Error(`Baris ${rowNumber}: identitas MG/SOTP belum lengkap`);
    }

    const depot = depots.get(depotCode);
    if (!depot) throw new Error(`Baris ${rowNumber}: Depot Code ${depotCode} tidak dikenal`);

    const digits = clean(record['Target DN Pembulatan Inc. PPN']).replace(/[^0-9]/g, '');
    const targetDnAwal = Number(digits);
    try {
      validateTargetDn(targetDnAwal);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Baris ${rowNumber}: ${message}`);
    }

    return {
      mgCode,
      mgName,
      sotpCode,
      sotpName,
      depotCode,
      ...depot,
      salesman: clean(record.Salesman),
      spv: clean(record.SPV),
      targetDnAwal,
      qtyUndangan: 1,
    };
  });
}

