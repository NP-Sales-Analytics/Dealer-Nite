import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { db } from './loadtest-common';

/**
 * Badai realtime: yang TIDAK diuji oleh k6 sama sekali.
 *
 * k6 memberi tiap VU jeda acak yang independen, sehingga requestnya mengalir
 * MERATA. Pola sesungguhnya justru kebalikannya: satu order masuk, Supabase
 * menyiarkannya ke SEMUA klien, dan seluruhnya menembak dalam jendela sempit
 * yang sama. Puncak sesaatnya bisa berkali lipat dari rata-rata yang diukur k6,
 * dan puncak itulah yang menjatuhkan server, bukan rata-ratanya.
 *
 * Karena itu skrip ini membuka koneksi Realtime SUNGGUHAN, bukan mensimulasikan
 * protokolnya - satu-satunya cara membuktikan perilaku yang sebenarnya.
 *
 *   IZINKAN_PRODUKSI=1 npx tsx --env-file=.env.local scripts/cek-badai.ts
 *   KLIEN=180 ORDER=10 ... (batas koneksi: naikkan KLIEN sampai SUBSCRIBED gagal)
 */
const BASE = process.env.BASE_URL ?? 'https://pylox.bi-nipponpaint.com';
const KLIEN = Number(process.env.KLIEN ?? 150);
const ORDER = Number(process.env.ORDER ?? 8);
/**
 * ORDER=0 menjadikan proses ini PENDENGAR saja - tidak memicu order sendiri.
 *
 * Gunanya membedakan dua sebab yang gejalanya sama: kalau 150 koneksi dalam SATU
 * proses Node kehilangan separuh event, itu bisa berarti Supabase membatasi
 * penyiaran, ATAU event loop proses ini yang jenuh. Menyebar jumlah koneksi yang
 * sama ke beberapa proses memisahkan keduanya - di produksi tiap device punya
 * proses dan jaringannya sendiri, jadi kejenuhan satu proses tidak berlaku.
 */
const PENDENGAR = ORDER === 0;
const JEDA_ORDER_MS = Number(process.env.JEDA_ORDER_MS ?? 4_000);

// Harus sama dengan lib/order/use-realtime-refresh.ts - kalau di sana diubah,
// di sini ikut, kalau tidak yang diukur bukan perilaku yang dikirim ke pengguna.
const TUNDA_MS = 1_500;
const JITTER_MS = 1_000;

const TANDA = `BADAI-${Date.now()}`;
const MAX_AGE_S = 3600;

function cookieCustomer(id: string, secret: string) {
  const body = Buffer.from(`customer:${id}:${Date.now() + MAX_AGE_S * 1000}`).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

const persentil = (a: number[], p: number) =>
  a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor((a.length * p) / 100))] : 0;

