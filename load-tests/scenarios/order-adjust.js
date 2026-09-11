import { check, sleep } from 'k6';
import http from 'k6/http';
import { AMBANG, BASE_URL, tahap } from '../config.js';
import {
  pastikanTargetSeeded,
  pastikanTrafficDiizinkan,
  sesi,
  tokoVU,
} from '../utils/helpers.js';
import { catatStatus } from '../utils/metrics.js';

export const options = { stages: tahap(), thresholds: AMBANG };
pastikanTargetSeeded();
pastikanTrafficDiizinkan(BASE_URL);

/**
 * Customer menambah dus sendiri. Tiap VU memakai tokonya sendiri, jadi ini
 * menguji apakah penguncian benar-benar per-toko: kalau ternyata mengunci
 * tingkat tabel, semua VU akan saling menunggu dan p95 meledak walau tokonya
 * berbeda-beda.
 */
export default function () {
  const toko = tokoVU();
  const res = http.post(
    `${BASE_URL}/api/order/adjust`,
    JSON.stringify({ qtyChange: 1 }),
    sesi(toko.cookie),
  );
  catatStatus(res);

  check(res, {
    'tersimpan': (r) => r.status === 200,
    'total naik': (r) => {
      try {
        return typeof r.json('total') === 'number';
      } catch {
        return false;
      }
    },
  });

  sleep(Math.random() * 5 + 3);
}
