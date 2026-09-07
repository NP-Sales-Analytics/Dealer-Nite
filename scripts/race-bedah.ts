import { createHmac } from 'node:crypto';
import { db } from './loadtest-common';

/**
 * Uji race condition BERDAMPAK KECIL, aman dijalankan ke produksi.
 *
 * Membuat toko dummy sendiri, menembaknya, lalu menghapusnya - data asli tidak
 * pernah disentuh. Yang diuji kebenaran, bukan kecepatan: apakah pola
 * baca-cek-tulis di /api/order/adjust bisa dibobol dua request bersamaan.
 * Karena yang menentukan adalah penguncian Postgres, hasilnya berlaku apa adanya
 * untuk malam event.
 *
 *   IZINKAN_PRODUKSI=1 BASE_URL=https://... npm run race:bedah
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SERENTAK = Number(process.env.SERENTAK ?? 30);
const AWAL = Number(process.env.AWAL ?? 10);
const TOKO_PARALEL = Number(process.env.TOKO_PARALEL ?? 20);

const TANDA = `RACEBEDAH-${Date.now()}`;
const MAX_AGE_S = 12 * 3600;

/** Sama persis dengan signSession di lib/session.ts. */
function cookieCustomer(id: string, secret: string) {
  const body = Buffer.from(`customer:${id}:${Date.now() + MAX_AGE_S * 1000}`).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

const adjust = (cookie: string, qtyChange: number) =>
  fetch(`${BASE}/api/order/adjust`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `pylox_session=${cookie}` },
    body: JSON.stringify({ qtyChange }),
  });

async function main() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET belum diset.');

  const sql = db();
  let lulus1 = false;
  let lulus2 = false;
  let lulus3 = false;

  try {
    console.log(`Sasaran : ${BASE}`);
    console.log(`Penanda : ${TANDA}\n`);

    // ---- Test 1: pengurangan serentak dari SATU toko ---------------------
    const [t1] = await sql<{ id: string }[]>`
      insert into public.customers (nama_toko, kode_sap, region, depot, qty_undangan)
      values (${`${TANDA} A`}, ${`${TANDA}-A`}, '9Z', 'UJI', 1) returning id`;
    // Saldo awal disisipkan langsung ke ledger, BUKAN lewat API: kalau lewat API
    // nilai ini ikut jadi "pengambilan pertama", dan lantainya justru
    // menghalangi penurunan sampai 0 - padahal yang diuji penjaga MINUS-nya.
    await sql`insert into public.order_adjustments (customer_id, qty_change) values (${t1.id}, ${AWAL})`;
    // dus_awal dipatok 0, BUKAN dibiarkan null. Kalau null, adjust pertama yang
    // berhasil akan menetapkannya sendiri (= total saat itu), dan lantai itu
    // langsung memblokir penurunan berikutnya - yang teruji jadi aturan lantai,
    // bukan penjaga MINUS yang ingin kita periksa di sini.
    await sql`update public.customers set dus_awal = 0 where id = ${t1.id}`;

    const ck = cookieCustomer(t1.id, secret);
    console.log(`Test 1: ${SERENTAK} request "-1" SERENTAK, saldo awal ${AWAL} dus`);
    const mulai1 = Date.now();
    const balasan = await Promise.all(
      Array.from({ length: SERENTAK }, () => adjust(ck, -1)),
    );
    const durasi1 = Date.now() - mulai1;

    // Alasan penolakan dibaca dari body: 409 bisa berarti NEGATIVE (yang sedang
    // diuji) atau DI_BAWAH_AWAL/TENGGAT_HABIS (aturan lain). Tanpa dibedakan,
    // hasilnya gampang disalahartikan sebagai race condition.
    const perStatus = new Map<string, number>();
    for (const r of balasan) {
      let label = String(r.status);
      if (r.status === 409) {
        try {
          const b = (await r.json()) as { code?: string };
          label = `409 ${b.code ?? '?'}`;
        } catch {
          label = '409 ?';
        }
      }
      perStatus.set(label, (perStatus.get(label) ?? 0) + 1);
    }
    const sukses = perStatus.get('200') ?? 0;

    const [{ total }] = await sql<{ total: number }[]>`
      select coalesce(sum(qty_change), 0)::int as total
      from public.order_adjustments where customer_id = ${t1.id}`;

    console.log(`  status   : ${[...perStatus].map(([k, n]) => `${k} x${n}`).join('   ')}`);
    console.log(`  berhasil : ${sukses}  (harus tepat ${AWAL})`);
    console.log(`  total    : ${total}  (harus tepat 0, tidak boleh minus)`);
    console.log(`  durasi   : ${durasi1} ms`);
    lulus1 = sukses === AWAL && total === 0;
    console.log(`  => ${lulus1 ? 'LULUS' : 'GAGAL - race condition NYATA'}\n`);

    // ---- Test 2: penambahan serentak dari BANYAK toko berbeda ------------
    const paralel: string[] = [];
    for (let i = 0; i < TOKO_PARALEL; i++) {
      const [c] = await sql<{ id: string }[]>`
        insert into public.customers (nama_toko, kode_sap, region, depot, qty_undangan)
        values (${`${TANDA} P${i}`}, ${`${TANDA}-P${i}`}, '9Z', 'UJI', 1) returning id`;
      paralel.push(c.id);
    }

    console.log(`Test 2: ${TOKO_PARALEL} toko BERBEDA menambah "+1" serentak`);
    const mulai2 = Date.now();
    const balasan2 = await Promise.all(
      paralel.map((id) => adjust(cookieCustomer(id, secret), 1)),
    );
    const durasi2 = Date.now() - mulai2;
    const sukses2 = balasan2.filter((r) => r.status === 200).length;

    console.log(`  berhasil : ${sukses2}/${TOKO_PARALEL}`);
    console.log(`  durasi   : ${durasi2} ms  (${(durasi2 / TOKO_PARALEL).toFixed(1)} ms/toko)`);
    // Kalau penguncian dipasang di tingkat tabel, semuanya antre dan durasinya
    // akan mendekati jumlah toko dikali waktu satu request.
    lulus2 = sukses2 === TOKO_PARALEL;
    console.log(`  => ${lulus2 ? 'LULUS' : 'GAGAL - ada yang tertolak'}\n`);

    // ---- Test 3: verifikasi menyeluruh ----------------------------------
    const [{ n: minus }] = await sql<{ n: number }[]>`
      select count(*)::int as n from (
        select customer_id from public.order_adjustments
        group by customer_id having sum(qty_change) < 0
      ) s`;
    console.log(`Test 3: toko bertotal minus di SELURUH database = ${minus} (harus 0)`);
    lulus3 = minus === 0;
    console.log(`  => ${lulus3 ? 'LULUS' : 'GAGAL'}\n`);
  } finally {
    // Selalu dibersihkan, termasuk kalau gagal di tengah. Cascade ikut membuang
    // ledger toko dummy, jadi tidak ada sisa di database produksi.
    const dihapus = await sql`
      delete from public.customers where kode_sap like ${TANDA + '%'} returning id`;
    const [{ n: sisa }] = await sql<{ n: number }[]>`
      select count(*)::int as n from public.customers where kode_sap like ${'RACEBEDAH-%'}`;
    console.log(`Bersih-bersih: ${dihapus.length} toko dummy dihapus, sisa penanda = ${sisa}`);
    await sql.end();
  }

  const semua = lulus1 && lulus2 && lulus3;
  console.log(`\nHASIL: ${semua ? 'LULUS' : 'GAGAL'}`);
  process.exitCode = semua ? 0 : 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
