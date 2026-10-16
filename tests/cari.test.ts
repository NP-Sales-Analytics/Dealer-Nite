import { describe, expect, it } from 'vitest';
import { cocokCari } from '@/lib/cari';

describe('cocokCari', () => {
  it('mencocokkan teks sebagian tanpa peduli huruf besar, kosong = semua', () => {
    expect(cocokCari('', ['apa saja'])).toBe(true);
    expect(cocokCari('jaya', ['CV. HALIM JAYA', null])).toBe(true);
    expect(cocokCari('xyz', ['CV. HALIM JAYA', '632723'])).toBe(false);
  });

  it('No. Formulir harus persis sama, kode toko tetap cocok sebagian', () => {
    expect(cocokCari('88', ['TOKO'], [88])).toBe(true);
    expect(cocokCari('8', ['TOKO'], [18, 88])).toBe(false);
    expect(cocokCari('6327', ['TOKO', '632723'], [])).toBe(true);
  });
});
