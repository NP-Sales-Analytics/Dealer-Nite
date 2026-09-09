import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { cacheDashboard } from '@/lib/dashboard/cache';
import { cocokSalahSatu, readFilter, terapkanScope } from '@/lib/dashboard/filters';

const PAGE_SIZE = 20;

// Di-cache 5 detik. Setiap klien mem-poll daftar ini tiap 15 detik, jadi tanpa
// cache 100 admin berarti 200 query DB per 15 detik (baris + hitungan total).
// Penulisan catatan membersihkan cache seketika lewat bersihkanCacheDashboard(),
// sehingga admin yang baru mengedit langsung melihat hasilnya.
const load = cacheDashboard(async (key: string) => {
  const { wilayah, region, depot, q, kodeSap, page, sort } = JSON.parse(key) as {
    wilayah: string | null; region: string[]; depot: string[];
    q: string | null; kodeSap: string | null; page: number; sort: 'asc' | 'desc';
  };
  const naik = sort === 'asc';
  const offset = (page - 1) * PAGE_SIZE;

  // Satu definisi kondisi dipakai untuk data maupun hitungan total, supaya
  // nomor halaman tidak pernah berbeda dari isinya.
  const kondisi = sql`
    (${wilayah}::text is null or c.wilayah = ${wilayah}::text)
    and ${cocokSalahSatu(sql`c.region`, region)}
    and (${kodeSap}::text is null or c.kode_sap = ${kodeSap}::text)
    and ${cocokSalahSatu(sql`coalesce(r.depot_override, c.depot, r.manual_depot)`, depot)}
    and (
      ${q}::text is null
      or coalesce(c.nama_toko, r.manual_nama_customer) ilike '%' || ${q}::text || '%'
      or c.kode_sap ilike '%' || ${q}::text || '%'
    )
  `;

  const rows = await db.execute(sql`
    select r.id,
           coalesce(c.nama_toko, r.manual_nama_customer)                  as nama,
           coalesce(r.depot_override, c.depot, r.manual_depot, '-')       as depot,
           c.kode_sap                                                     as "kodeSap",
           c.region                                                       as region,
           c.wilayah                                                      as wilayah,
           c.nama_pemilik                                                 as "namaPemilik",
           c.pic_rsm_asm                                                  as "picRsmAsm",
           r.qty_hadir::int                                               as "qtyHadir",
           c.qty_undangan::int                                            as "qtyUndangan",
           r.checked_in_at                                                as "checkedInAt",
           r.is_manual_entry                                              as "isManualEntry",
           r.depot_override is not null                                   as "depotDiubah"
    from public.reservations r
    left join public.customers c on c.id = r.customer_id
    where ${kondisi}
    order by r.checked_in_at ${naik ? sql`asc` : sql`desc`}
    limit ${PAGE_SIZE} offset ${offset}
  `);

  const totalRows = (await db.execute(sql`
    select count(*)::int as total
    from public.reservations r
    left join public.customers c on c.id = r.customer_id
    where ${kondisi}
  `)) as unknown as { total: number }[];
  const total = totalRows[0]?.total ?? 0;

  return {
    rows,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}, 5_000);

export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'rsm', 'admin_rsvp', 'marketing']);
  if (user instanceof NextResponse) return user;

  // Cakupan user dipaksakan di sini, bukan dipercayakan ke query string.
  const { wilayah, region, depot, q, kodeSap } = terapkanScope(readFilter(request), user);
  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') ?? '1') || 1);
  // Default terbaru dulu; 'asc' untuk melihat siapa yang datang paling awal.
  const sort = request.nextUrl.searchParams.get('sort') === 'asc' ? 'asc' : 'desc';

  // Kunci sebagai JSON: nama depot dan kata pencarian bisa berisi karakter
  // apa pun, jadi tidak ada pemisah yang benar-benar aman.
  const key = JSON.stringify({ wilayah, region, depot, q, kodeSap, page, sort });
  return NextResponse.json(await load(key));
}
