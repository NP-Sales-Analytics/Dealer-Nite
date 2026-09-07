import { check, sleep } from 'k6';
import http from 'k6/http';
import { AMBANG, BASE_URL, tahap } from '../config.js';
import { sesi, tokoVU } from '../utils/helpers.js';

export const options = { stages: tahap(), thresholds: AMBANG };

/**
 * Skenario terberat dari sisi jumlah request: /leaderboard adalah halaman tujuan
 * setiap customer setelah login, dan semuanya memuat ulang berkala.
 *
 * Yang dibuktikan di sini: cache 5 detik di lib/order/papan.ts benar-benar
 * menahan beban, sehingga ratusan pembaca tidak berubah jadi ratusan query.
 */
export default function () {
  const toko = tokoVU();

  // Meniru halaman leaderboard customer apa adanya: podium publik (boleh
  // di-cache CDN) dan posisi pribadi, diambil berbarengan.
  const [papan, saya] = http.batch([
    { method: 'GET', url: `${BASE_URL}/api/order/leaderboard/top` },
    { method: 'GET', url: `${BASE_URL}/api/order/me`, params: sesi(toko.cookie) },
  ]);

  check(papan, {
    'top 200': (r) => r.status === 200,
    'ada papan': (r) => {
      try {
        return Array.isArray(r.json('top'));
      } catch {
        return false;
      }
    },
    // Pembatasan ini harus tetap berlaku saat sistem sibuk, bukan cuma saat santai.
    'top hanya 3 baris': (r) => {
      try {
        return r.json('top').length <= 3;
      } catch {
        return false;
      }
    },
    'kode SAP tidak bocor di endpoint publik': (r) => !r.body.includes('kodeSap'),
    'boleh di-cache CDN': (r) => (r.headers['Cache-Control'] || '').includes('s-maxage'),
  });

  check(saya, {
    'me 200': (r) => r.status === 200,
    'me tidak boleh publik': (r) => (r.headers['Cache-Control'] || '').includes('private'),
  });

  sleep(Math.random() * 3 + 2);
}
