import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import {
  DATA_DIR,
  bacaSeededTarget,
  pastikanTrafficDiizinkan,
  tulisJson,
} from './loadtest-common';

const BASE = process.env.BASE_URL ?? 'https://pylox.bi-nipponpaint.com';
const KLIEN = Number(process.env.KLIEN ?? 200);
const ORDER = Number(process.env.ORDER ?? 8);
const JEDA_ORDER_MS = Number(process.env.JEDA_ORDER_MS ?? 4_000);
const HOLD_MS = Number(process.env.HOLD_MS ?? 30_000);
const LAJU_KONEKSI = Math.min(Number(process.env.LAJU_KONEKSI ?? 10), 10);
const TUNDA_MS = 1_500;
const JITTER_MS = 1_000;

type ClientState = {
  sb: SupabaseClient;
  ch: RealtimeChannel;
  cookie: string;
  timer: ReturnType<typeof setTimeout> | null;
  subscribed: boolean;
  pernahSubscribed: boolean;
};

const tunggu = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const persentil = (values: number[], p: number) => {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length * p) / 100))];
};

async function main() {
  if (!Number.isInteger(KLIEN) || KLIEN < 1 || KLIEN > 200) {
    throw new Error('KLIEN harus 1-200; paket Free tidak boleh diuji di atas 200.');
  }
  if (!Number.isFinite(LAJU_KONEKSI) || LAJU_KONEKSI <= 0) {
    throw new Error('LAJU_KONEKSI harus lebih dari 0 dan maksimum 10/detik.');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL/ANON_KEY belum lengkap.');

  const target = bacaSeededTarget();
  pastikanTrafficDiizinkan(BASE, target.runId);
  if (target.customers.length < KLIEN) {
    throw new Error(`Manifest hanya berisi ${target.customers.length} customer; perlu ${KLIEN}.`);
  }

  const tahapanDasar = (process.env.TAHAP_REALTIME ?? '25,50,100,150,180,200')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0 && n <= KLIEN);
  const tahapan = [...new Set([...tahapanDasar, KLIEN])].sort((a, b) => a - b);

  const clients: ClientState[] = [];
  const latensi: number[] = [];
  const capWaktu: number[] = [];
  const statusCount: Record<string, number> = {};
  const stageReports: { target: number; subscribed: number; statuses: Record<string, number> }[] = [];
  let tersambung = 0;
  let reconnect = 0;
  let eventDiterima = 0;
  let refetchGagal = 0;
  let expectedEvents = 0;
  let cleanupChannels = -1;
  let subscribedAtEnd = 0;

  const connectOne = async (index: number) => {
    const account = target.customers[index];
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const state = {} as ClientState;

    const jadwalkan = () => {
      if (state.timer) return;
      state.timer = setTimeout(async () => {
        state.timer = null;
        const started = Date.now();
        try {
          const response = await fetch(`${BASE}/api/order/me`, {
            headers: { cookie: `pylox_session=${state.cookie}` },
          });
          if (!response.ok) refetchGagal++;
          else {
            await response.arrayBuffer();
            latensi.push(Date.now() - started);
            capWaktu.push(Date.now());
          }
        } catch {
          refetchGagal++;
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
    Object.assign(state, {
      sb,
      ch,
      cookie: account.cookie,
      timer: null,
      subscribed: false,
      pernahSubscribed: false,
    });
    clients.push(state);

    await new Promise<void>((resolve) => {
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        resolve();
      };
      const timeout = setTimeout(() => {
        statusCount.CLIENT_TIMEOUT = (statusCount.CLIENT_TIMEOUT ?? 0) + 1;
        finish();
      }, 20_000);

      ch.subscribe((status) => {
        statusCount[status] = (statusCount[status] ?? 0) + 1;
        if (status === 'SUBSCRIBED') {
          if (!state.subscribed) {
            state.subscribed = true;
            tersambung++;
            if (state.pernahSubscribed) reconnect++;
          }
          state.pernahSubscribed = true;
          finish();
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (state.subscribed) {
            state.subscribed = false;
            tersambung--;
          }
          if (!state.pernahSubscribed) finish();
        }
      });
    });
  };

  let resultError: Error | null = null;
  try {
    console.log(`Run     : ${target.runId}`);
    console.log(`Sasaran : ${BASE}`);
    console.log(`Tahap   : ${tahapan.join(' -> ')}`);
    console.log(`Laju    : ${LAJU_KONEKSI} koneksi/detik (maksimum paksa 10)\n`);

    for (const stage of tahapan) {
      while (clients.length < stage) {
        await connectOne(clients.length);
        await tunggu(1_000 / LAJU_KONEKSI);
      }
      await tunggu(HOLD_MS);
      const report = { target: stage, subscribed: tersambung, statuses: { ...statusCount } };
      stageReports.push(report);
      console.log(`  tahap ${stage}: ${tersambung}/${stage} SUBSCRIBED`);
      if (tersambung !== stage) {
        throw new Error(`Subscription tidak lengkap pada tahap ${stage}; peningkatan beban dihentikan.`);
      }
    }

    if (ORDER > 0) {
      const pemicu = target.customers[KLIEN - 1];
      console.log(`\nMengirim ${ORDER} order dummy...`);
      for (let index = 0; index < ORDER; index++) {
        expectedEvents += tersambung;
        const response = await fetch(`${BASE}/api/order/adjust`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            cookie: `pylox_session=${pemicu.cookie}`,
          },
          body: JSON.stringify({ qtyChange: 1 }),
        });
        console.log(`  order ${index + 1}/${ORDER}: ${response.status}`);
        if (response.status === 402 || response.status === 429 || response.status >= 500) {
          throw new Error(`Stop condition: order menerima HTTP ${response.status}.`);
        }
        if (!response.ok) throw new Error(`Order dummy gagal: ${response.status} ${await response.text()}`);
        await tunggu(JEDA_ORDER_MS);
      }
      await tunggu(TUNDA_MS + JITTER_MS + 5_000);
    }
  } catch (error) {
    resultError = error instanceof Error ? error : new Error(String(error));
  } finally {
    subscribedAtEnd = tersambung;
    console.log('\nMenutup seluruh channel...');
    for (const client of clients) {
      if (client.timer) clearTimeout(client.timer);
    }
    await Promise.all(clients.map(({ sb, ch }) => sb.removeChannel(ch)));
    cleanupChannels = clients.reduce((sum, { sb }) => sum + sb.getChannels().length, 0);
    console.log(`  channel tersisa: ${cleanupChannels}`);
  }

  let puncak = 0;
  for (const time of capWaktu) {
    puncak = Math.max(puncak, capWaktu.filter((x) => x >= time && x < time + 1_000).length);
  }
  const deliveryRate = expectedEvents ? eventDiterima / expectedEvents : 1;
  const failureRate = latensi.length + refetchGagal ? refetchGagal / (latensi.length + refetchGagal) : 0;
  const p95 = persentil(latensi, 95);
  const p99 = persentil(latensi, 99);
  const lulus =
    !resultError &&
    subscribedAtEnd === KLIEN &&
    deliveryRate >= 0.999 &&
    failureRate < 0.01 &&
    p95 < 500 &&
    cleanupChannels === 0;

  const report = {
    runId: target.runId,
    dibuat: new Date().toISOString(),
    target: KLIEN,
    subscribedAtEnd,
    stages: stageReports,
    statuses: statusCount,
    reconnect,
    eventDiterima,
    expectedEvents,
    deliveryRate,
    refetch: { berhasil: latensi.length, gagal: refetchGagal, p50: persentil(latensi, 50), p95, p99 },
    peakRequestsPerSecond: puncak,
    cleanupChannels,
    result: lulus ? 'PASS' : 'FAIL',
    error: resultError?.message ?? null,
  };
  const reportFile = `${DATA_DIR}/report-realtime-${target.runId}.json`;
  tulisJson(reportFile, report);

  console.log('\n--- HASIL ---');
  console.log(`  SUBSCRIBED akhir   : ${subscribedAtEnd}/${KLIEN}`);
  console.log(`  reconnect          : ${reconnect}`);
  console.log(`  event              : ${eventDiterima}/${expectedEvents} (${(deliveryRate * 100).toFixed(2)}%)`);
  console.log(`  refetch gagal      : ${refetchGagal}`);
  console.log(`  p50/p95/p99        : ${persentil(latensi, 50)} / ${p95} / ${p99} ms`);
  console.log(`  puncak request/dtk : ${puncak}`);
  console.log(`  laporan            : ${reportFile}`);
  console.log(`\n${lulus ? 'LULUS' : 'TIDAK LULUS'}`);
  if (resultError) console.error(resultError.message);
  process.exit(lulus ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
