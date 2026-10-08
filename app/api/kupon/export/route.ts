import { NextResponse, type NextRequest } from 'next/server';
import writeExcelFile from 'write-excel-file/node';
import { bolehDepot } from '@/lib/access';
import { angka, header, rupiah, teks } from '@/lib/excel/kolom';
import { konfigKupon, listKupon, type KuponRow } from '@/lib/kupon/service';
import { NAMA_KUPON, prosesKupon } from '@/lib/target/kupon';
import { izinKupon, kuponErrorResponse } from '../_auth';

const STATUS = {
  belum_verifikasi: 'Belum verifikasi',
  perlu_dibuat: 'Perlu dibuat',
  siap_diberikan: 'Siap diberikan',
  selesai: 'Selesai',
} as const;

type Baris = { row: KuponRow; k: ReturnType<typeof prosesKupon> };

export async function GET(request: NextRequest) {
  const dealerNightId = request.nextUrl.searchParams.get('dealerNightId') ?? '';
  const user = await izinKupon(dealerNightId);
  if (user instanceof NextResponse) return user;
  try {
    const [semua, { skema, nilai }] = await Promise.all([listKupon(dealerNightId), konfigKupon(dealerNightId)]);
    const rows: Baris[] = semua.filter((row) => bolehDepot(user, row.depotCode)).map((row) => ({
      row,
      k: prosesKupon({ verified: row.verified, target: row.targetEfektif, dibuat: row.dibuat, diberikan: row.diberikan, nilai }),
    }));
    // Nama kolom kupon mengikuti warna fisik kupon DN (Pink/Hijau atau Putih/Kuning).
    const { pink, hijau } = NAMA_KUPON[skema];
    const kupon = (judul: string, ambil: (b: Baris) => number) => ({ header: header(judul), width: 12, cell: (b: Baris) => angka(ambil(b)) });
    const columns = [
      { header: header('MG Code'), width: 12, cell: (b: Baris) => teks(b.row.mgCode) },
      { header: header('MG Name'), width: 34, cell: (b: Baris) => teks(b.row.mgName) },
      { header: header('Depot'), width: 18, cell: (b: Baris) => teks(b.row.depotName) },
      { header: header('SPV'), width: 28, cell: (b: Baris) => teks(b.row.spv) },
      { header: header('Salesman'), width: 28, cell: (b: Baris) => teks(b.row.salesman) },
      { header: header('Target DN'), width: 16, cell: (b: Baris) => rupiah(b.row.targetEfektif) },
      { header: header('Status'), width: 16, cell: (b: Baris) => teks(STATUS[b.k.status]) },
      kupon(`Hak ${pink}`, (b) => b.k.hak.pink),
      kupon(`Hak ${hijau}`, (b) => b.k.hak.hijau),
      kupon(`Dibuat ${pink}`, (b) => b.k.dibuat.pink),
      kupon(`Dibuat ${hijau}`, (b) => b.k.dibuat.hijau),
      kupon(`Diberikan ${pink}`, (b) => b.k.diberikan.pink),
      kupon(`Diberikan ${hijau}`, (b) => b.k.diberikan.hijau),
      kupon(`Perlu Dibuat ${pink}`, (b) => b.k.perluDibuat.pink),
      kupon(`Perlu Dibuat ${hijau}`, (b) => b.k.perluDibuat.hijau),
      { header: header('Kehadiran (pax)'), width: 11, cell: (b: Baris) => angka(b.row.qtyHadir) },
      { header: header('Nomor Undian'), width: 14, cell: (b: Baris) => teks(b.row.nomorUndian) },
    ];
    const buffer = await writeExcelFile(rows, { columns, sheet: 'Detail Kupon', stickyRowsCount: 1 }).toBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="detail-kupon.xlsx"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return kuponErrorResponse(error);
  }
}
