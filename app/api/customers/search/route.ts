import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { requireRoleApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  const { ok } = await rateLimit(`search:${user.id}`);
  if (!ok) return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  // word_similarity (operator <%), BUKAN similarity (%): similarity membandingkan
  // seluruh string, sehingga query pendek vs nama toko panjang selalu di bawah
  // threshold 0.3 (terukur: 'pantalli' vs 'PT.PANTALI BERKAH SENTOSA' = 0.259 -> gagal).
  // word_similarity mencocokkan ke potongan terbaik: 0.700 -> lolos. Sama-sama pakai GIN.
  const rows = await db.execute(sql`
    select
      c.id,
      c.nama_toko    as "namaToko",
      c.kode_sap     as "kodeSap",
      c.depot,
      c.wilayah,
      c.region,
      c.nama_pemilik as "namaPemilik",
      c.qty_undangan as "qtyUndangan",
      r.id is not null as "sudahHadir",
      r.qty_hadir    as "qtyHadirSebelumnya"
    from public.customers c
    left join public.reservations r on r.customer_id = c.id
    where c.nama_toko ilike '%' || ${q} || '%'
       or c.kode_sap  ilike '%' || ${q} || '%'
       or ${q} <% c.nama_toko
    order by greatest(word_similarity(${q}, c.nama_toko), similarity(c.kode_sap, ${q})) desc,
             c.nama_toko asc
    limit 10
  `);

  return NextResponse.json({ results: rows });
}
