import { check, sleep } from 'k6';
import http from 'k6/http';
import { AMBANG, BASE_URL, tahap } from '../config.js';

export const options = { stages: tahap(), thresholds: AMBANG };

/**
 * Hanya podium publik - tanpa sesi, tanpa target.json.
 *
 * Inilah request yang ditembak setiap customer dan karena itu yang menentukan
 * apakah aplikasi kuat malam event. Sengaja dipisah dari leaderboard-read.js
 * supaya bisa dijalankan tanpa menyentuh database sama sekali: kalau angkanya
 * bagus, buktinya memang CDN yang melayani, bukan server.
 */
export default function () {
  const res = http.get(`${BASE_URL}/api/order/leaderboard/top`);

  check(res, {
    'status 200': (r) => r.status === 200,
    'ada papan': (r) => {
      try {
        return Array.isArray(r.json('top'));
      } catch {
        return false;
      }
    },
    // Pembatasan ini harus tetap berlaku saat sistem sibuk, bukan cuma saat santai.
    'maksimal 3 baris': (r) => {
      try {
        return r.json('top').length <= 3;
      } catch {
        return false;
      }
    },
    'kode SAP tidak bocor': (r) => !r.body.includes('kodeSap'),
    'wilayah/region tidak bocor': (r) => !r.body.includes('wilayah') && !r.body.includes('region'),
    // Vercel MENELAN s-maxage: dipakai untuk cache edge-nya sendiri, lalu yang
    // dikirim ke pembaca cuma `public` + `Age`. Jadi buktinya bukan headernya,
    // melainkan X-Vercel-Cache yang berbunyi HIT/STALE.
    'dilayani CDN': (r) =>
      /HIT|STALE/.test(r.headers['X-Vercel-Cache'] || '') ||
      (r.headers['Cache-Control'] || '').includes('s-maxage'),
  });

  sleep(Math.random() * 3 + 2);
}
