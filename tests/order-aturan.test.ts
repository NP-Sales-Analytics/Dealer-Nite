import { describe, expect, it } from 'vitest';
import { periksaPenambahan } from '@/lib/order/aturan';

const T0 = Date.parse('2026-09-05T12:00:00+07:00');
const dasar = { totalBaru: 150, dusAwal: 120, tenggat: null, sekarang: T0 };

describe('periksaPenambahan', () => {
  it('meloloskan angka di atas pengambilan pertama', () => {
    expect(periksaPenambahan(dasar)).toBeNull();
  });

  it('meloloskan angka yang sama persis dengan pengambilan pertama', () => {
    expect(periksaPenambahan({ ...dasar, totalBaru: 120 })).toBeNull();
  });

  it('menolak angka di bawah pengambilan pertama', () => {
    expect(periksaPenambahan({ ...dasar, totalBaru: 119 })).toBe('DI_BAWAH_AWAL');
  });

  it('toko yang belum pernah mengambil belum punya lantai', () => {
    expect(periksaPenambahan({ ...dasar, dusAwal: null, totalBaru: 1 })).toBeNull();
  });

  it('total minus tetap ditolak', () => {
    expect(periksaPenambahan({ ...dasar, dusAwal: null, totalBaru: -1 })).toBe('NEGATIVE');
  });

  it('tenggat yang sudah lewat mengunci semuanya', () => {
    const tenggat = new Date(T0 - 1000).toISOString();
    expect(periksaPenambahan({ ...dasar, tenggat })).toBe('TENGGAT_HABIS');
  });

  it('tenggat diperiksa lebih dulu daripada batas bawah', () => {
    const tenggat = new Date(T0 - 1000).toISOString();
    expect(periksaPenambahan({ ...dasar, tenggat, totalBaru: 10 })).toBe('TENGGAT_HABIS');
  });

  it('tenggat yang belum lewat tidak menghalangi', () => {
    const tenggat = new Date(T0 + 60_000).toISOString();
    expect(periksaPenambahan({ ...dasar, tenggat })).toBeNull();
  });

  it('tepat pada detik tenggat sudah dianggap habis', () => {
    expect(periksaPenambahan({ ...dasar, tenggat: new Date(T0).toISOString() })).toBe('TENGGAT_HABIS');
  });
});
