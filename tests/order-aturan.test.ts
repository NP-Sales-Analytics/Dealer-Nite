import { describe, expect, it } from 'vitest';
import { periksaPenambahan, MAKS_SEKALI } from '@/lib/order/aturan';

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

// Batas SEKALI simpan, bukan batas total. Total boleh berapa pun - inilah
// pembeda yang paling gampang salah dipahami saat kode ini disentuh lagi.
describe('MAKS_SEKALI', () => {
  const dasar = { dusAwal: null, tenggat: null };

  it('menolak lompatan di atas batas sekali simpan', () => {
    expect(periksaPenambahan({ ...dasar, totalBaru: 10_001, selisih: 10_001 }))
      .toBe('SEKALI_TERLALU_BANYAK');
  });

  it('tepat di batas masih boleh', () => {
    expect(periksaPenambahan({ ...dasar, totalBaru: MAKS_SEKALI, selisih: MAKS_SEKALI }))
      .toBeNull();
  });

  it('TOTAL besar tetap boleh selama lompatannya kecil', () => {
    // 50.000 dus bukan masalah; yang dijaga cuma cara sampainya.
    expect(periksaPenambahan({ ...dasar, totalBaru: 50_000, selisih: 500 })).toBeNull();
  });

  it('pengurangan besar ikut ditolak - salah ketik bisa dua arah', () => {
    expect(periksaPenambahan({ ...dasar, totalBaru: 5_000, selisih: -20_000 }))
      .toBe('SEKALI_TERLALU_BANYAK');
  });

  it('tanpa selisih, batas ini tidak berlaku - koreksi admin bebas', () => {
    expect(periksaPenambahan({ ...dasar, totalBaru: 999_999 })).toBeNull();
  });
});
