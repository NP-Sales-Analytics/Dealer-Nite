import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { bacaSeededTarget, pastikanTrafficDiizinkan } from './loadtest-common';

/** Mengukur event Realtime dan visibilitas API dengan customer dummy dari manifest aktif. */
const BASE = process.env.BASE_URL ?? 'https://pylox.bi-nipponpaint.com';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL/ANON_KEY belum lengkap.');

  const target = bacaSeededTarget();
  pastikanTrafficDiizinkan(BASE, target.runId);
  const customer = target.customers.at(-1);
  if (!customer) throw new Error('Manifest tidak berisi customer dummy.');

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  let channel: RealtimeChannel | null = null;

  try {
    let tSinyal = 0;
    channel = supabase
      .channel('order_adjustments')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_adjustments' },
        () => {
          if (!tSinyal) tSinyal = Date.now();
        },
      );
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Realtime tidak SUBSCRIBED dalam 20 detik.')),
        20_000,
      );
      channel?.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          reject(new Error(`Realtime gagal: ${status}`));
        }
      });
    });

    const headers = { cookie: `pylox_session=${customer.cookie}` };
    const beforeResponse = await fetch(`${BASE}/api/order/me`, { headers });
    if (!beforeResponse.ok) throw new Error(`Baca awal gagal: HTTP ${beforeResponse.status}`);
    const before = (await beforeResponse.json()) as { total: number };

    const t0 = Date.now();
    const response = await fetch(`${BASE}/api/order/adjust`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ qtyChange: 1 }),
    });
    if (!response.ok) throw new Error(`Adjust gagal: ${response.status} ${await response.text()}`);
    const tersimpan = Date.now() - t0;

    let tTerlihat = 0;
    while (Date.now() - t0 < 15_000) {
      const currentResponse = await fetch(`${BASE}/api/order/me`, { headers });
      if (!currentResponse.ok) throw new Error(`Baca ulang gagal: HTTP ${currentResponse.status}`);
      const current = (await currentResponse.json()) as { total: number };
      if (current.total === before.total + 1) {
        tTerlihat = Date.now();
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`Run                       : ${target.runId}`);
    console.log(`order tersimpan           : ${tersimpan} ms`);
    console.log(`sinyal Realtime sampai    : ${tSinyal ? `${tSinyal - t0} ms` : 'TIDAK SAMPAI'}`);
    console.log(
      `angka baru terbaca server : ${tTerlihat ? `${tTerlihat - t0} ms` : 'TIDAK MUNCUL <15 detik'}`,
    );
    if (!tSinyal || !tTerlihat) process.exitCode = 1;
  } finally {
    if (channel) await supabase.removeChannel(channel);
    const sisa = supabase.getChannels().length;
    console.log(`channel tersisa           : ${sisa}`);
    if (sisa !== 0) process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
