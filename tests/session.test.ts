import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
process.env.AUTH_SECRET = 'test-secret';
const { signSession, verifySession } = await import('@/lib/session');

describe('signed session', () => {
  const id = '11111111-1111-1111-1111-111111111111';

  it('round-trips team + id', () => {
    expect(verifySession(signSession('team', id))).toEqual({ kind: 'team', id });
  });

  it('rejects the removed customer session kind', () => {
    const body = Buffer.from(`customer:${id}:${Date.now() + 1e9}`).toString('base64url');
    const signature = createHmac('sha256', 'test-secret').update(body).digest('base64url');
    expect(verifySession(`${body}.${signature}`)).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const t = signSession('team', id);
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
