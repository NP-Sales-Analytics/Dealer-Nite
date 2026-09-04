import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const COOKIE = 'pylox_session';
const MAX_AGE_S = 12 * 3600; // satu malam event; 12 jam cukup longgar.

export type SessionKind = 'team' | 'customer';
export type Session = { kind: SessionKind; id: string };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET belum diset');
  return s;
}

// token = base64url("<kind>:<id>:<expiresAtMs>") + "." + base64url(hmac)
export function signSession(kind: SessionKind, id: string, now = Date.now()): string {
  const body = Buffer.from(`${kind}:${id}:${now + MAX_AGE_S * 1000}`).toString('base64url');
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySession(token: string, now = Date.now()): Session | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [kind, id, expStr] = Buffer.from(body, 'base64url').toString().split(':');
  const exp = Number(expStr);
  if ((kind !== 'team' && kind !== 'customer') || !id || !Number.isFinite(exp) || exp < now) return null;
  return { kind, id };
}

export async function setSessionCookie(kind: SessionKind, id: string) {
  (await cookies()).set(COOKIE, signSession(kind, id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_S,
  });
}

export async function getSession(): Promise<Session | null> {
  const c = (await cookies()).get(COOKIE)?.value;
  return c ? verifySession(c) : null;
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}

/** id customer bila sesi yang aktif adalah customer, selain itu null. */
export async function getCustomerId(): Promise<string | null> {
  const s = await getSession();
  return s?.kind === 'customer' ? s.id : null;
}

/** Gerbang route API khusus customer (mis. /api/order/me). */
export async function requireCustomerApi(): Promise<string | NextResponse> {
  const id = await getCustomerId();
  if (!id) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  return id;
}
