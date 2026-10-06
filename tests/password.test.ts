import { describe, expect, it } from 'vitest';
process.env.AUTH_SECRET = 'test-secret';
const { hashPassword, normalisasiNama } = await import('@/lib/password');

describe('normalisasiNama', () => {
  it('username tidak peka huruf besar dan spasi tepi', () => {
    expect(normalisasiNama('  Admin DN Bogor ')).toBe(normalisasiNama('admin dn bogor'));
  });
  it('nama berbeda tetap berbeda', () => {
    expect(normalisasiNama('Admin DN Bogor')).not.toBe(normalisasiNama('Admin DN Bekasi'));
  });
});

describe('hashPassword', () => {
  it('deterministik untuk input sama (jadi bisa dicari + unique)', () => {
    expect(hashPassword('rahasia123')).toBe(hashPassword('rahasia123'));
  });
  it('berbeda untuk input berbeda', () => {
    expect(hashPassword('a')).not.toBe(hashPassword('b'));
  });
  it('menghasilkan 64 hex (sha256)', () => {
    expect(hashPassword('x')).toMatch(/^[0-9a-f]{64}$/);
  });
});
