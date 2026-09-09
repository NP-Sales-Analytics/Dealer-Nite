import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { cacheDashboard } from '@/lib/dashboard/cache';
import { cocokSalahSatu, readFilter, terapkanScope } from '@/lib/dashboard/filters';
import { db } from '@/lib/db';

const PAGE_SIZE = 20;

export type OrderRow = {
  customerId: string;
  namaToko: string;
  kodeSap: string;
  namaPemilik: string | null;
  depot: string | null;
  wilayah: string | null;
  region: string | null;
  total: number;
  dusAwal: number | null;
  terakhir: string | null;
  jumlahAdjustment: number;
};

export type OrderListResponse = {
  rows: OrderRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type Kunci = {
  wilayah: string | null;
  region: string[];
  depot: string[];
  q: string | null;
  kodeSap: string | null;
  page: number;
  naik: boolean;
};

/**
 * Daftar seluruh master customer beserta rekap ordernya.
 *
 * LEFT JOIN, bukan INNER: toko yang belum mengambil dus sama sekali tetap harus
 * muncul dengan angka 0 - halaman ini justru dipakai untuk merekap mereka.
 */
const load = cacheDashboard(async (key: string) => {
  const { wilayah, region, depot, q, kodeSap, page, naik }: Kunci = JSON.parse(key);
  const offset = (page - 1) * PAGE_SIZE;

  // Satu fragmen kondisi dipakai bersama query baris dan query hitung, supaya
  // nomor halaman tidak pernah berbeda dari isinya.
  const kondisi = sql`
    (${wilayah}::text is null or c.wilayah = ${wilayah}::text)
    and ${cocokSalahSatu(sql`c.region`, region)}
    and (${kodeSap}::text is null or c.kode_sap = ${kodeSap}::text)
    and ${cocokSalahSatu(sql`coalesce(nullif(trim(c.depot), ''), '(Tanpa Depot)')`, depot)}
    and (${q}::text is null
      or c.nama_toko ilike '%' || ${q}::text || '%'
      or c.kode_sap ilike '%' || ${q}::text || '%')
  `;

  const rows = (await db.execute(sql`
    with agg as (
      select customer_id,
             sum(qty_change)::int as total,
             max(created_at) as last_at,
             count(*)::int as jml
      from public.order_adjustments
      group by customer_id
    )
    select c.id            as "customerId",
           c.nama_toko     as "namaToko",
           c.kode_sap      as "kodeSap",
           c.nama_pemilik  as "namaPemilik",
           c.depot, c.wilayah, c.region,
           c.dus_awal      as "dusAwal",
           coalesce(a.total, 0)::int as total,
           a.last_at       as "terakhir",
           coalesce(a.jml, 0)::int   as "jumlahAdjustment"
    from public.customers c
    left join agg a on a.customer_id = c.id
    where ${kondisi}
    order by a.last_at ${naik ? sql`asc nulls last` : sql`desc nulls last`}, c.nama_toko asc
    limit ${PAGE_SIZE} offset ${offset}
  `)) as unknown as OrderRow[];

  const [{ total }] = (await db.execute(sql`
    select count(*)::int as total from public.customers c where ${kondisi}
  `)) as unknown as { total: number }[];

  const hasil: OrderListResponse = {
    rows,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
  return hasil;
}, 5_000);

export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp', 'marketing', 'rsm']);
  if (user instanceof NextResponse) return user;

  // terapkanScope SESUDAH readFilter dan SEBELUM kunci cache - inilah yang
  // mengunci RSM ke region-nya dan mencegah dua cakupan berbagi entri cache.
  const f = terapkanScope(readFilter(request), user);
  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page')) || 1);
  const naik = request.nextUrl.searchParams.get('sort') === 'asc';

  // JSON.stringify, bukan gabungan berpemisah: nama depot dan teks pencarian
  // bisa memuat karakter apa pun, jadi tidak ada pemisah yang benar-benar aman.
  const kunci: Kunci = { ...f, page, naik };
  return NextResponse.json(await load(JSON.stringify(kunci)));
}
