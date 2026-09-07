import { SharedArray } from 'k6/data';

// SharedArray: datanya di-parse sekali dan dipakai bersama semua VU. Tanpa ini,
// 200 VU masing-masing menyalin daftar toko ke memorinya sendiri.
const berkas = () => JSON.parse(open('../data/target.json'));

export const CUSTOMERS = new SharedArray('customers', () => berkas().customers);
export const STAFF = new SharedArray('staff', () => berkas().staff ?? []);

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
