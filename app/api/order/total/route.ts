import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRoleApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { posisiSaya } from '@/lib/order/leaderboard';

// Total dus + posisi ranking sebuah toko, untuk panel staff "Tambah Order".
// Khusus staff: customer melihat miliknya sendiri lewat /api/order/me.
export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  const id = request.nextUrl.searchParams.get('customerId') ?? '';
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'customerId tidak valid' }, { status: 400 });
  }

  // Tie-break sama dengan /api/order/leaderboard: seri dimenangkan yang lebih
  // dulu mencapai angkanya.
  const rows = (await db.execute(sql`
    with totals as (
      select customer_id, sum(qty_change)::int as total, max(created_at) as last_at
      from public.order_adjustments
      group by customer_id
      having sum(qty_change) > 0
    ),
    mine as (
      select coalesce(sum(qty_change), 0)::int as total, max(created_at) as last_at
      from public.order_adjustments where customer_id = ${id}
    )
    select m.total,
           (select count(*) from totals t
             where t.total > m.total
                or (t.total = m.total and t.last_at < m.last_at))::int as "jumlahDiAtas"
    from mine m
  `)) as unknown as { total: number; jumlahDiAtas: number }[];

  const row = rows[0] ?? { total: 0, jumlahDiAtas: 0 };
  return NextResponse.json({ total: row.total, rank: posisiSaya(row.total, row.jumlahDiAtas) });
}
