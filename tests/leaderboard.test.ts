import { describe, expect, it } from 'vitest';
import { cariPosisi, podium } from '@/lib/order/leaderboard';

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

// Papan lengkap apa adanya dari DB - memuat kolom yang TIDAK boleh sampai ke
// customer. Podium harus memangkasnya, bukan meneruskannya.
const papanLengkap = [
  { customerId: 'a', namaToko: 'A', depot: '1A', total: 300, rank: 1, terakhir: '2026-09-06T20:00:00Z', kodeSap: '111', wilayah: 'Barat', region: '3A' },
  { customerId: 'b', namaToko: 'B', depot: '1B', total: 200, rank: 2, terakhir: '2026-09-06T20:01:00Z', kodeSap: '222', wilayah: 'Barat', region: '3B' },
  { customerId: 'c', namaToko: 'C', depot: '1C', total: 100, rank: 3, terakhir: '2026-09-06T20:02:00Z', kodeSap: '333', wilayah: 'Timur', region: '6' },
  { customerId: 'd', namaToko: 'D', depot: '1D', total: 50, rank: 4, terakhir: '2026-09-06T20:03:00Z', kodeSap: '444', wilayah: 'Timur', region: '7' },
];

describe('podium', () => {
  it('hanya tiga besar, peringkat 4 ke bawah tidak ikut', () => {
    const hasil = podium(papanLengkap);
    expect(hasil).toHaveLength(3);
    expect(hasil.map((r) => r.customerId)).toEqual(['a', 'b', 'c']);
  });

  // kode_sap ADALAH kredensial login customer: satu orang cukup memanennya dari
  // podium untuk masuk sebagai toko lain.
  it('tidak pernah membocorkan kode SAP, wilayah, atau region', () => {
    for (const baris of podium(papanLengkap)) {
      expect(baris).not.toHaveProperty('kodeSap');
      expect(baris).not.toHaveProperty('wilayah');
      expect(baris).not.toHaveProperty('region');
    }
    expect(JSON.stringify(podium(papanLengkap))).not.toContain('111');
  });

  it('daftar-putih: kolom baru di papan tidak ikut terkirim tanpa sengaja', () => {
    const denganKolomBaru = [{ ...papanLengkap[0], catatanInternal: 'RAHASIA' }];
    expect(JSON.stringify(podium(denganKolomBaru))).not.toContain('RAHASIA');
  });

  it('papan kosong tetap aman, bukan error', () => {
    expect(podium([])).toEqual([]);
  });

  it('meneruskan angka apa adanya - podium dan kartu posisi wajib sepakat', () => {
    const [juara] = podium(papanLengkap);
    const posisi = cariPosisi(papanLengkap, 'a');
    expect(juara.total).toBe(posisi.total);
    expect(juara.rank).toBe(posisi.rank);
    expect(juara.terakhir).toBe(posisi.terakhir);
  });
});