async function main() {
  const secret = process.env.AUTH_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!secret || !url || !key) throw new Error('AUTH_SECRET / SUPABASE env belum lengkap.');

  const target = JSON.parse(readFileSync('load-tests/data/target.json', 'utf8')) as {
    customers: { id: string; cookie: string }[];
  };
  if (!target.customers?.length) throw new Error('target.json kosong - jalankan loadtest:target dulu.');

  const sql = db(1);
  const klien: { sb: SupabaseClient; ch: RealtimeChannel }[] = [];

  // Latensi tiap refetch, dan cap waktu tiap request untuk menghitung puncak.
  const latensi: number[] = [];
  const capWaktu: number[] = [];
  let gagal = 0;
  let eventDiterima = 0;
  let tersambung = 0;

  try {
    console.log(`Sasaran : ${BASE}`);
    console.log(`Klien   : ${KLIEN} koneksi Realtime sungguhan`);
    console.log(`Order   : ${ORDER} kali, tiap ${JEDA_ORDER_MS} ms\n`);

    // --- Buka N koneksi, tiap klien berperilaku seperti browser sungguhan ----
    console.log('Menyambungkan...');
    await Promise.all(
      Array.from({ length: KLIEN }, async (_, i) => {
        const akun = target.customers[i % target.customers.length];
        const sb = createClient(url, key);
        let timer: ReturnType<typeof setTimeout> | null = null;

        // Peredam yang sama persis dengan useRealtimeRefresh.
        const jadwalkan = () => {
          if (timer) return;
          timer = setTimeout(async () => {
            timer = null;
            const t0 = Date.now();
            try {
              const r = await fetch(`${BASE}/api/order/me`, {
                headers: { cookie: `pylox_session=${akun.cookie}` },
              });
              if (!r.ok) gagal++;
              else {
                latensi.push(Date.now() - t0);
                capWaktu.push(Date.now());
              }
            } catch {
              gagal++;
            }
          }, TUNDA_MS + Math.random() * JITTER_MS);
        };

        const ch = sb
          .channel('order_adjustments')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'order_adjustments' },
            () => {
              eventDiterima++;
              jadwalkan();
            },
          );

        await new Promise<void>((selesai) => {
          const batas = setTimeout(selesai, 20_000);
          ch.subscribe((s) => {
            if (s === 'SUBSCRIBED') {
              tersambung++;
              clearTimeout(batas);
              selesai();
            }
          });
        });
        klien.push({ sb, ch });
      }),
    );

    const persen = ((tersambung / KLIEN) * 100).toFixed(1);
    console.log(`  ${tersambung}/${KLIEN} SUBSCRIBED (${persen}%)\n`);

    // --- Picu badainya -------------------------------------------------------
    if (PENDENGAR) {
      const diam = Number(process.env.DENGAR_MS ?? 45_000);
      console.log(`Mode pendengar: menunggu ${diam} ms tanpa memicu order sendiri...`);
      await new Promise((r) => setTimeout(r, diam));
    } else {
      const [toko] = await sql<{ id: string }[]>`
        insert into public.customers (nama_toko, kode_sap, region, depot, qty_undangan)
        values (${`${TANDA} TOKO`}, ${TANDA}, '9Z', 'UJI', 1) returning id`;
      const cookiePemicu = cookieCustomer(toko.id, secret);

      console.log('Mengirim order...');
      for (let i = 0; i < ORDER; i++) {
        const r = await fetch(`${BASE}/api/order/adjust`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', cookie: `pylox_session=${cookiePemicu}` },
          body: JSON.stringify({ qtyChange: 1 }),
        });
        console.log(`  order ${i + 1}/${ORDER}: ${r.status}`);
        await new Promise((r) => setTimeout(r, JEDA_ORDER_MS));
      }

      // Beri waktu peredam terakhir jatuh tempo dan requestnya selesai.
      await new Promise((r) => setTimeout(r, TUNDA_MS + JITTER_MS + 5_000));
    }

    // --- Puncak sesungguhnya: request terbanyak dalam satu detik mana pun ----
    let puncak = 0;
    for (const t of capWaktu) {
      const dalamDetikIni = capWaktu.filter((x) => x >= t && x < t + 1000).length;
      if (dalamDetikIni > puncak) puncak = dalamDetikIni;
    }

    console.log(`\n--- HASIL ---`);
    console.log(`  koneksi SUBSCRIBED : ${tersambung}/${KLIEN} (${persen}%)`);
    const harapan = PENDENGAR ? Number(process.env.HARAP_ORDER ?? 0) : ORDER;
    console.log(
      `  event diterima     : ${eventDiterima}` +
        (harapan ? `  (harapan ~${tersambung * harapan}, ${((eventDiterima / (tersambung * harapan)) * 100).toFixed(0)}%)` : ''),
    );
    console.log(`  refetch berhasil   : ${latensi.length}`);
    console.log(`  refetch gagal      : ${gagal}`);
    console.log(`  latensi p50/p95/p99: ${persentil(latensi, 50)} / ${persentil(latensi, 95)} / ${persentil(latensi, 99)} ms`);
    console.log(`  PUNCAK req/detik   : ${puncak}`);

    const rateGagal = latensi.length + gagal ? gagal / (latensi.length + gagal) : 0;
    const lulus =
      tersambung / KLIEN >= 0.95 && persentil(latensi, 95) < 500 && rateGagal < 0.01;
    console.log(`\n  ${lulus ? 'LULUS' : 'TIDAK LULUS'} (SUBSCRIBED >=95%, p95 <500ms, gagal <1%)`);
    process.exitCode = lulus ? 0 : 1;
  } finally {
    console.log('\nMenutup koneksi & bersih-bersih...');
    await Promise.all(klien.map(({ sb, ch }) => sb.removeChannel(ch)));
    const dihapus = await sql`
      delete from public.customers where kode_sap like ${TANDA + '%'} returning id`;
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from public.customers where kode_sap like ${'BADAI-%'}`;
    console.log(`  ${dihapus.length} toko dummy dihapus, sisa penanda = ${n}`);
    await sql.end();
  }
  process.exit(process.exitCode ?? 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
