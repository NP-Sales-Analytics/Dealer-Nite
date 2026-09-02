import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { db } from '@/lib/db';

const PAGE_SIZE = 20;

// Tidak di-cache: daftar ini bisa diedit dari layar yang sama, jadi hasilnya
// harus langsung mencerminkan perubahan. Query-nya ringan (limit 20 + count).
export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'rsm', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') ?? '1') || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const rows = await db.execute(sql`
    select r.id,
           coalesce(c.nama_toko, r.manual_nama_customer)                  as nama,
           coalesce(r.depot_override, c.depot, r.manual_depot, '-')       as depot,
           c.kode_sap                                                     as "kodeSap",
           r.qty_hadir::int                                               as "qtyHadir",
           c.qty_undangan::int                                            as "qtyUndangan",
           r.checked_in_at                                                as "checkedInAt",
           r.is_manual_entry                                              as "isManualEntry",
           r.depot_override is not null                                   as "depotDiubah"
    from public.reservations r
    left join public.customers c on c.id = r.customer_id
    order by r.checked_in_at desc
    limit ${PAGE_SIZE} offset ${offset}
  `);

  const totalRows = (await db.execute(sql`
    select count(*)::int as total from public.reservations
  `)) as unknown as { total: number }[];
  const total = totalRows[0]?.total ?? 0;

  return NextResponse.json({
    rows,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}
