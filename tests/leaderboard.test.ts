import { describe, expect, it } from 'vitest';
import { posisiSaya } from '@/lib/order/leaderboard';

describe('posisiSaya', () => {
  it('rank = jumlah di atas + 1 saat punya total', () => {
    expect(posisiSaya(50, 3)).toBe(4);
    expect(posisiSaya(50, 0)).toBe(1);
  });
  it('null saat belum ada dus (total 0)', () => {
    expect(posisiSaya(0, 5)).toBeNull();
  });
});
