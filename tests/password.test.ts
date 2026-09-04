import { describe, expect, it } from 'vitest';
process.env.AUTH_SECRET = 'test-secret';
const { hashPassword } = await import('@/lib/password');

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
