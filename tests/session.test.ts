import { describe, expect, it } from 'vitest';
process.env.AUTH_SECRET = 'test-secret';
const { signSession, verifySession } = await import('@/lib/session');

describe('signed session', () => {
  const id = '11111111-1111-1111-1111-111111111111';

  it('round-trips kind + id', () => {
    expect(verifySession(signSession('team', id))).toEqual({ kind: 'team', id });
    expect(verifySession(signSession('customer', id))).toEqual({ kind: 'customer', id });
  });

  it('rejects a tampered payload', () => {
    const t = signSession('customer', id);
    const forged = Buffer.from(`team:${id}:${Date.now() + 1e9}`).toString('base64url');
    expect(verifySession(t.replace(/^[^.]+/, forged))).toBeNull();
  });

  it('rejects a tampered signature', () => {
    expect(verifySession(signSession('team', id).slice(0, -3) + 'aaa')).toBeNull();
  });

  it('rejects an expired token', () => {
    // Ditandatangani 13 jam lalu; max-age 12 jam, jadi sudah kedaluwarsa sekarang.
    const now = Date.now();
    expect(verifySession(signSession('team', id, now - 13 * 3600_000), now)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifySession('not-a-token')).toBeNull();
    expect(verifySession('')).toBeNull();
  });
});
