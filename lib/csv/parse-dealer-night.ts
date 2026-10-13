import { parse } from 'csv-parse/sync';
import { BATAS_BAWAH_TARGET, validateTargetDn } from '@/lib/target/rules';

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
  /** Pax terdaftar. null = sel Pax kosong; undefined = file tidak punya kolom Pax (pax lama dibiarkan). */
  qtyUndangan?: number | null;
  /** No. Undian. null = sel kosong; undefined = file tidak punya kolom No Undian (nomor lama dibiarkan). */
  noUndian?: string | null;
};

export const MAKS_PAX = 1000;

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

/** Kolom opsional paling kanan template; huruf besar/kecil diabaikan. */
const isKolomPax = (header: string) => clean(header).toLowerCase() === 'pax';
/** Kolom opsional No Undian: "No Undian", "No. Undian", atau "Nomor Undian". */
const isKolomUndian = (header: string) => /^(no\.?|nomor) ?undian$/.test(clean(header).toLowerCase());

export type DepotByCode = Map<string, { depotName: string; wilayah: string; region: string }>;

export function hierarchyByCode(csv: string): DepotByCode {
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

export function checkHeaders(headers: string[]) {
  const ada = new Set(headers.map(clean));
  for (const header of HEADERS) {
    if (!ada.has(header)) throw new Error(`Header wajib tidak ditemukan: ${header}`);
  }
}

/** Baris master (CSV maupun Excel) -> data toko tervalidasi. Gagal di baris pertama yang salah. */
export function parseDealerNightRecords(
  records: Record<string, unknown>[],
  depots: DepotByCode,
): DealerNightMasterRow[] {
  const seen = new Set<string>();
  const undianDipakai = new Map<string, string>();
  const rows = records.filter((record) => Object.values(record).some((value) => clean(value) !== ''));
  if (rows.length === 0) throw new Error('File tidak berisi data toko.');
  const kolomPax = Object.keys(rows[0]).find(isKolomPax);
  const kolomUndian = Object.keys(rows[0]).find(isKolomUndian);

  return rows.map((record) => {
    const rowNumber = records.indexOf(record) + 2;
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

    const targetDnAwal = rupiahDariSel(record['Target DN Pembulatan Inc. PPN']);
    try {
      // Minimal per DN dicek saat import (importMaster); parser tidak tahu DN tujuannya.
      validateTargetDn(targetDnAwal, BATAS_BAWAH_TARGET);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Baris ${rowNumber}: ${message}`);
    }

    const noUndian = kolomUndian === undefined ? undefined : undianDariSel(record[kolomUndian], rowNumber);
    if (noUndian) {
      const pemilik = undianDipakai.get(noUndian);
      if (pemilik) throw new Error(`Baris ${rowNumber}: No Undian ${noUndian} sudah dipakai MG Code ${pemilik} di file ini`);
      undianDipakai.set(noUndian, mgCode);
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
      ...(kolomPax === undefined ? {} : { qtyUndangan: paxDariSel(record[kolomPax], rowNumber) }),
      ...(noUndian === undefined ? {} : { noUndian }),
    };
  });
}

/** Sel Pax: kosong = belum didata (null), selain itu bilangan bulat 1..MAKS_PAX. */
function paxDariSel(value: unknown, rowNumber: number): number | null {
  const teks = clean(value);
  if (teks === '') return null;
  const pax = typeof value === 'number' ? value : Number(teks);
  if (!Number.isInteger(pax) || pax < 1 || pax > MAKS_PAX) {
    throw new Error(`Baris ${rowNumber}: Pax harus bilangan bulat 1 sampai ${MAKS_PAX} atau dikosongkan`);
  }
  return pax;
}

/** Sel No Undian: kosong = belum didata (null), selain itu 1-20 digit angka. */
function undianDariSel(value: unknown, rowNumber: number): string | null {
  const teks = clean(value);
  if (teks === '') return null;
  if (!/^\d{1,20}$/.test(teks)) throw new Error(`Baris ${rowNumber}: No Undian harus berupa angka (maksimal 20 digit) atau dikosongkan`);
  return teks;
}

/** Excel menyimpan angka sebagai number; CSV sebagai teks berformat " 5,619,000,000 ". */
function rupiahDariSel(value: unknown): number {
  if (typeof value === 'number') return Math.round(value);
  return Number(clean(value).replace(/[^0-9]/g, '') || Number.NaN);
}

export function parseDealerNightCsv(csv: string, hierarchyCsv: string): DealerNightMasterRow[] {
  const [headers = []] = parse(csv, { bom: true, to_line: 1 }) as string[][];
  checkHeaders(headers);

  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: false,
  }) as Record<string, string>[];
  return parseDealerNightRecords(records, hierarchyByCode(hierarchyCsv));
}
