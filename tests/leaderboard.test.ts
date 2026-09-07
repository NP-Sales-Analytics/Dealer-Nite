import { describe, expect, it } from 'vitest';
import { cariPosisi } from '@/lib/order/leaderboard';

// Papan sudah bernomor final dari row_number() di SQL, termasuk pemecah seri
// berdasarkan waktu: b dan c sama-sama 100 dus, tapi b lebih dulu mencapainya
// sehingga bernomor lebih kecil.
const papan = [
  { customerId: 'a', total: 200, rank: 1, terakhir: '2026-09-06 20:10:00+00' },
  { customerId: 'b', total: 100, rank: 2, terakhir: '2026-09-06 20:00:00+00' },
  { customerId: 'c', total: 100, rank: 3, terakhir: '2026-09-06 21:00:00+00' },
];

describe('cariPosisi', () => {
  it('mengambil total, rank, dan waktu apa adanya dari papan', () => {
    expect(cariPosisi(papan, 'b')).toEqual({
      total: 100,
      rank: 2,
      terakhir: '2026-09-06 20:00:00+00',
    });
  });

  it('yang seri tetap memakai nomor berbeda sesuai urutan papan', () => {
    expect(cariPosisi(papan, 'c').rank).toBe(3);
  });

  it('waktu yang lebih awal ada di peringkat lebih tinggi saat seri', () => {
    const b = cariPosisi(papan, 'b');
    const c = cariPosisi(papan, 'c');
    expect(b.total).toBe(c.total);
    expect(Date.parse(b.terakhir!)).toBeLessThan(Date.parse(c.terakhir!));
    expect(b.rank!).toBeLessThan(c.rank!);
  });

  it('toko tanpa dus: total 0, belum berperingkat, tanpa waktu', () => {
    expect(cariPosisi(papan, 'belum-order')).toEqual({
      total: 0,
      rank: null,
      terakhir: null,
    });
  });

  it('papan kosong', () => {
    expect(cariPosisi([], 'a')).toEqual({ total: 0, rank: null, terakhir: null });
  });
});
