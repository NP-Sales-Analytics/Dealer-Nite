import { check, sleep } from 'k6';
import http from 'k6/http';
import { AMBANG, BASE_URL, tahap } from '../config.js';
import { sesi, tokoVU } from '../utils/helpers.js';

export const options = {
  stages: tahap(),
  // Ambang per-endpoint, bukan cuma gabungan: kedua jalur ini punya sifat yang
  // berbeda jauh (satu boleh dilayani CDN, satu tidak), jadi rata-rata gabungan
  // akan menyamarkan kalau salah satunya yang bermasalah.
  thresholds: {
    ...AMBANG,
    'http_req_duration{ep:top}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{ep:me}': ['p(95)<500', 'p(99)<1000'],
  },
};

/**
 * Skenario terberat dari sisi jumlah request: /leaderboard adalah halaman tujuan
 * setiap customer setelah login, dan semuanya memuat ulang berkala.
 *
 * Yang dibuktikan di sini: podium yang boleh di-cache CDN benar-benar ditahan
 * di edge, sehingga ratusan pembaca tidak berubah jadi ratusan query.
 */
export default function () {
  const toko = tokoVU();

  // Meniru halaman leaderboard customer apa adanya: podium publik (boleh
  // di-cache CDN) dan posisi pribadi, diambil berbarengan.
  const [papan, saya] = http.batch([
    { method: 'GET', url: `${BASE_URL}/api/order/leaderboard/top`, params: { tags: { ep: 'top' } } },
    { method: 'GET', url: `${BASE_URL}/api/order/me`, params: { ...sesi(toko.cookie), tags: { ep: 'me' } } },
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
    // Vercel MENELAN s-maxage: dipakai untuk cache edge-nya sendiri, lalu yang
    // dikirim ke pembaca cuma `public` + `Age`. Jadi buktinya bukan headernya,
    // melainkan X-Vercel-Cache yang berbunyi HIT/STALE.
    'dilayani CDN': (r) =>
      /HIT|STALE/.test(r.headers['X-Vercel-Cache'] || '') ||
      (r.headers['Cache-Control'] || '').includes('s-maxage'),
  });

  check(saya, {
    'me 200': (r) => r.status === 200,
    'me tidak boleh publik': (r) => (r.headers['Cache-Control'] || '').includes('private'),
  });

  sleep(Math.random() * 3 + 2);
}
