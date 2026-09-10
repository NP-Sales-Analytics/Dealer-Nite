import { describe, expect, it } from 'vitest';
import { bacaKunci, filterKey, terapkanScope, type DashboardFilter } from '@/lib/dashboard/filters';

const KOSONG: DashboardFilter = {
  wilayah: [], region: [], depot: [], q: null, kodeSap: null,
};

describe('terapkanScope', () => {
  it('mengunci RSM ke regionnya', () => {
    const hasil = terapkanScope(KOSONG, { role: 'rsm', dataScope: '3A' });
    expect(hasil.region).toEqual(['3A']);
  });

  it('MENIMPA region yang diminta, bukan menggabung', () => {
    // Ini inti pengamanannya: RSM 3A yang menambahkan ?region=3B di URL tetap
    // harus terkunci di 3A. Kalau tes ini gagal, cakupan data bisa dilepas
    // siapa pun hanya dengan mengetik ulang query string.
    // Termasuk saat yang diminta BANYAK region sekaligus - seluruh daftarnya
    // ditimpa, bukan disaring, jadi tidak ada satu pun yang lolos ikut.
    const diminta = { ...KOSONG, region: ['3B', '3C'] };
    expect(terapkanScope(diminta, { role: 'rsm', dataScope: '3A' }).region).toEqual(['3A']);
  });

  it('mengunci customer ke kode SAP-nya', () => {
    const hasil = terapkanScope(KOSONG, { role: 'customer', dataScope: '600001' });
    expect(hasil.kodeSap).toBe('600001');
  });

  it('membiarkan role tanpa batas melihat semua data', () => {
    for (const role of ['superadmin', 'admin_rsvp', 'marketing'] as const) {
      // Nilai dataScope diisi sengaja: kalaupun tersimpan karena role pernah
      // diganti, role ini tetap tidak boleh ikut terbatasi.
      const hasil = terapkanScope(KOSONG, { role, dataScope: '3A' });
      expect(hasil).toEqual(KOSONG);
    }
  });

  it('tidak membatasi apa pun kalau cakupannya kosong', () => {
    expect(terapkanScope(KOSONG, { role: 'rsm', dataScope: null })).toEqual(KOSONG);
  });
});

describe('filterKey memisahkan cache antar cakupan', () => {
  // Hasil query di-cache per kunci. Dua user dengan cakupan berbeda yang
  // menghasilkan kunci sama akan saling melihat data - karena itu kunci wajib
  // ikut berubah begitu cakupannya berbeda.
  it('RSM region berbeda menghasilkan kunci berbeda', () => {
    const a = filterKey(terapkanScope(KOSONG, { role: 'rsm', dataScope: '3A' }));
    const b = filterKey(terapkanScope(KOSONG, { role: 'rsm', dataScope: '3B' }));
    expect(a).not.toBe(b);
  });

  it('customer berbeda menghasilkan kunci berbeda', () => {
    const a = filterKey(terapkanScope(KOSONG, { role: 'customer', dataScope: '600001' }));
    const b = filterKey(terapkanScope(KOSONG, { role: 'customer', dataScope: '600002' }));
    expect(a).not.toBe(b);
  });

  it('user terbatas tidak pernah berbagi kunci dengan yang tidak terbatas', () => {
    const bebas = filterKey(terapkanScope(KOSONG, { role: 'superadmin', dataScope: null }));
    const rsm = filterKey(terapkanScope(KOSONG, { role: 'rsm', dataScope: '3A' }));
    const cust = filterKey(terapkanScope(KOSONG, { role: 'customer', dataScope: '600001' }));
    expect(new Set([bebas, rsm, cust]).size).toBe(3);
  });
});

describe('bacaKunci', () => {
  it('mengembalikan filter yang sama seperti sebelum diserialisasi', () => {
    const f: DashboardFilter = {
      wilayah: ['Indonesia Barat', 'Indonesia Timur'],
      region: ['3A', '3B'],
      depot: ['1V Purwokerto', '5N Kebumen'],
      q: 'toko',
      kodeSap: '600001',
    };
    expect(bacaKunci(filterKey(f))).toEqual(f);
  });

  it('bidang kosong kembali sebagai null/array kosong, bukan string kosong', () => {
    expect(bacaKunci(filterKey(KOSONG))).toEqual(KOSONG);
  });

  // Urutan pilihan tidak boleh memecah cache: orang yang memilih 3A lalu 3B
  // harus memakai hasil yang sama dengan yang memilih 3B lalu 3A.
  it('urutan pilihan tidak mengubah kunci', () => {
    const a = filterKey({ ...KOSONG, region: ['3A', '3B'], depot: ['X', 'A'] });
    const b = filterKey({ ...KOSONG, region: ['3B', '3A'], depot: ['A', 'X'] });
    expect(a).toBe(b);
  });
});
