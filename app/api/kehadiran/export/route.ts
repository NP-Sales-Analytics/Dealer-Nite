import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import writeExcelFile from 'write-excel-file/node';
import { requireRoleApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { cocokSalahSatu, readFilter, terapkanScope } from '@/lib/dashboard/filters';
import { angka, header, teks, waktuWib } from '@/lib/excel/kolom';

type BarisEkspor = {
  nama: string | null;
  kodeSap: string | null;
  namaPemilik: string | null;
  picRsmAsm: string | null;
  wilayah: string | null;
  region: string | null;
  depot: string | null;
  qtyUndangan: number | null;
  qtyHadir: number;
  checkedInAt: string;
  isManualEntry: boolean;
  dicatatOleh: string | null;
};

const KOLOM = [
  { header: header('Nama Toko'), width: 34, cell: (r: BarisEkspor) => teks(r.nama ?? '-') },
  { header: header('Kode SAP'), width: 12, cell: (r: BarisEkspor) => teks(r.kodeSap) },
  { header: header('Nama Pemilik'), width: 24, cell: (r: BarisEkspor) => teks(r.namaPemilik) },
  { header: header('PIC RSM/ASM'), width: 22, cell: (r: BarisEkspor) => teks(r.picRsmAsm) },
  { header: header('Wilayah'), width: 18, cell: (r: BarisEkspor) => teks(r.wilayah) },
  { header: header('Region'), width: 10, cell: (r: BarisEkspor) => teks(r.region) },
  { header: header('Depot'), width: 18, cell: (r: BarisEkspor) => teks(r.depot) },
  { header: header('Qty Undangan'), width: 14, cell: (r: BarisEkspor) => angka(r.qtyUndangan) },
  { header: header('Qty Hadir'), width: 11, cell: (r: BarisEkspor) => angka(r.qtyHadir) },
  {
    header: header('Waktu Hadir (WIB)'),
    width: 20,
    cell: (r: BarisEkspor) => teks(waktuWib(r.checkedInAt)),
  },
  {
    header: header('Jenis Entri'),
    width: 14,
    cell: (r: BarisEkspor) => teks(r.isManualEntry ? 'Manual' : 'Terdaftar'),
  },
  // checked_in_by kosong berarti pencatatnya sudah dihapus - FK-nya
  // on delete set null, jadi barisnya sengaja tetap ada.
  { header: header('Dicatat Oleh'), width: 22, cell: (r: BarisEkspor) => teks(r.dicatatOleh ?? '-') },
];

/**
 * Unduhan rekap kehadiran sebagai berkas Excel.
 *
 * Memakai kondisi WHERE dan terapkanScope yang SAMA dengan /api/dashboard/recent,
 * jadi isi berkasnya persis daftar yang sedang dilihat di layar - termasuk
 * pembatasan region untuk RSM. Kalau keduanya sampai berbeda, orang akan
 * mengunduh data yang tidak pernah mereka lihat, dan itu justru pembatasan
 * cakupan yang bocor lewat pintu belakang.
 *
 * Sengaja TIDAK di-cache: unduhan dipicu manual sesekali, sementara cache-nya
 * justru berisiko menyajikan rekap basi pada momen yang paling butuh akurat.
 */
export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp', 'marketing', 'rsm']);
  if (user instanceof NextResponse) return user;

  // Gerbang KEDUA, terpisah dari izin membuka halamannya. Bisa melihat rekap di
  // layar tidak otomatis berarti boleh membawanya pulang sebagai berkas.
  if (!user.bolehUnduh) {
    return NextResponse.json({ error: 'Tidak punya izin mengunduh data' }, { status: 403 });
  }

  const { wilayah, region, depot, q, kodeSap } = terapkanScope(readFilter(request), user);
  const naik = request.nextUrl.searchParams.get('sort') === 'asc';

  const rows = (await db.execute(sql`
    select coalesce(c.nama_toko, r.manual_nama_customer)            as nama,
           c.kode_sap                                              as "kodeSap",
           c.nama_pemilik                                          as "namaPemilik",
           c.pic_rsm_asm                                           as "picRsmAsm",
           coalesce(c.wilayah, pt.wilayah)                         as wilayah,
           coalesce(c.region, pt.region)                           as region,
           coalesce(r.depot_override, c.depot, r.manual_depot, '-') as depot,
           c.qty_undangan::int                                     as "qtyUndangan",
           r.qty_hadir::int                                        as "qtyHadir",
           r.checked_in_at                                         as "checkedInAt",
           r.is_manual_entry                                       as "isManualEntry",
           p.full_name                                             as "dicatatOleh"
    from public.reservations r
    left join public.customers c on c.id = r.customer_id
    left join public.depot_pax_targets pt
      on pt.depot = coalesce(r.depot_override, c.depot, r.manual_depot)
    left join public.profiles p on p.id = r.checked_in_by
    where ${cocokSalahSatu(sql`coalesce(c.wilayah, pt.wilayah)`, wilayah)}
      and ${cocokSalahSatu(sql`coalesce(c.region, pt.region)`, region)}
      and (${kodeSap}::text is null or c.kode_sap = ${kodeSap}::text)
      and ${cocokSalahSatu(sql`coalesce(r.depot_override, c.depot, r.manual_depot)`, depot)}
      and (
        ${q}::text is null
        or coalesce(c.nama_toko, r.manual_nama_customer) ilike '%' || ${q}::text || '%'
        or c.kode_sap ilike '%' || ${q}::text || '%'
      )
    order by r.checked_in_at ${naik ? sql`asc` : sql`desc`}
  `)) as unknown as BarisEkspor[];

  const buffer = await writeExcelFile(rows, {
    columns: KOLOM,
    sheet: 'Kehadiran',
    // Baris header dibekukan supaya nama kolom tetap terlihat saat menggulir
    // ratusan baris - rekap ini memang dibaca sambil dicari-cari.
    stickyRowsCount: 1,
  }).toBuffer();

  // Tanggal ikut di nama berkas supaya unduhan berulang tidak saling menimpa
  // di folder Downloads.
  const stempel = new Date()
    .toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
    .replace(/-/g, '');

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Kehadiran-Pylox-${stempel}.xlsx"`,
      // Rekap kehadiran bukan sesuatu yang boleh mendarat di cache bersama.
      'Cache-Control': 'private, no-store',
    },
  });
}
