import { check, sleep } from 'k6';
import http from 'k6/http';
import { AMBANG, BASE_URL, tahap } from '../config.js';
import { pastikanTrafficDiizinkan, sesi, tokoVU } from '../utils/helpers.js';
import { catatStatus } from '../utils/metrics.js';

export const options = { stages: tahap(), thresholds: AMBANG };
pastikanTrafficDiizinkan(BASE_URL);

/**
 * Skenario terberat dari sisi jumlah request: /leaderboard adalah halaman tujuan
 * setiap customer setelah login, dan semuanya memuat ulang berkala.
 *
 * SATU request per siklus, bukan dua. Podium dan posisi pribadi kini datang dari
 * /api/order/me yang sama - lihat komentar di route-nya. Endpoint podium publik
 * yang boleh di-cache CDN sudah dihapus, jadi seluruh beban baca ini benar-benar
 * sampai ke fungsi: inilah angka yang harus dipercaya, bukan angka yang dibantu
 * CDN.
 *
 * Jeda 1,5-3 detik meniru pola refresh baru (peredam realtime 1,5-2,5 detik),
 * bukan 2-5 detik seperti sebelumnya. Sengaja lebih rapat: yang diuji justru
 * apakah percepatan sinkronisasi itu masih aman di 200 penonton bersamaan.
 */
export default function () {
  const toko = tokoVU();
  const res = http.get(`${BASE_URL}/api/order/me`, sesi(toko.cookie));
  catatStatus(res);

  check(res, {
    'status 200': (r) => r.status === 200,
    'ada podium': (r) => {
      try {
        return Array.isArray(r.json('top'));
      } catch {
        return false;
      }
    },
    // Pembatasan ini harus tetap berlaku saat sistem sibuk, bukan cuma saat santai.
    // Podium 3 + daftar lanjutan 2 baris (TOP_CUSTOMER di leaderboard.ts).
    'papan customer maksimal 5 baris': (r) => {
      try {
        return r.json('top').length <= 5;
      } catch {
        return false;
      }
    },
    // Toko boleh melihat kode SAP-nya SENDIRI (itu memang miliknya), tapi tidak
    // boleh ada kode SAP toko lain - jadi yang diperiksa isi podiumnya.
    'kode SAP toko lain tidak bocor di podium': (r) => {
      try {
        return r.json('top').every((b) => b.kodeSap === undefined);
      } catch {
        return false;
      }
    },
    'tidak boleh di-cache bersama': (r) =>
      (r.headers['Cache-Control'] || '').includes('private') ||
      (r.headers['Cache-Control'] || '').includes('no-store'),
  });

  sleep(Math.random() * 1.5 + 1.5);
}
