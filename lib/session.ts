import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/session-cookie';

const MAX_AGE_S = 12 * 3600;

export type Session = { kind: 'team'; id: string };

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error('AUTH_SECRET belum diset');
  return value;
}

export function signSession(kind: 'team', id: string, now = Date.now()): string {
  const body = Buffer.from(`${kind}:${id}:${now + MAX_AGE_S * 1000}`).toString('base64url');
  const signature = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifySession(token: string, now = Date.now()): Session | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    return null;
  }

  const [kind, id, expiryText] = Buffer.from(body, 'base64url').toString().split(':');
  const expiry = Number(expiryText);
  if (kind !== 'team' || !id || !Number.isFinite(expiry) || expiry < now) return null;
  return { kind: 'team', id };
}

export async function setSessionCookie(id: string) {
  (await cookies()).set(SESSION_COOKIE, signSession('team', id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_S,
  });
}

export async function getSession(): Promise<Session | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value ? verifySession(value) : null;
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
