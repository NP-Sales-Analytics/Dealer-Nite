import { describe, expect, it } from 'vitest';
import { cariPosisi } from '@/lib/order/leaderboard';

// Papan sudah bernomor final dari row_number() di SQL, termasuk pemecah seri
// berdasarkan waktu - b dan c sama-sama 100 dus tapi nomornya berbeda.
const papan = [
  { customerId: 'a', total: 200, rank: 1 },
  { customerId: 'b', total: 100, rank: 2 },
  { customerId: 'c', total: 100, rank: 3 },
];

describe('cariPosisi', () => {
  it('mengambil total dan rank apa adanya dari papan', () => {
    expect(cariPosisi(papan, 'b')).toEqual({ total: 100, rank: 2 });
  });

  it('yang seri tetap memakai nomor berbeda sesuai urutan papan', () => {
    expect(cariPosisi(papan, 'c').rank).toBe(3);
  });

  it('toko tanpa dus: total 0 dan belum berperingkat', () => {
    expect(cariPosisi(papan, 'belum-order')).toEqual({ total: 0, rank: null });
  });

  it('papan kosong', () => {
    expect(cariPosisi([], 'a')).toEqual({ total: 0, rank: null });
  });
});
