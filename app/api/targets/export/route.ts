import { NextResponse, type NextRequest } from 'next/server';
import writeExcelFile from 'write-excel-file/node';
import { bolehDepot } from '@/lib/access';
import { getSessionUser } from '@/lib/auth';
import { angka, header, rupiah, teks } from '@/lib/excel/kolom';
import { resolveDealerNightId } from '@/lib/target/access';
import { listTargets, type TargetListRow } from '@/lib/target/service';
import { targetErrorResponse } from '../_response';

// Satu baris per Sold To Party, sama dengan format upload master: baris pertama
// MG memuat seluruh data, baris SOTP berikutnya hanya MG Code + SOTP supaya
// jumlah target/pax di Excel tidak terhitung ganda.
type Baris = { row: TargetListRow; sotp: { kode: string; nama: string }; utama: boolean };
/** Kolom data MG: hanya terisi di baris SOTP pertama. */
const mg = <T extends object>(sel: (row: TargetListRow) => T) => (b: Baris) => (b.utama ? sel(b.row) : teks(null));

const COLUMNS = [
  { header: header('MG Code'), width: 12, cell: (b: Baris) => teks(b.row.mgCode) },
  { header: header('MG Name'), width: 34, cell: mg((row) => teks(row.mgName)) },
  { header: header('SOTP Code'), width: 12, cell: (b: Baris) => teks(b.sotp.kode) },
  { header: header('SOTP Name'), width: 34, cell: (b: Baris) => teks(b.sotp.nama) },
  { header: header('Depot'), width: 18, cell: mg((row) => teks(row.depotName)) },
  { header: header('SPV'), width: 28, cell: mg((row) => teks(row.spv)) },
  { header: header('Salesman'), width: 28, cell: mg((row) => teks(row.salesman)) },
  { header: header('Target Pusat'), width: 16, cell: mg((row) => rupiah(row.targetAwal)) },
  { header: header('Target Terverifikasi'), width: 18, cell: mg((row) => rupiah(row.targetVerifikasi)) },
  {
    header: header('Penambahan Setelah Verifikasi'), width: 18,
    cell: mg((row) => rupiah(row.targetVerifikasi == null ? null : row.targetEfektif - row.targetVerifikasi)),
  },
  { header: header('Target Saat Ini'), width: 16, cell: mg((row) => rupiah(row.targetEfektif)) },
  { header: header('Jumlah Penyesuaian'), width: 12, cell: mg((row) => angka(row.jumlahPenyesuaian)) },
  { header: header('Status Verifikasi'), width: 18, cell: mg((row) => teks(row.verifiedAt ? 'Terverifikasi' : 'Belum diverifikasi')) },
  { header: header('No. Form Verifikasi'), width: 12, cell: mg((row) => angka(row.formVerifikasi)) },
  { header: header('No. Form Terakhir'), width: 12, cell: mg((row) => angka(row.formTerakhir)) },
  { header: header('Pax Terdaftar'), width: 11, cell: mg((row) => angka(row.paxTerdaftar)) },
  { header: header('Kehadiran (pax)'), width: 11, cell: mg((row) => angka(row.qtyHadir)) },
  { header: header('Nomor Undian'), width: 14, cell: mg((row) => teks(row.nomorUndian)) },
];

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  if (user.role === 'dn_user') return NextResponse.json({ error: 'Tidak punya akses unduh.' }, { status: 403 });

  try {
    const dealerNightId = resolveDealerNightId(user, request.nextUrl.searchParams.get('dealerNightId'));
    const rows = (await listTargets(dealerNightId)).filter((row) => bolehDepot(user, row.depotCode))
      .flatMap((row) => row.sotp.map((sotp, index): Baris => ({ row, sotp, utama: index === 0 })));
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
