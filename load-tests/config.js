export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

/** Baseline wajib lulus sebelum profil penuh boleh dimulai. */
export const TAHAP_BASELINE = [
  { duration: '30s', target: 1 },
  { duration: '45s', target: 5 },
  { duration: '1m', target: 10 },
  { duration: '15s', target: 0 },
];

/**
 * Batas terakhir 200 karena proyek memakai paket Supabase Free. Tidak ada spike
 * di atas batas resmi. Ramp bertahap juga menjaga join/request tidak serempak.
 */
export const TAHAP = [
  { duration: '30s', target: 25 },
  { duration: '45s', target: 50 },
  { duration: '1m', target: 100 },
  { duration: '1m', target: 150 },
  { duration: '1m', target: 180 },
  { duration: '2m', target: 200 },
  { duration: '30s', target: 0 },
];

export const TAHAP_SINGKAT = [
  { duration: '20s', target: 25 },
  { duration: '30s', target: 100 },
  { duration: '30s', target: 200 },
  { duration: '20s', target: 0 },
];

export const tahap = () => {
  if (__ENV.BASELINE) return TAHAP_BASELINE;
  return __ENV.SINGKAT ? TAHAP_SINGKAT : TAHAP;
};

export const AMBANG = {
  http_req_duration: [
    'p(95)<500',
    'p(99)<1000',
    { threshold: 'p(95)<2000', abortOnFail: true, delayAbortEval: '60s' },
  ],
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.99'],
  quota_errors: [{ threshold: 'count==0', abortOnFail: true }],
  server_error_count: ['count==0'],
  server_errors: [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '30s' }],
  rate_limited: [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '30s' }],
};
