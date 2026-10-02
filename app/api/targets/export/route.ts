import { NextResponse, type NextRequest } from 'next/server';
import { bolehDepot } from '@/lib/access';
import { getSessionUser } from '@/lib/auth';
import { resolveDealerNightId } from '@/lib/target/access';
import { listTargets } from '@/lib/target/service';
import { targetErrorResponse } from '../_response';

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  if (user.role === 'dn_user') return NextResponse.json({ error: 'Tidak punya akses unduh.' }, { status: 403 });

  try {
    const dealerNightId = resolveDealerNightId(user, request.nextUrl.searchParams.get('dealerNightId'));
    const rows = (await listTargets(dealerNightId)).filter((row) => bolehDepot(user, row.depotCode));
    const header = [
      'MG Code', 'MG Name', 'Depot', 'Target Pusat', 'Target Terverifikasi', 'Penambahan Setelah Verifikasi',
      'Target Saat Ini', 'Jumlah Penyesuaian', 'Status Verifikasi', 'No. Form Verifikasi', 'No. Form Terakhir',
      'Kehadiran (pax)', 'Nomor Undian',
    ];
    const csv = [header, ...rows.map((row) => [
      row.mgCode, row.mgName, row.depotName, row.targetAwal, row.targetVerifikasi ?? '',
      row.targetVerifikasi == null ? '' : row.targetEfektif - row.targetVerifikasi, row.targetEfektif,
      row.jumlahPenyesuaian, row.verifiedAt ? 'Terverifikasi' : 'Belum diverifikasi',
      row.formVerifikasi ?? '', row.formTerakhir ?? '',
      row.qtyHadir ?? '', row.nomorUndian ?? '',
    ])].map((row) => row.map(csvCell).join(',')).join('\r\n');

    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="target-dn-${dealerNightId}.csv"`,
      },
    });
  } catch (error) {
    return targetErrorResponse(error);
  }
}
