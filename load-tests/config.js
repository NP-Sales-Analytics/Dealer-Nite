export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

/**
 * Profil trafik malam event: tamu datang bertahap, memuncak saat sesi order
 * dibuka, lalu mereda. Sengaja bukan 200 VU rata dari awal - beban rata tidak
 * pernah menemukan masalah yang muncul saat lonjakan.
 *
 * 200 VU kini jadi TARGET yang ditahan, bukan lagi puncak: perkiraan tamu malam
 * event naik ke angka itu. Tahap 250 adalah spike - mencari batas aman di atas
 * target, supaya yang diketahui bukan cuma "sanggup 200" tapi juga "berapa
 * jaraknya sebelum patah".
 */
export const TAHAP = [
  { duration: '1m', target: 50 },
  { duration: '2m', target: 200 },
  { duration: '5m', target: 200 },
  { duration: '2m', target: 250 },
  { duration: '2m', target: 0 },
];

/** Profil pendek untuk pemeriksaan cepat: SINGKAT=1 npm run ... */
export const TAHAP_SINGKAT = [
  { duration: '20s', target: 60 },
  { duration: '40s', target: 200 },
  { duration: '20s', target: 0 },
];

export const tahap = () => (__ENV.SINGKAT ? TAHAP_SINGKAT : TAHAP);

export const AMBANG = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.99'],
};
