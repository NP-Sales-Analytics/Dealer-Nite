import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import writeExcelFile from 'write-excel-file/node';
import { requireRoleApi } from '@/lib/auth';
import { cocokSalahSatu, readFilter, terapkanScope } from '@/lib/dashboard/filters';
import { db } from '@/lib/db';

type BarisEkspor = {
  namaToko: string;
  kodeSap: string;
  namaPemilik: string | null;
  picRsmAsm: string | null;
  wilayah: string | null;
  region: string | null;
  depot: string | null;
  total: number;
  dusAwal: number | null;
  jumlahAdjustment: number;
  terakhir: string | null;
  qtyHadir: number | null;
  qtyUndangan: number | null;
  checkedInAt: string | null;
};

/**
 * Waktu ditulis sebagai TEKS ber-zona Jakarta, bukan tanggal Excel - alasan
 * yang sama dengan ekspor kehadiran: Excel menyimpan tanggal tanpa zona
 * sementara fungsi ini berjalan di server ber-UTC, jadi menuliskannya sebagai
 * tanggal berarti menyerahkan penafsiran zonanya ke komputer yang membukanya.
 */
const waktuWib = (v: string | null) =>
  v === null
    ? ''
    : new Date(v)
        .toLocaleString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta',
        })
        .replace(',', '')
        .replace(/\./g, ':');

const header = (teks: string) => ({
  value: teks,
  fontWeight: 'bold' as const,
  backgroundColor: '#EEF2FF',
  align: 'center' as const,
});

const teks = (v: string | null) => ({ value: v ?? '' });
const angka = (v: number | null | undefined) => ({
  value: v ?? undefined,
  type: Number,
  align: 'center' as const,
});

const KOLOM = [
  { header: header('Nama Toko'), width: 34, cell: (r: BarisEkspor) => teks(r.namaToko) },
  { header: header('Kode SAP'), width: 12, cell: (r: BarisEkspor) => teks(r.kodeSap) },
  { header: header('Nama Pemilik'), width: 24, cell: (r: BarisEkspor) => teks(r.namaPemilik) },
  { header: header('PIC RSM/ASM'), width: 22, cell: (r: BarisEkspor) => teks(r.picRsmAsm) },
  { header: header('Wilayah'), width: 18, cell: (r: BarisEkspor) => teks(r.wilayah) },
  { header: header('Region'), width: 10, cell: (r: BarisEkspor) => teks(r.region) },
  { header: header('Depot'), width: 18, cell: (r: BarisEkspor) => teks(r.depot) },
  // Kehadiran ikut diekspor: rekap order dan rekap kehadiran selalu dibaca
  // berbarengan, dan menggabungkan dua berkas terpisah di Excel jauh lebih
  // repot daripada menyertakan tiga kolom di sini.
  {
    header: header('Kehadiran'),
    width: 14,
    cell: (r: BarisEkspor) => teks(r.qtyHadir === null ? 'Belum Hadir' : 'Sudah Hadir'),
  },
  { header: header('Qty Undangan'), width: 14, cell: (r: BarisEkspor) => angka(r.qtyUndangan) },
  { header: header('Qty Hadir'), width: 11, cell: (r: BarisEkspor) => angka(r.qtyHadir) },
  {
    header: header('Waktu Hadir (WIB)'),
    width: 20,
    cell: (r: BarisEkspor) => teks(waktuWib(r.checkedInAt)),
  },
  { header: header('Total Dus'), width: 12, cell: (r: BarisEkspor) => angka(r.total) },
  { header: header('Pengambilan Pertama'), width: 20, cell: (r: BarisEkspor) => angka(r.dusAwal) },
  {
    header: header('Jumlah Penyesuaian'),
    width: 18,
    cell: (r: BarisEkspor) => angka(r.jumlahAdjustment),
  },
  {
    header: header('Pengambilan Terakhir (WIB)'),
    width: 26,
    cell: (r: BarisEkspor) => teks(waktuWib(r.terakhir)),
  },
];

/**
 * Unduhan rekap order sebagai berkas Excel.
 *
 * Memakai kondisi WHERE dan terapkanScope yang SAMA dengan /api/order/list,
 * jadi isi berkasnya persis daftar yang sedang dilihat - termasuk pembatasan
 * region untuk RSM.
 *
 * LEFT JOIN ke agregat, bukan INNER: toko yang belum mengambil dus sama sekali
 * tetap ikut terekspor dengan angka 0. Rekap ini justru dipakai untuk mencari
 * mereka.
 */
export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp', 'marketing', 'rsm']);
  if (user instanceof NextResponse) return user;

  // Gerbang kedua, terpisah dari izin membuka halamannya - berkas yang sudah
  // terunduh bisa dikirim ke mana saja dan tidak bisa ditarik kembali.
  if (!user.bolehUnduh) {
    return NextResponse.json({ error: 'Tidak punya izin mengunduh data' }, { status: 403 });
  }

  const { wilayah, region, depot, q, kodeSap } = terapkanScope(readFilter(request), user);
  const naik = request.nextUrl.searchParams.get('sort') === 'asc';

  const rows = (await db.execute(sql`
    with agg as (
      select customer_id,
             sum(qty_change)::int as total,
             max(created_at) as last_at,
             count(*)::int as jml
      from public.order_adjustments
      group by customer_id
    )
    select c.nama_toko     as "namaToko",
           c.kode_sap      as "kodeSap",
           c.nama_pemilik  as "namaPemilik",
           c.pic_rsm_asm   as "picRsmAsm",
           c.wilayah, c.region, c.depot,
           c.dus_awal      as "dusAwal",
           coalesce(a.total, 0)::int as total,
           coalesce(a.jml, 0)::int   as "jumlahAdjustment",
           a.last_at       as "terakhir",
           r.qty_hadir::int    as "qtyHadir",
           c.qty_undangan::int as "qtyUndangan",
           r.checked_in_at     as "checkedInAt"
    from public.customers c
    left join agg a on a.customer_id = c.id
    left join public.reservations r on r.customer_id = c.id
    where ${cocokSalahSatu(sql`c.wilayah`, wilayah)}
      and ${cocokSalahSatu(sql`c.region`, region)}
      and (${kodeSap}::text is null or c.kode_sap = ${kodeSap}::text)
      and ${cocokSalahSatu(sql`coalesce(nullif(trim(c.depot), ''), '(Tanpa Depot)')`, depot)}
      and (${q}::text is null
        or c.nama_toko ilike '%' || ${q}::text || '%'
        or c.kode_sap ilike '%' || ${q}::text || '%')
    order by a.last_at ${naik ? sql`asc nulls last` : sql`desc nulls last`}, c.nama_toko asc
  `)) as unknown as BarisEkspor[];

  const buffer = await writeExcelFile(rows, {
    columns: KOLOM,
    sheet: 'Detail Order',
    stickyRowsCount: 1,
  }).toBuffer();

  const stempel = new Date()
    .toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
    .replace(/-/g, '');

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Detail-Order-Pylox-${stempel}.xlsx"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
