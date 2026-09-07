import { check, sleep } from 'k6';
import http from 'k6/http';
import { AMBANG, BASE_URL, tahap } from '../config.js';
import { acak, sesi, staffVU } from '../utils/helpers.js';

export const options = { stages: tahap(), thresholds: AMBANG };

// Meniru admin yang mengetik: potongan kata, bukan nama lengkap.
const KATA = ['toko', 'load', 'lt00', 'test', 'lt01', 'oko 1'];

/**
 * Banyak admin mencari toko bersamaan. Endpoint ini memakai trigram index
 * (word_similarity), jadi yang diuji: apakah pencarian fuzzy tetap cepat saat
 * dipanggil serentak.
 */
export default function () {
  const staff = staffVU();
  const q = acak(KATA);
  const res = http.get(
    `${BASE_URL}/api/customers/search?q=${encodeURIComponent(q)}`,
    sesi(staff.cookie),
  );

  check(res, {
    'status 200': (r) => r.status === 200,
    'ada hasil': (r) => {
      try {
        return Array.isArray(r.json('results'));
      } catch {
        return false;
      }
    },
  });

  // Sudah di-debounce 300ms di UI, jadi jeda antar ketikan dibuat pendek.
  sleep(Math.random() * 1.5 + 0.5);
}
