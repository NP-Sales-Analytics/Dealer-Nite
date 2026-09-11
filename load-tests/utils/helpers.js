import { SharedArray } from 'k6/data';

// SharedArray: datanya di-parse sekali dan dipakai bersama semua VU. Tanpa ini,
// 200 VU masing-masing menyalin daftar toko ke memorinya sendiri.
const TARGET = JSON.parse(open(__ENV.TARGET_FILE || '../data/target.json'));

export const CUSTOMERS = new SharedArray('customers', () => TARGET.customers);
export const STAFF = new SharedArray('staff', () => TARGET.staff ?? []);
export const RUN_ID = TARGET.runId ?? null;

export function pastikanTargetSeeded() {
  if (TARGET.version !== 2 || TARGET.mode !== 'seeded' || !RUN_ID) {
    throw new Error('Skenario tulis hanya boleh memakai target seeded v2 dengan run ID.');
  }
}

export function pastikanTrafficDiizinkan(baseUrl) {
  const produksi = /^https:\/\/pylox\.bi-nipponpaint\.com(?:\/|$)/i.test(baseUrl);
  if (!produksi) return;
  if (
    __ENV.IZINKAN_PRODUKSI !== '1' ||
    __ENV.KONFIRMASI_RUN_PRODUKSI !== RUN_ID ||
    __ENV.OBSERVABILITY_SIAP !== '1' ||
    __ENV.TIM_SUDAH_DIBERI_TAHU !== '1'
  ) {
    throw new Error(
      'Traffic produksi ditolak: izin, run ID, observability, dan konfirmasi tim wajib lengkap.',
    );
  }
}

export const acak = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Toko tetap per VU, supaya satu "orang" konsisten memakai satu akun. */
export const tokoVU = () => CUSTOMERS[__VU % CUSTOMERS.length];

/**
 * Akun staff tetap per VU. Harus tersebar, bukan satu akun untuk semua: rate
 * limiter dikunci per user (40 request / 10 detik), jadi memusatkan 150 VU ke
 * satu akun hanya akan mengukur rate limiternya. Menyebar ke 20 akun juga
 * meniru kenyataan - malam event ada belasan meja registrasi.
 */
export const staffVU = () => STAFF[__VU % STAFF.length];

export const sesi = (cookie) => ({
  headers: { cookie: `pylox_session=${cookie}`, 'content-type': 'application/json' },
});
