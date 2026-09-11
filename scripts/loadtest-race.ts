import { bacaSeededTarget, db, pastikanTrafficDiizinkan } from './loadtest-common';

/**
 * Uji race condition pada /api/order/adjust - bagian 3.d dokumen uji beban.
 *
 * Yang diuji BUKAN kecepatan, melainkan kebenaran: apakah pola baca-cek-tulis
 * (baca total -> cek boleh/tidak -> insert) bisa dibobol dua request yang datang
 * bersamaan. Karena itu hasilnya berlaku juga untuk produksi - yang menentukan
 * adalah penguncian di database, bukan kecepatan server.
 *
 *   BASE_URL=https://xxx.vercel.app npm run loadtest:race
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SERENTAK = Number(process.env.SERENTAK ?? 50);
const AWAL = Number(process.env.AWAL ?? 10);

const kirim = (cookie: string, body: unknown) =>
  fetch(`${BASE}/api/order/adjust`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `pylox_session=${cookie}` },
    body: JSON.stringify(body),
  });

async function main() {
  const target = bacaSeededTarget();
  pastikanTrafficDiizinkan(BASE, target.runId);
  if (target.customers.length < 51) throw new Error('Manifest membutuhkan minimal 51 customer dummy.');
  const sql = db(4, target.runId);
  console.log(`Sasaran: ${BASE}\n`);

  try {
    // ---- Test 1: pengurangan serentak dari SATU toko ----------------------
    const korban = target.customers[0];
    await sql`delete from public.order_adjustments where customer_id = ${korban.id}`;
    // Disisipkan langsung ke ledger, bukan lewat API: kalau lewat API, nilai ini
    // ikut jadi "pengambilan pertama" dan lantainya justru menghalangi penurunan
    // sampai 0 - padahal yang mau diuji di sini penjaga MINUS-nya.
    await sql`update public.customers set dus_awal = null where id = ${korban.id}`;
    await sql`insert into public.order_adjustments (customer_id, qty_change) values (${korban.id}, ${AWAL})`;

    console.log(`Test 1: ${SERENTAK} request "-1" serentak, saldo awal ${AWAL} dus`);
    const t1 = Date.now();
    const hasil = await Promise.all(
      Array.from({ length: SERENTAK }, () => kirim(korban.cookie, { qtyChange: -1 })),
    );
    const ms1 = Date.now() - t1;

    const perStatus = new Map<number, number>();
    for (const r of hasil) perStatus.set(r.status, (perStatus.get(r.status) ?? 0) + 1);
    const sukses = perStatus.get(200) ?? 0;

    const [{ total }] = await sql<{ total: number }[]>`
      select coalesce(sum(qty_change), 0)::int as total
      from public.order_adjustments where customer_id = ${korban.id}`;

    console.log(`  status  : ${[...perStatus].map(([s, n]) => `${s}x${n}`).join('  ')}`);
    console.log(`  berhasil: ${sukses} (harusnya tepat ${AWAL})`);
    console.log(`  total    : ${total} (harusnya tepat 0, tidak boleh minus)`);
    console.log(`  durasi   : ${ms1} ms`);
    const lulus1 = sukses === AWAL && total === 0;
    console.log(`  => ${lulus1 ? 'LULUS' : 'GAGAL - race condition nyata'}\n`);

    // ---- Test 2: penambahan serentak dari BANYAK toko berbeda -------------
    const banyak = target.customers.slice(1, 51);
    for (const c of banyak) {
      await sql`delete from public.order_adjustments where customer_id = ${c.id}`;
      await sql`update public.customers set dus_awal = null where id = ${c.id}`;
    }

    console.log(`Test 2: ${banyak.length} toko berbeda menambah "+1" serentak`);
    const t2 = Date.now();
    const hasil2 = await Promise.all(banyak.map((c) => kirim(c.cookie, { qtyChange: 1 })));
    const ms2 = Date.now() - t2;
    const sukses2 = hasil2.filter((r) => r.status === 200).length;

    console.log(`  berhasil: ${sukses2}/${banyak.length}`);
    console.log(`  durasi   : ${ms2} ms (${(ms2 / banyak.length).toFixed(1)} ms/toko)`);
    // Kalau penguncian dipasang di tingkat tabel, semuanya akan antre dan
    // durasinya kira-kira sama dengan Test 1 dikali jumlah toko.
    console.log(`  => ${sukses2 === banyak.length ? 'LULUS' : 'GAGAL - ada yang tertolak'}\n`);

    // ---- Test 3: verifikasi akhir ----------------------------------------
    const targetIds = target.customers.map((customer) => customer.id);
    const minus = await sql<{ n: number }[]>`
      select count(*)::int as n from (
        select customer_id from public.order_adjustments
        where customer_id in ${sql(targetIds)}
        group by customer_id having sum(qty_change) < 0
      ) s`;
    console.log(`Test 3: toko bertotal minus = ${minus[0].n} (harus 0)`);
    const lulus3 = minus[0].n === 0;
    console.log(`  => ${lulus3 ? 'LULUS' : 'GAGAL'}\n`);

    const semua = lulus1 && sukses2 === banyak.length && lulus3;
    console.log(`HASIL KESELURUHAN: ${semua ? 'LULUS' : 'GAGAL'}`);
    process.exitCode = semua ? 0 : 1;
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
