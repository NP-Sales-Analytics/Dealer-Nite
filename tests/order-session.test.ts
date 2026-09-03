import { describe, expect, it } from 'vitest';
process.env.CUSTOMER_SESSION_SECRET = 'test-secret';
const { signSession, verifySession } = await import('@/lib/order-session');

describe('signed customer session', () => {
  const id = '11111111-1111-1111-1111-111111111111';

  it('round-trips a valid token', () => {
    expect(verifySession(signSession(id))).toBe(id);
  });

  it('rejects a tampered payload', () => {
    const t = signSession(id);
    const bad = t.replace(/^[^.]+/, Buffer.from('22222222-2222-2222-2222-222222222222:9999999999999').toString('base64url'));
    expect(verifySession(bad)).toBeNull();
  });

  it('rejects a tampered signature', () => {
    expect(verifySession(signSession(id).slice(0, -3) + 'aaa')).toBeNull();
  });

  it('rejects an expired token', () => {
    // Ditandatangani 13 jam lalu; max-age 12 jam, jadi sudah kedaluwarsa sekarang.
    const now = Date.now();
    expect(verifySession(signSession(id, now - 13 * 3600_000), now)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifySession('not-a-token')).toBeNull();
    expect(verifySession('')).toBeNull();
  });
});
