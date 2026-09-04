import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posisiSaya, TOP_N, type LeaderRow } from '@/lib/order/leaderboard';
import { getSession } from '@/lib/session';

export async function GET() {
  // Leaderboard bukan publik lagi: butuh sesi (tim atau customer) apa pun.
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  /**
   * kode_sap ADALAH kredensial login customer (lihat app/(auth)/login/actions.ts).
   * Jadi papan peringkat TIDAK boleh mengirimkannya ke sesi customer: satu orang
   * cukup membuka DevTools untuk memanen kode seluruh toko lalu masuk sebagai
   * mereka. Menyembunyikannya di UI saja tidak menolong - pemangkasan harus di
   * sini. Sesi tim tetap menerimanya karena memang dipakai untuk mencari toko.
   */
  const untukTim = session.kind === 'team';

  // Peringkat: dus terbanyak menang; kalau seri, yang LEBIH DULU mencapai angka
  // itu menang (max(created_at) paling awal). row_number(), bukan rank(), supaya
  // nomornya selalu urut tanpa kembar/lompat.
  const baris = (await db.execute(sql`
    with totals as (
      select customer_id,
             sum(qty_change)::int as total,
             max(created_at) as last_at
      from public.order_adjustments
      group by customer_id
      having sum(qty_change) > 0
    )
    select t.customer_id as "customerId", t.total,
           row_number() over (order by t.total desc, t.last_at asc)::int as rank,
           c.nama_toko as "namaToko", c.kode_sap as "kodeSap",
           c.wilayah, c.region, c.depot
    from totals t
    join public.customers c on c.id = t.customer_id
    order by rank asc
    limit ${TOP_N}
  `)) as unknown as Required<LeaderRow>[];

  // Daftar-putih, bukan daftar-hitam: kolom baru di query tidak akan ikut bocor
  // ke customer kecuali sengaja ditambahkan di sini.
  const top: LeaderRow[] = untukTim
    ? baris
    : baris.map((r) => ({
        customerId: r.customerId,
        namaToko: r.namaToko,
        depot: r.depot,
        total: r.total,
        rank: r.rank,
      }));

  const customerId = session.kind === 'customer' ? session.id : null;
  let me = null;
  if (customerId) {
    // Urutan tie-break di sini WAJIB sama dengan papan di atas, kalau tidak
    // baris "saya" bisa menyebut nomor yang berbeda dari daftarnya.
    const rows = (await db.execute(sql`
      with totals as (
        select customer_id,
               sum(qty_change)::int as total,
               max(created_at) as last_at
        from public.order_adjustments
        group by customer_id
        having sum(qty_change) > 0
      ),
      mine as (
        select coalesce(sum(qty_change), 0)::int as total, max(created_at) as last_at
        from public.order_adjustments where customer_id = ${customerId}
      )
      select c.id as "customerId", c.nama_toko as "namaToko", c.depot, m.total,
             (select count(*) from totals t
               where t.total > m.total
                  or (t.total = m.total and t.last_at < m.last_at))::int as "jumlahDiAtas"
      from public.customers c, mine m
      where c.id = ${customerId}
    `)) as unknown as {
      customerId: string;
      namaToko: string;
      depot: string | null;
      total: number;
      jumlahDiAtas: number;
    }[];
    const row = rows[0];
    if (row) {
      const { jumlahDiAtas, ...info } = row;
      me = { ...info, rank: posisiSaya(row.total, jumlahDiAtas) };
    }
  }

  return NextResponse.json({ top, me });
}
