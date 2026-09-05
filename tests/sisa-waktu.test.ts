import { describe, expect, it } from 'vitest';
import { formatSisa } from '@/lib/order/use-sisa-waktu';

describe('formatSisa', () => {
  it('menampilkan jam dan menit saat masih lama', () => {
    expect(formatSisa((2 * 3600 + 5 * 60 + 30) * 1000)).toBe('2j 5m');
  });
  it('menampilkan menit dan detik saat di bawah satu jam', () => {
    expect(formatSisa((5 * 60 + 9) * 1000)).toBe('5m 9d');
  });
  it('menampilkan detik saja di menit terakhir', () => {
    expect(formatSisa(42_000)).toBe('42d');
  });
  it('tidak pernah negatif', () => {
    expect(formatSisa(-99_000)).toBe('0d');
  });
});
