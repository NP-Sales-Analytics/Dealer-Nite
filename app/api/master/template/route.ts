import { NextResponse } from 'next/server';
import writeExcelFile from 'write-excel-file/node';
import { getSessionUser } from '@/lib/auth';
import { angka, header, rupiah, teks } from '@/lib/excel/kolom';

type Contoh = {
  mgCode: string; mgName: string; sotpCode: string; sotpName: string; depotCode: string;
  salesman: string; spv: string; target: number; pax: number;
};

// Judul kolom wajib sama persis dengan yang dibaca lib/csv/parse-dealer-night.ts.
// Kode ditulis sebagai TEKS supaya Excel tidak membuang nol di depan.
const COLUMNS = [
  { header: header('MG Code'), width: 12, cell: (r: Contoh) => teks(r.mgCode) },
  { header: header('MG Name'), width: 30, cell: (r: Contoh) => teks(r.mgName) },
  { header: header('SOTP Code'), width: 12, cell: (r: Contoh) => teks(r.sotpCode) },
  { header: header('SOTP Name'), width: 30, cell: (r: Contoh) => teks(r.sotpName) },
  { header: header('Depot Code'), width: 11, cell: (r: Contoh) => teks(r.depotCode) },
  { header: header('Salesman'), width: 32, cell: (r: Contoh) => teks(r.salesman) },
  { header: header('SPV'), width: 28, cell: (r: Contoh) => teks(r.spv) },
  { header: header('Target DN Pembulatan Inc. PPN'), width: 26, cell: (r: Contoh) => rupiah(r.target) },
  { header: header('Pax'), width: 8, cell: (r: Contoh) => angka(r.pax) },
];

const CONTOH: Contoh[] = [{
  mgCode: '632723', mgName: 'CV. CONTOH TOKO', sotpCode: '632723', sotpName: 'CV. CONTOH TOKO', depotCode: '1S',
  salesman: '90002029 Mr NAMA SALESMAN', spv: '90000385 Mr NAMA SPV', target: 100_000_000, pax: 3,
}];

export async function GET() {
  if (!(await getSessionUser())) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  const buffer = await writeExcelFile(CONTOH, { columns: COLUMNS, sheet: 'Master Toko', stickyRowsCount: 1 }).toBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-master-toko.xlsx"',
      'Cache-Control': 'private, no-store',
    },
  });
}
