// Uji beban campuran malam DN. Semua tulis masuk ke DN Loadtest (lihat
// scripts/loadtest-dn.ts). Profil: MODE=smoke | load (100 VU) | stress (200 VU).
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate } from 'k6/metrics';

const T = JSON.parse(open(__ENV.TARGET_FILE || '../data/target.json'));
const BASE = (__ENV.BASE_URL || 'https://dealer-nite.vercel.app').replace(/\/$/, '');
const DN = T.dealerNightId;
const CUSTOMERS = new SharedArray('customers', () => T.customers);
const STAFF = new SharedArray('staff', () => T.staff);

const serverErrors = new Rate('server_errors');
const rateLimited = new Rate('rate_limited');

const PROFIL = {
  smoke: [{ duration: '1m', target: 5 }],
  load: [
    { duration: '1m', target: 25 },
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '10m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  stress: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '3m', target: 100 },
    { duration: '2m', target: 150 },
    { duration: '3m', target: 200 },
    { duration: '2m', target: 200 },
    { duration: '1m', target: 0 },
  ],
};
const MODE = __ENV.MODE || 'smoke';
const NAMA = [
  'search', 'checkin', 'dashboard_summary', 'dashboard_depot', 'dashboard_filters', 'kehadiran_recent',
  'leaderboard', 'targets_list', 'targets_history', 'target_adjust', 'kupon_list', 'kupon_catat', 'page',
];

export const options = {
  scenarios: {
    malam_dn: { executor: 'ramping-vus', startVUs: 0, stages: PROFIL[MODE], gracefulRampDown: '20s' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000', { threshold: 'p(95)<3000', abortOnFail: true, delayAbortEval: '60s' }],
    server_errors: [{ threshold: 'rate<0.02', abortOnFail: true, delayAbortEval: '30s' }],
    rate_limited: ['rate<0.01'],
    // Ambang per endpoint supaya ringkasan akhir menampilkan p95 tiap endpoint.
    ...Object.fromEntries(NAMA.map((n) => [`http_req_duration{name:${n}}`, ['p(95)<1500']])),
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const acak = (arr) => arr[Math.floor(Math.random() * arr.length)];
const antara = (a, b) => a + Math.random() * (b - a);
const sesi = () => STAFF[__VU % STAFF.length].cookie;

function req(method, path, name, body, ok = [200]) {
  const params = {
    headers: { cookie: `dealer_nite_session=${sesi()}`, 'content-type': 'application/json' },
    tags: { name },
    responseCallback: http.expectedStatuses(...ok),
  };
  const res = body === undefined
    ? http.request(method, `${BASE}${path}`, null, params)
    : http.request(method, `${BASE}${path}`, JSON.stringify(body), params);
  serverErrors.add(res.status >= 500);
  rateLimited.add(res.status === 429);
  check(res, { [`${name} ${ok.join('/')}`]: (r) => ok.includes(r.status) });
  return res;
}

const json = (res) => { try { return res.json(); } catch { return null; } };
const q = `dealerNightId=${encodeURIComponent(DN)}`;

function halaman(path) {
  if (Math.random() < 0.15) req('GET', path, 'page');
}

// Pencatat kehadiran: cari toko -> catat hadir + nomor undian.
function pencatat() {
  halaman('/reservation');
  const toko = acak(CUSTOMERS);
  req('GET', `/api/customers/search?q=${encodeURIComponent(toko.mgCode)}&${q}`, 'search');
  sleep(antara(1, 2));
  const nomor = `${String(__VU).padStart(3, '0')}${String(__ITER).padStart(6, '0')}`;
  req('POST', `/api/reservations?${q}`, 'checkin', {
    isManualEntry: false, customerId: toko.id, qtyHadir: 1 + Math.floor(Math.random() * 4), nomorUndian: nomor, confirmOverwrite: true,
  }, [200, 201, 409]);
  sleep(antara(3, 6));
}

// Layar pemantau yang dibiarkan terbuka: polling tiap 10 detik.
function pemantau() {
  const layar = __VU % 3;
  if (layar === 0) {
    halaman('/dashboard');
    req('GET', `/api/dashboard/summary?${q}`, 'dashboard_summary');
    req('GET', `/api/dashboard/by-depot?${q}`, 'dashboard_depot');
    if (Math.random() < 0.1) req('GET', `/api/dashboard/filters?${q}`, 'dashboard_filters');
  } else if (layar === 1) {
    halaman('/kehadiran');
    req('GET', `/api/dashboard/recent?page=1&${q}`, 'kehadiran_recent');
  } else {
    halaman('/leaderboard');
    req('GET', `/api/targets/leaderboard?${q}`, 'leaderboard');
  }
  sleep(10);
}

// Admin target: daftar -> riwayat -> verifikasi/penyesuaian.
function adminTarget() {
  halaman('/order/detail');
  req('GET', `/api/targets/list?${q}`, 'targets_list');
  const toko = acak(CUSTOMERS);
  req('GET', `/api/targets/history?customerId=${toko.id}`, 'targets_history');
  sleep(antara(2, 4));
  const target = (50 + Math.floor(Math.random() * 4950)) * 1_000_000;
  req('POST', '/api/targets/adjust', 'target_adjust', { customerId: toko.id, newTarget: target }, [200, 400]);
  sleep(antara(4, 8));
}

// Admin kupon: daftar -> catat pembuatan/pemberian untuk toko yang masih punya sisa.
function adminKupon() {
  halaman('/kupon');
  const data = json(req('GET', `/api/kupon/list?${q}`, 'kupon_list'));
  const kandidat = (data?.rows ?? []).filter((r) => r.verified);
  if (kandidat.length > 0) {
    const r = acak(kandidat);
    const hak = { pink: Math.floor(r.targetEfektif / 1e8), hijau: Math.floor(r.targetEfektif / 25e6) };
    const buat = { pink: Math.max(0, hak.pink - r.dibuat.pink), hijau: Math.max(0, hak.hijau - r.dibuat.hijau) };
    const beri = { pink: Math.max(0, r.dibuat.pink - r.diberikan.pink), hijau: Math.max(0, r.dibuat.hijau - r.diberikan.hijau) };
    const tahap = buat.pink + buat.hijau > 0 ? 'dibuat' : beri.pink + beri.hijau > 0 ? 'diberikan' : null;
    if (tahap) {
      const jumlah = tahap === 'dibuat' ? buat : beri;
      // 400 wajar bila VU lain lebih dulu memproses toko yang sama.
      req('POST', '/api/kupon', 'kupon_catat', { customerId: r.customerId, tahap, ...jumlah }, [201, 400]);
    }
  }
  sleep(antara(5, 8));
}

export default function () {
  const peran = __VU % 10;
  if (peran < 4) pencatat();
  else if (peran < 7) pemantau();
  else if (peran < 9) adminTarget();
  else adminKupon();
}
