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
    { depot: '1A Jakarta', qtyUndangan: 5, qtyHadir: 1 },
    { depot: '3E Malang', qtyUndangan: 5, qtyHadir: 9 },
    { depot: '1V Purwokerto', qtyUndangan: 8, qtyHadir: 9 },
  ];

  it('mengurutkan dari kehadiran terbanyak, lalu nama depot', () => {
    expect(sortDepots(rows).map((r) => r.depot)).toEqual(['1V Purwokerto', '3E Malang', '1A Jakarta']);
  });

  it('tidak memutasi input', () => {
    const copy = [...rows];
    sortDepots(rows);
    expect(rows).toEqual(copy);
  });
});
