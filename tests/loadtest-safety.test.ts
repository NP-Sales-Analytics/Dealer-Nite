import { afterEach, describe, expect, it } from 'vitest';
import { pastikanRunId, pastikanTrafficDiizinkan } from '@/scripts/loadtest-common';

const RUN_ID = 'LOADTEST_20260911T090000Z_A1B2C3';
const ENV_KEYS = [
  'IZINKAN_PRODUKSI',
  'KONFIRMASI_RUN_PRODUKSI',
  'OBSERVABILITY_SIAP',
  'TIM_SUDAH_DIBERI_TAHU',
] as const;
const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('pengaman load test', () => {
  it('hanya menerima format run ID unik yang lengkap', () => {
    expect(pastikanRunId(RUN_ID)).toBe(RUN_ID);
    expect(() => pastikanRunId('LT001')).toThrow('Run ID tidak valid');
  });

  it('mengizinkan localhost tanpa opt-in produksi', () => {
    expect(pastikanTrafficDiizinkan('http://localhost:3000', RUN_ID)).toBe(
      'http://localhost:3000',
    );
  });

  it('menolak domain produksi sebelum semua konfirmasi lengkap', () => {
    for (const key of ENV_KEYS) delete process.env[key];
    expect(() => pastikanTrafficDiizinkan('https://pylox.bi-nipponpaint.com', RUN_ID)).toThrow(
      'traffic produksi memerlukan IZINKAN_PRODUKSI=1',
    );
  });

  it('mengikat izin produksi ke run ID aktif', () => {
    process.env.IZINKAN_PRODUKSI = '1';
    process.env.KONFIRMASI_RUN_PRODUKSI = RUN_ID;
    process.env.OBSERVABILITY_SIAP = '1';
    process.env.TIM_SUDAH_DIBERI_TAHU = '1';
    expect(pastikanTrafficDiizinkan('https://pylox.bi-nipponpaint.com/path', RUN_ID)).toBe(
      'https://pylox.bi-nipponpaint.com',
    );
  });
});
