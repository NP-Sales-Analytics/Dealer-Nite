import { check, sleep } from 'k6';
import http from 'k6/http';
import { AMBANG, BASE_URL, tahap } from '../config.js';
import { CUSTOMERS, sesi, STAFF } from '../utils/helpers.js';

export const options = { stages: tahap(), thresholds: AMBANG };

// Satu toko sengaja dijadikan sasaran bersama: meniru dua admin yang salah
// paham dan mencatat toko yang sama. Yang diuji bukan pesan peringatannya di
// UI - itu bisa dilewati kalau menembak API langsung - melainkan partial unique
// index reservations_customer_unique yang membuat upsert tetap satu baris.
const TOKO_REBUTAN = 0;
const PELUANG_REBUTAN = 0.15;

export default function () {
  const staff = STAFF[0];
  const rebutan = Math.random() < PELUANG_REBUTAN;
  const toko = rebutan
    ? CUSTOMERS[TOKO_REBUTAN]
    : CUSTOMERS[(__VU * 7 + __ITER) % CUSTOMERS.length];

  const res = http.post(
    `${BASE_URL}/api/reservations`,
    JSON.stringify({
      isManualEntry: false,
      customerId: toko.id,
      qtyHadir: 2,
      // Jalur "ya, timpa" - justru inilah yang paling rawan menghasilkan
      // duplikat kalau upsert-nya tidak benar.
      confirmOverwrite: true,
      confirmOverQuota: true,
    }),
    sesi(staff.cookie),
  );

  check(res, {
    'tidak error server': (r) => r.status < 500,
    'tercatat atau ditolak wajar': (r) => [200, 201, 409].includes(r.status),
  });

  sleep(Math.random() * 4 + 2);
}
