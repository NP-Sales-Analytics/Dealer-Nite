import { writeFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { db, PREFIX_SAP, TANDA } from './loadtest-common';

/**
 * Menyiapkan data dummy di database STAGING untuk uji beban.
 *
 *   npm run loadtest:seed        -> 200 toko dummy
 *   npm run loadtest:seed 500    -> 500 toko dummy
 *
 * Menulis load-tests/data/target.json berisi daftar id + cookie sesi siap pakai,
 * supaya k6 tidak perlu login (login aplikasi ini server action, bukan endpoint).
 *
 * Semua baris ditandai LOADTEST dan bisa dibuang total lewat npm run loadtest:reset.
 */
const JUMLAH = Number(process.argv[2] ?? 200);
const WILAYAH = ['Indonesia Barat', 'Indonesia Timur'];
const REGION = ['3A', '3B', '2C', '5A', '1P'];
const DEPOT = ['1A Jakarta', '1D THK', '3E Malang', '4A Medan', '5O Serpong'];

const MAX_AGE_S = 12 * 3600;

/** Sama persis dengan signSession di lib/session.ts. */
function cookieSesi(kind: 'team' | 'customer', id: string, secret: string) {
  const body = Buffer.from(`${kind}:${id}:${Date.now() + MAX_AGE_S * 1000}`).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

async function main() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET belum diset (harus sama dengan yang dipakai server target).');

  const sql = db();
  try {
    // Idempoten: sisa run sebelumnya dibuang dulu.
    await sql`delete from public.customers where kode_sap like ${PREFIX_SAP + '%'}`;
    await sql`delete from public.profiles where full_name like ${TANDA + '%'}`;

    const toko: { id: string; kodeSap: string }[] = [];
    for (let i = 0; i < JUMLAH; i++) {
      const kodeSap = `${PREFIX_SAP}${String(i).padStart(6, '0')}`;
      const [row] = await sql<{ id: string }[]>`
        insert into public.customers (nama_toko, kode_sap, wilayah, region, depot, qty_undangan)
        values (
          ${`${TANDA} TOKO ${i}`}, ${kodeSap},
          ${WILAYAH[i % WILAYAH.length]}, ${REGION[i % REGION.length]},
          ${DEPOT[i % DEPOT.length]}, 2
        )
        returning id`;
      toko.push({ id: row.id, kodeSap });
    }

    // Satu akun staff dummy untuk skenario search + check-in + staff order.
    const [staff] = await sql<{ id: string }[]>`
      insert into public.profiles (full_name, role, password_hash, allowed_pages)
      values (${`${TANDA} STAFF`}, 'superadmin',
              ${createHmac('sha256', secret).update(`${TANDA}-pass`).digest('hex')},
              '{}')
      returning id`;

    const target = {
      dibuat: new Date().toISOString(),
      staff: { id: staff.id, cookie: cookieSesi('team', staff.id, secret) },
      customers: toko.map((t) => ({
        id: t.id,
        kodeSap: t.kodeSap,
        cookie: cookieSesi('customer', t.id, secret),
      })),
    };
    writeFileSync('load-tests/data/target.json', JSON.stringify(target, null, 2));

    console.log(`${toko.length} toko dummy + 1 staff dummy dibuat.`);
    console.log('load-tests/data/target.json ditulis (berisi cookie sesi siap pakai).');
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
