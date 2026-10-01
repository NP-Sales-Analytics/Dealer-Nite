import { NextResponse, type NextRequest } from 'next/server';
import writeExcelFile from 'write-excel-file/node';
import { getSessionUser } from '@/lib/auth';
import { batasiFilterDepot } from '@/lib/depot-scope';
import { matchesDashboardFilter, readFilter } from '@/lib/dashboard/filters';
import { resolveDashboardDealerNight } from '@/lib/dashboard/scope';
import { loadAttendance } from '@/lib/dashboard/service';
import { angka, header, teks, waktuWib } from '@/lib/excel/kolom';
import { targetErrorResponse } from '@/app/api/targets/_response';

type ExportRow = Awaited<ReturnType<typeof loadAttendance>>[number];
const COLUMNS = [
  { header: header('Nama Toko'), width: 34, cell: (row: ExportRow) => teks(row.nama) },
  { header: header('MG Code'), width: 16, cell: (row: ExportRow) => teks(row.kodeSap) },
  { header: header('Wilayah'), width: 18, cell: (row: ExportRow) => teks(row.wilayah) },
  { header: header('Region'), width: 10, cell: (row: ExportRow) => teks(row.region) },
  { header: header('Depot'), width: 18, cell: (row: ExportRow) => teks(row.depot) },
  { header: header('Qty Hadir'), width: 11, cell: (row: ExportRow) => angka(row.qtyHadir) },
  { header: header('Nomor Undian'), width: 14, cell: (row: ExportRow) => teks(row.nomorUndian) },
  { header: header('Waktu Hadir (WIB)'), width: 20, cell: (row: ExportRow) => teks(waktuWib(row.checkedInAt)) },
  { header: header('Jenis Entri'), width: 14, cell: (row: ExportRow) => teks(row.isManualEntry ? 'Manual' : 'Terdaftar') },
  { header: header('Dicatat Oleh'), width: 22, cell: (row: ExportRow) => teks(row.dicatatOleh ?? '-') },
];

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  if (user.role === 'dn_user') return NextResponse.json({ error: 'Tidak punya izin mengunduh data' }, { status: 403 });

  try {
    const dealerNightId = resolveDashboardDealerNight(user, request.nextUrl.searchParams.get('dealerNightId'));
    const filter = batasiFilterDepot(user, readFilter(request));
    const ascending = request.nextUrl.searchParams.get('sort') === 'asc';
    const rows = (await loadAttendance(dealerNightId))
      .filter((row) => matchesDashboardFilter(row, filter))
      .sort((left, right) => (ascending ? 1 : -1) * (Date.parse(left.checkedInAt) - Date.parse(right.checkedInAt)));
    const buffer = await writeExcelFile(rows, { columns: COLUMNS, sheet: 'Kehadiran', stickyRowsCount: 1 }).toBuffer();
    const stamp = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }).replaceAll('-', '');
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Kehadiran-Dealer-Nite-${stamp}.xlsx"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return targetErrorResponse(error);
  }
}
