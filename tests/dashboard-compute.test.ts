import { describe, expect, it } from 'vitest';
import { attendanceRate, sortDepots } from '@/lib/dashboard/compute';

describe('attendanceRate', () => {
  it('menghitung persentase dibulatkan', () => {
    expect(attendanceRate(83, 166)).toBe(50);
    expect(attendanceRate(1, 3)).toBe(33);
  });

  it('mengembalikan 0 kalau tidak ada undangan (bukan NaN/Infinity)', () => {
    expect(attendanceRate(0, 0)).toBe(0);
    expect(attendanceRate(5, 0)).toBe(0);
  });

  it('boleh melebihi 100 kalau hadir lebih banyak dari undangan', () => {
    expect(attendanceRate(200, 166)).toBe(120);
  });
});

describe('sortDepots', () => {
  const rows = [
    { depot: '1A Jakarta', region: '2A', qtyHadir: 1, tokoDiundang: 4, tokoHadir: 1 },
    { depot: '3E Malang', region: '6A', qtyHadir: 9, tokoDiundang: 5, tokoHadir: 3 },
    { depot: '1V Purwokerto', region: '3B', qtyHadir: 9, tokoDiundang: 6, tokoHadir: 4 },
  ];

  it('mengurutkan dari kehadiran toko terbanyak', () => {
    expect(sortDepots(rows).map((r) => r.depot)).toEqual(['1V Purwokerto', '3E Malang', '1A Jakarta']);
  });

  it('tidak memutasi input', () => {
    const copy = [...rows];
    sortDepots(rows);
    expect(rows).toEqual(copy);
  });
});
