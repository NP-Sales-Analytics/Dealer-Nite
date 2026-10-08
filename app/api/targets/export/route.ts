import { NextResponse, type NextRequest } from 'next/server';
import writeExcelFile from 'write-excel-file/node';
import { bolehDepot } from '@/lib/access';
import { getSessionUser } from '@/lib/auth';
import { angka, header, rupiah, teks } from '@/lib/excel/kolom';
import { resolveDealerNightId } from '@/lib/target/access';
import { listTargets, type TargetListRow } from '@/lib/target/service';
import { targetErrorResponse } from '../_response';

type Baris = TargetListRow;
const COLUMNS = [
  { header: header('MG Code'), width: 12, cell: (row: Baris) => teks(row.mgCode) },
  { header: header('MG Name'), width: 34, cell: (row: Baris) => teks(row.mgName) },
  { header: header('Depot'), width: 18, cell: (row: Baris) => teks(row.depotName) },
  { header: header('SPV'), width: 28, cell: (row: Baris) => teks(row.spv) },
  { header: header('Salesman'), width: 28, cell: (row: Baris) => teks(row.salesman) },
  { header: header('Target Pusat'), width: 16, cell: (row: Baris) => rupiah(row.targetAwal) },
  { header: header('Target Terverifikasi'), width: 18, cell: (row: Baris) => rupiah(row.targetVerifikasi) },
  {
    header: header('Penambahan Setelah Verifikasi'), width: 18,
    cell: (row: Baris) => rupiah(row.targetVerifikasi == null ? null : row.targetEfektif - row.targetVerifikasi),
  },
  { header: header('Target Saat Ini'), width: 16, cell: (row: Baris) => rupiah(row.targetEfektif) },
  { header: header('Jumlah Penyesuaian'), width: 12, cell: (row: Baris) => angka(row.jumlahPenyesuaian) },
  { header: header('Status Verifikasi'), width: 18, cell: (row: Baris) => teks(row.verifiedAt ? 'Terverifikasi' : 'Belum diverifikasi') },
  { header: header('No. Form Verifikasi'), width: 12, cell: (row: Baris) => angka(row.formVerifikasi) },
  { header: header('No. Form Terakhir'), width: 12, cell: (row: Baris) => angka(row.formTerakhir) },
  { header: header('Pax Terdaftar'), width: 11, cell: (row: Baris) => angka(row.paxTerdaftar) },
  { header: header('Kehadiran (pax)'), width: 11, cell: (row: Baris) => angka(row.qtyHadir) },
  { header: header('Nomor Undian'), width: 14, cell: (row: Baris) => teks(row.nomorUndian) },
];

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  if (user.role === 'dn_user') return NextResponse.json({ error: 'Tidak punya akses unduh.' }, { status: 403 });

  try {
    const dealerNightId = resolveDealerNightId(user, request.nextUrl.searchParams.get('dealerNightId'));
    const rows = (await listTargets(dealerNightId)).filter((row) => bolehDepot(user, row.depotCode));
    const buffer = await writeExcelFile(rows, { columns: COLUMNS, sheet: 'Target DN', stickyRowsCount: 1 }).toBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="target-dn-${dealerNightId}.xlsx"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return targetErrorResponse(error);
  }
}
