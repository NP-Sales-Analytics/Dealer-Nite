import { NextResponse, type NextRequest } from 'next/server';
import { bolehDepot } from '@/lib/access';
import { listKupon } from '@/lib/kupon/service';
import { prosesKupon } from '@/lib/target/kupon';
import { izinKupon, kuponErrorResponse } from '../_auth';

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const STATUS = {
  belum_verifikasi: 'Belum verifikasi',
  perlu_dibuat: 'Perlu dibuat',
  siap_diberikan: 'Siap diberikan',
  selesai: 'Selesai',
} as const;

export async function GET(request: NextRequest) {
  const dealerNightId = request.nextUrl.searchParams.get('dealerNightId') ?? '';
  const user = await izinKupon(dealerNightId);
  if (user instanceof NextResponse) return user;
  try {
    const rows = (await listKupon(dealerNightId)).filter((row) => bolehDepot(user, row.depotCode));
    const header = [
      'MG Code', 'MG Name', 'Depot', 'Target DN', 'Status',
      'Hak Pink', 'Hak Hijau', 'Dibuat Pink', 'Dibuat Hijau', 'Diberikan Pink', 'Diberikan Hijau',
      'Perlu Dibuat Pink', 'Perlu Dibuat Hijau', 'Kehadiran (pax)', 'Nomor Undian',
    ];
    const lines = [header, ...rows.map((row) => {
      const k = prosesKupon({ verified: row.verified, target: row.targetEfektif, dibuat: row.dibuat, diberikan: row.diberikan });
      return [
        row.mgCode, row.mgName, row.depotName, row.targetEfektif, STATUS[k.status],
        k.hak.pink, k.hak.hijau, k.dibuat.pink, k.dibuat.hijau, k.diberikan.pink, k.diberikan.hijau,
        k.perluDibuat.pink, k.perluDibuat.hijau, row.qtyHadir ?? '', row.nomorUndian ?? '',
      ];
    })];
    const csv = lines.map((line) => line.map(csvCell).join(',')).join('\r\n');
    return new NextResponse(`﻿${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="detail-kupon.csv"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return kuponErrorResponse(error);
  }
}
