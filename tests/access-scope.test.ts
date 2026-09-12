import { describe, expect, it } from 'vitest';
import { daftarRegion, gabungRegion, labelScope } from '@/lib/access';

// daftarRegion/gabungRegion adalah jantung dukungan RSM multi-region: cakupan
// beberapa region (mis. 1A, 1B, 1C & 5 sekaligus) disimpan sebagai satu string
// berkoma di kolom data_scope yang sama, bukan kolom array terpisah.
describe('daftarRegion', () => {
  it('memecah string berkoma menjadi daftar region', () => {
    expect(daftarRegion('1A,1B,1C,5')).toEqual(['1A', '1B', '1C', '5']);
  });

  it('membuang spasi di sekitar koma', () => {
    expect(daftarRegion('1A, 1B ,  1C')).toEqual(['1A', '1B', '1C']);
  });

  it('region tunggal tetap jadi daftar satu elemen - kompatibel dengan data lama', () => {
    expect(daftarRegion('3A')).toEqual(['3A']);
  });

  it('null dan string kosong menghasilkan daftar kosong, bukan [""]', () => {
    expect(daftarRegion(null)).toEqual([]);
    expect(daftarRegion('')).toEqual([]);
  });
});

describe('gabungRegion', () => {
  it('menggabung daftar jadi satu string berkoma, terurut dan tanpa duplikat', () => {
    expect(gabungRegion(['5', '1C', '1A', '1B', '1A'])).toBe('1A,1B,1C,5');
  });

  it('daftar kosong menghasilkan string kosong', () => {
    expect(gabungRegion([])).toBe('');
  });

  it('adalah kebalikan sempurna dari daftarRegion untuk daftar yang sudah rapi', () => {
    const asal = ['1A', '1B', '1C', '5'];
    expect(daftarRegion(gabungRegion(asal))).toEqual(asal);
  });
});

describe('labelScope untuk RSM multi-region', () => {
  it('menampilkan seluruh region yang dirangkap, dipisah koma-spasi', () => {
    expect(labelScope('rsm', '1A,1B,1C,5')).toBe('Region 1A, 1B, 1C, 5');
  });

  it('region tunggal tetap tampil seperti sebelumnya', () => {
    expect(labelScope('rsm', '3A')).toBe('Region 3A');
  });

  it('tanpa cakupan berarti melihat semua data', () => {
    expect(labelScope('rsm', null)).toBe('Semua data');
  });
});
