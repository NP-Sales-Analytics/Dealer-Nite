import { check, sleep } from 'k6';
import http from 'k6/http';
import { AMBANG, BASE_URL, TAHAP_BASELINE } from '../config.js';
import {
  CUSTOMERS,
  RUN_ID,
  pastikanTargetSeeded,
  pastikanTrafficDiizinkan,
  sesi,
  staffVU,
} from '../utils/helpers.js';
import { catatStatus } from '../utils/metrics.js';

pastikanTargetSeeded();
pastikanTrafficDiizinkan(BASE_URL);

export const options = {
  ...(__ENV.BASELINE
    ? { stages: TAHAP_BASELINE }
    : { vus: Number(__ENV.STAFF_VUS || 20), duration: __ENV.DURATION || '7m' }),
  thresholds: AMBANG,
};

export default function () {
  const staff = staffVU();
  const query = __ITER % 2 === 0 ? 'LOADTEST' : RUN_ID.slice(-6);
  const search = http.get(
    `${BASE_URL}/api/customers/search?q=${encodeURIComponent(query)}`,
    sesi(staff.cookie),
  );
  catatStatus(search);
  check(search, { 'search sukses': (response) => response.status === 200 });
  sleep(Math.random() * 1.5 + 0.5);

  // Pencatatan tidak dilakukan di setiap iterasi; staf lebih sering mencari
  // dan membaca detail daripada menekan Simpan.
  if (__ITER % 3 === 0) {
    const customer = CUSTOMERS[(__VU * 17 + __ITER) % CUSTOMERS.length];
    const checkin = http.post(
      `${BASE_URL}/api/reservations`,
      JSON.stringify({
        isManualEntry: false,
        customerId: customer.id,
        qtyHadir: 2,
        confirmOverwrite: true,
        confirmOverQuota: true,
      }),
      sesi(staff.cookie),
    );
    catatStatus(checkin);
    check(checkin, {
      'check-in sukses': (response) => response.status === 200 || response.status === 201,
    });
  }
  sleep(Math.random() * 3 + 2);
}
