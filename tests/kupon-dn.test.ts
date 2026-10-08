import { describe, expect, it } from 'vitest';
import { parseDealerNightRecords } from '@/lib/csv/parse-dealer-night';
import { dnBawaan } from '@/lib/target/dn-bawaan';
import { hitungKupon, prosesKupon } from '@/lib/target/kupon';
import { statusPax } from '@/lib/reservation/pax';

describe('hitungKupon', () => {
  it('Rp100 juta = 1 pink dan 4 hijau (dihitung dari target penuh)', () => {
    expect(hitungKupon(100_000_000)).toEqual({ pink: 1, hijau: 4 });
  });

  it('pembagi custom per DN: pink Rp75 juta -> target 75 juta = 1 pink dan 3 hijau', () => {
    expect(hitungKupon(75_000_000, { pink: 75_000_000, hijau: 25_000_000 })).toEqual({ pink: 1, hijau: 3 });
    expect(prosesKupon({
      verified: true, target: 150_000_000, dibuat: { pink: 0, hijau: 0 }, diberikan: { pink: 0, hijau: 0 },
      nilai: { pink: 75_000_000, hijau: 30_000_000 },
    }).perluDibuat).toEqual({ pink: 2, hijau: 5 });
  });

  it('membulatkan ke bawah', () => {
    expect(hitungKupon(50_000_000)).toEqual({ pink: 0, hijau: 2 });
    expect(hitungKupon(5_619_000_000)).toEqual({ pink: 56, hijau: 224 });
    expect(hitungKupon(124_999_999)).toEqual({ pink: 1, hijau: 4 });
  });
});

describe('dnBawaan', () => {
  const options = [
    { id: 'bandung', eventDate: '2026-09-26' },
    { id: 'bogor', eventDate: '2026-10-03' },
    { id: 'padang', eventDate: '2027-01-09' },
  ];

  it('memilih acara terdekat yang belum lewat', () => {
    expect(dnBawaan(options, '2026-09-30')).toBe('bogor');
    expect(dnBawaan(options, '2026-10-03')).toBe('bogor');
  });

  it('memilih acara terakhir bila semua sudah lewat', () => {
    expect(dnBawaan(options, '2027-02-01')).toBe('padang');
  });

  it('tetap memilih sesuatu tanpa tanggal', () => {
    expect(dnBawaan([{ id: 'x', eventDate: null }])).toBe('x');
    expect(dnBawaan([])).toBe('');
  });
});

describe('parseDealerNightRecords (Excel)', () => {
  const depots = new Map([['1S', { depotName: '1S Bogor', wilayah: 'Indonesia Barat', region: '4' }]]);
  const baris = {
    'MG Code': 632723, 'MG Name': 'cv halim', 'SOTP Code': 632723, 'SOTP Name': 'cv halim',
    'Depot Code': '1S', Salesman: 'A', SPV: 'B', 'Target DN Pembulatan Inc. PPN': 5_619_000_000,
  };

  it('menerima angka dari sel Excel', () => {
    const [row] = parseDealerNightRecords([baris], depots);
    expect(row).toMatchObject({ mgCode: '632723', mgName: 'CV HALIM', targetDnAwal: 5_619_000_000, depotName: '1S Bogor' });
  });

  it('melaporkan nomor baris yang salah', () => {
    expect(() => parseDealerNightRecords([baris, { ...baris, 'MG Code': 1, 'Depot Code': '9Z' }], depots))
      .toThrow('Baris 3: Depot Code 9Z tidak dikenal');
  });
});

describe('prosesKupon', () => {
  const nol = { pink: 0, hijau: 0 };

  it('belum punya hak sebelum verifikasi', () => {
    expect(prosesKupon({ verified: false, target: 100_000_000, dibuat: nol, diberikan: nol }).status).toBe('belum_verifikasi');
  });

  it('alur hak -> dibuat -> diberikan', () => {
    const awal = prosesKupon({ verified: true, target: 100_000_000, dibuat: nol, diberikan: nol });
    expect(awal).toMatchObject({ status: 'perlu_dibuat', perluDibuat: { pink: 1, hijau: 4 } });
    const dibuat = { pink: 1, hijau: 4 };
    expect(prosesKupon({ verified: true, target: 100_000_000, dibuat, diberikan: nol }))
      .toMatchObject({ status: 'siap_diberikan', siapDiberikan: { pink: 1, hijau: 4 } });
    expect(prosesKupon({ verified: true, target: 100_000_000, dibuat, diberikan: dibuat }).status).toBe('selesai');
  });

  it('penyesuaian 100 jt -> 250 jt menambah 1 pink dan 6 hijau untuk dibuat', () => {
    const dibuat = { pink: 1, hijau: 4 };
    expect(prosesKupon({ verified: true, target: 250_000_000, dibuat, diberikan: dibuat }))
      .toMatchObject({ status: 'perlu_dibuat', perluDibuat: { pink: 1, hijau: 6 } });
  });

  it('target turun tidak menarik kupon, dicatat sebagai kelebihan', () => {
    const dibuat = { pink: 2, hijau: 10 };
    expect(prosesKupon({ verified: true, target: 100_000_000, dibuat, diberikan: dibuat }))
      .toMatchObject({ status: 'selesai', kelebihan: { pink: 1, hijau: 6 } });
  });
});

describe('statusPax', () => {
  it('sesuai, melebihi, kurang terhadap pax terdaftar', () => {
    expect(statusPax(3, 3)).toBe('sesuai');
    expect(statusPax(5, 3)).toBe('melebihi');
    expect(statusPax(2, 3)).toBe('kurang');
  });

  it('tanpa pax terdaftar tidak ada status', () => {
    expect(statusPax(5, null)).toBeNull();
  });
});
