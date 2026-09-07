import { SharedArray } from 'k6/data';

// SharedArray: datanya di-parse sekali dan dipakai bersama semua VU. Tanpa ini,
// 200 VU masing-masing menyalin daftar toko ke memorinya sendiri.
const berkas = () => JSON.parse(open('../data/target.json'));

export const CUSTOMERS = new SharedArray('customers', () => berkas().customers);
export const STAFF = new SharedArray('staff', () => [berkas().staff]);

export const acak = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Toko tetap per VU, supaya satu "orang" konsisten memakai satu akun. */
export const tokoVU = () => CUSTOMERS[__VU % CUSTOMERS.length];

export const sesi = (cookie) => ({
  headers: { cookie: `pylox_session=${cookie}`, 'content-type': 'application/json' },
});
