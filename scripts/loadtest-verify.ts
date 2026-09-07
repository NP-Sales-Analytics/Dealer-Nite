import { db, PREFIX_SAP } from './loadtest-common';

/**
 * Pemeriksaan kebenaran SETELAH uji beban - bagian 3.d Test 3 dan 3.b.
 *
 * Angka latensi tidak ada gunanya kalau datanya rusak, jadi ini yang menentukan
 * lulus atau tidaknya, bukan p95.
 */
async function main() {
  const sql = db(1);
  try {
    let lulus = true;

    // 1. Tidak boleh ada toko bertotal minus. Ini bukti ada/tidaknya race
    //    condition pada baca-cek-tulis di /api/order/adjust.
    const minus = await sql<{ customer_id: string; total: number }[]>`
      select customer_id, sum(qty_change)::int as total
      from public.order_adjustments
      group by customer_id
      having sum(qty_change) < 0`;
    if (minus.length === 0) {
      console.log('  [LULUS] tidak ada toko bertotal minus');
    } else {
      lulus = false;
      console.log(`  [GAGAL] ${minus.length} toko bertotal MINUS - race condition nyata:`);
      for (const m of minus.slice(0, 5)) console.log(`          ${m.customer_id} = ${m.total}`);
    }

    // 2. Tidak boleh ada total di bawah pengambilan pertama.
    const diBawahAwal = await sql<{ n: number }[]>`
      select count(*)::int as n from (
        select c.id, c.dus_awal, coalesce(sum(o.qty_change), 0)::int as total
        from public.customers c
        left join public.order_adjustments o on o.customer_id = c.id
        where c.dus_awal is not null
        group by c.id, c.dus_awal
      ) s where s.total < s.dus_awal`;
    if (diBawahAwal[0].n === 0) {
      console.log('  [LULUS] tidak ada total di bawah pengambilan pertama');
    } else {
      lulus = false;
      console.log(`  [GAGAL] ${diBawahAwal[0].n} toko totalnya di bawah pengambilan pertama`);
    }

    // 3. Satu toko terdaftar = satu baris kehadiran. Dijaga partial unique index,
    //    tapi tetap diperiksa: inilah yang membuktikan idempotency check-in nyata,
    //    bukan sekadar peringatan di UI yang bisa dilewati kalau menembak API.
    const dobel = await sql<{ n: number }[]>`
      select count(*)::int as n from (
        select customer_id from public.reservations
        where customer_id is not null
        group by customer_id having count(*) > 1
      ) s`;
    if (dobel[0].n === 0) {
      console.log('  [LULUS] tidak ada kehadiran ganda untuk toko yang sama');
    } else {
      lulus = false;
      console.log(`  [GAGAL] ${dobel[0].n} toko punya lebih dari satu baris kehadiran`);
    }

    // 4. Ringkasan volume, untuk konteks angka di atas.
    const [ringkas] = await sql<{ toko: number; baris: number; total: number }[]>`
      select (select count(*)::int from public.customers where kode_sap like ${PREFIX_SAP + '%'}) as toko,
             (select count(*)::int from public.order_adjustments) as baris,
             (select coalesce(sum(qty_change), 0)::int from public.order_adjustments) as total`;
    console.log(
      `\n  konteks: ${ringkas.toko} toko dummy, ${ringkas.baris} baris ledger, total ${ringkas.total} dus`,
    );

    console.log(`\n  HASIL: ${lulus ? 'LULUS' : 'GAGAL'}`);
    process.exitCode = lulus ? 0 : 1;
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
