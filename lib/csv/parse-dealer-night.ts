import { parse } from 'csv-parse/sync';
import { BATAS_BAWAH_TARGET, validateTargetDn } from '@/lib/target/rules';

export type Sotp = { kode: string; nama: string };

export type DealerNightMasterRow = {
  mgCode: string;
  mgName: string;
  /** SOTP utama (= sotp[0]), disalin ke customers.sotp_*. */
  sotpCode: string;
  sotpName: string;
  /** Semua Sold To Party MG ini, urut sesuai file. */
  sotp: Sotp[];
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
export const MAKS_SOTP = 30;

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

const KOLOM_TARGET = 'Target DN Pembulatan Inc. PPN';

/**
 * Baris master (CSV maupun Excel) -> data toko tervalidasi. Gagal di baris pertama yang salah.
 *
 * Satu baris = satu Sold To Party. MG dengan beberapa SOTP ditulis beberapa baris
 * dengan MG Code yang sama; baris tambahannya cukup MG Code + SOTP Code + SOTP Name.
 * Kolom MG lain di baris tambahan boleh kosong, tapi bila diisi harus sama.
 */
export function parseDealerNightRecords(
  records: Record<string, unknown>[],
  depots: DepotByCode,
): DealerNightMasterRow[] {
  const undianDipakai = new Map<string, string>();
  const rows = records.filter((record) => Object.values(record).some((value) => clean(value) !== ''));
  if (rows.length === 0) throw new Error('File tidak berisi data toko.');
  const kolomPax = Object.keys(rows[0]).find(isKolomPax);
  const kolomUndian = Object.keys(rows[0]).find(isKolomUndian);
  const kolomMg = ['MG Name', 'Depot Code', 'Salesman', 'SPV', KOLOM_TARGET, kolomPax, kolomUndian]
    .filter((kolom): kolom is string => !!kolom);
  const normal = (kolom: string, value: unknown) =>
    (kolom === KOLOM_TARGET ? String(rupiahDariSel(value)) : clean(value).toUpperCase());

  const perMg = new Map<string, { row: DealerNightMasterRow; baris: number; record: Record<string, unknown> }>();
  const hasil: DealerNightMasterRow[] = [];

  for (const record of rows) {
    const rowNumber = records.indexOf(record) + 2;
    const mgCode = clean(record['MG Code']);
    if (!mgCode) throw new Error(`Baris ${rowNumber}: MG Code wajib diisi`);
    const sotpCode = clean(record['SOTP Code']);
    const sotpName = clean(record['SOTP Name']).toUpperCase();
    if (!sotpCode || !sotpName) throw new Error(`Baris ${rowNumber}: SOTP Code dan SOTP Name wajib diisi`);

    const induk = perMg.get(mgCode);
    if (induk) {
      const beda = kolomMg.find((kolom) => clean(record[kolom]) !== ''
        && normal(kolom, record[kolom]) !== normal(kolom, induk.record[kolom]));
      if (beda) throw new Error(`Baris ${rowNumber}: ${beda} berbeda dengan baris ${induk.baris} (MG Code ${mgCode} sama)`);
      if (induk.row.sotp.some((item) => item.kode === sotpCode)) {
        throw new Error(`Baris ${rowNumber}: SOTP Code ${sotpCode} duplikat di MG Code ${mgCode}`);
      }
      if (induk.row.sotp.length >= MAKS_SOTP) throw new Error(`Baris ${rowNumber}: MG Code ${mgCode} melebihi ${MAKS_SOTP} SOTP`);
      induk.row.sotp.push({ kode: sotpCode, nama: sotpName });
      continue;
    }

    const mgName = clean(record['MG Name']).toUpperCase();
    const depotCode = clean(record['Depot Code']);
    if (!mgName) throw new Error(`Baris ${rowNumber}: MG Name wajib diisi`);

    const depot = depots.get(depotCode);
    if (!depot) throw new Error(`Baris ${rowNumber}: Depot Code ${depotCode} tidak dikenal`);

    const targetDnAwal = rupiahDariSel(record[KOLOM_TARGET]);
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

    const row: DealerNightMasterRow = {
      mgCode,
      mgName,
      sotpCode,
      sotpName,
      sotp: [{ kode: sotpCode, nama: sotpName }],
      depotCode,
      ...depot,
      salesman: clean(record.Salesman),
      spv: clean(record.SPV),
      targetDnAwal,
      ...(kolomPax === undefined ? {} : { qtyUndangan: paxDariSel(record[kolomPax], rowNumber) }),
      ...(noUndian === undefined ? {} : { noUndian }),
    };
    perMg.set(mgCode, { row, baris: rowNumber, record });
    hasil.push(row);
  }
  return hasil;
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
