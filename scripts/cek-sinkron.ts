import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { db } from './loadtest-common';

/**
 * Mengukur berapa lama perubahan satu toko terlihat oleh device LAIN.
 *
 * Berdampak kecil dan bersih sendiri: membuat satu toko dummy, menambah 1 dus
 * lewat API sungguhan, mengukur, lalu menghapusnya di blok finally - data asli
 * tidak pernah disentuh. Dengan 1 dus toko ini mustahil masuk podium, jadi tidak
 * ada yang terlihat berubah di layar siapa pun selama pengukuran.
 *
 * Dua angka yang diukur, sengaja dipisah karena penyebabnya beda:
 *   1. insert -> sinyal realtime sampai  (jaringan Supabase)
 *   2. insert -> /api/order/me menyebut angka baru  (TTL papan 2 detik)
 * Yang dirasakan customer = angka 2 + peredam klien 1,5-2,5 detik.
 *
 *   IZINKAN_PRODUKSI=1 npx tsx --env-file=.env.local scripts/cek-sinkron.ts
 */
const BASE = process.env.BASE_URL ?? 'https://pylox.bi-nipponpaint.com';
const TANDA = `CEKSINKRON-${Date.now()}`;
const MAX_AGE_S = 3600;

function cookieCustomer(id: string, secret: string) {
  const body = Buffer.from(`customer:${id}:${Date.now() + MAX_AGE_S * 1000}`).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

async function main() {
  const secret = process.env.AUTH_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!secret || !url || !key) throw new Error('AUTH_SECRET / SUPABASE env belum lengkap.');

  const sql = db(1);
  const supabase = createClient(url, key);

  try {
    const [toko] = await sql<{ id: string }[]>`
      insert into public.customers (nama_toko, kode_sap, region, depot, qty_undangan)
      values (${`${TANDA} TOKO`}, ${TANDA}, '9Z', 'UJI', 1) returning id`;
    const cookie = cookieCustomer(toko.id, secret);

    // Device "penonton": persis yang dilakukan browser customer lain.
    let tSinyal = 0;
    const channel = supabase
      .channel('order_adjustments')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_adjustments' },
        () => {
          if (!tSinyal) tSinyal = Date.now();
        },
      );
    await new Promise<void>((selesai) => {
      channel.subscribe((s) => s === 'SUBSCRIBED' && selesai());
    });
    console.log('Penonton tersambung. Mengirim order...\n');

    const t0 = Date.now();
    const res = await fetch(`${BASE}/api/order/adjust`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `pylox_session=${cookie}` },
      body: JSON.stringify({ qtyChange: 1 }),
    });
    if (!res.ok) throw new Error(`adjust gagal: ${res.status} ${await res.text()}`);
    console.log(`  order tersimpan          : ${Date.now() - t0} ms`);

    // Berapa lama sampai server MENGAKUI angka barunya ke device lain. Diminta
    // berulang seperti klien yang baru saja disenggol sinyal realtime.
    let tTerlihat = 0;
    while (Date.now() - t0 < 15_000) {
      const d = (await (
        await fetch(`${BASE}/api/order/me`, { headers: { cookie: `pylox_session=${cookie}` } })
      ).json()) as { total: number };
      if (d.total === 1) {
        tTerlihat = Date.now();
        break;
      }
    }

    console.log(`  sinyal realtime sampai   : ${tSinyal ? `${tSinyal - t0} ms` : 'TIDAK SAMPAI'}`);
    console.log(`  angka baru terbaca server: ${tTerlihat ? `${tTerlihat - t0} ms` : 'TIDAK MUNCUL <15 dtk'}`);

    if (tSinyal && tTerlihat) {
      const dasar = Math.max(tSinyal, tTerlihat) - t0;
      console.log(
        `\n  Perkiraan yang DIRASAKAN customer di device lain:\n` +
          `    ${((dasar + 1500) / 1000).toFixed(1)} - ${((dasar + 2500) / 1000).toFixed(1)} detik` +
          `  (${dasar} ms + peredam klien 1,5-2,5 dtk)`,
      );
    }

    await supabase.removeChannel(channel);
  } finally {
    const dihapus = await sql`
      delete from public.customers where kode_sap like ${TANDA + '%'} returning id`;
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from public.customers where kode_sap like ${'CEKSINKRON-%'}`;
    console.log(`\nBersih-bersih: ${dihapus.length} toko dummy dihapus, sisa penanda = ${n}`);
    await sql.end();
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
