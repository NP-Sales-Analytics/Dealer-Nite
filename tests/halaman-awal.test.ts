import { describe, expect, it } from 'vitest';
import { halamanAwal } from '@/lib/auth';

describe('halamanAwal', () => {
  it('memakai halaman bawaan role bila diizinkan', () => {
    expect(halamanAwal('admin', [])).toBe('/reservation');
    expect(halamanAwal('admin', ['/dashboard', '/reservation'])).toBe('/reservation');
  });

  it('jatuh ke halaman pertama yang diizinkan sesuai urutan sidebar', () => {
    expect(halamanAwal('admin', ['/kupon', '/order/detail'])).toBe('/order/detail');
    expect(halamanAwal('admin', ['/order/detail', '/dashboard'])).toBe('/dashboard');
    expect(halamanAwal('dn_user', ['/kupon'])).toBe('/kupon');
  });
});
