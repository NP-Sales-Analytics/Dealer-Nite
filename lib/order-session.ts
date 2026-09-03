import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const COOKIE = 'pylox_customer';
const MAX_AGE_S = 12 * 3600; // event berlangsung satu malam; 12 jam cukup longgar.

function secret() {
  const s = process.env.CUSTOMER_SESSION_SECRET;
  if (!s) throw new Error('CUSTOMER_SESSION_SECRET belum diset');
  return s;
}

// token = base64url("<customerId>:<expiresAtMs>") + "." + base64url(hmac)
export function signSession(customerId: string, now = Date.now()): string {
  const payload = `${customerId}:${now + MAX_AGE_S * 1000}`;
  const body = Buffer.from(payload).toString('base64url');
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySession(token: string, now = Date.now()): string | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [customerId, expStr] = Buffer.from(body, 'base64url').toString().split(':');
  const exp = Number(expStr);
  if (!customerId || !Number.isFinite(exp) || exp < now) return null;
  return customerId;
}

export async function setCustomerCookie(customerId: string) {
  (await cookies()).set(COOKIE, signSession(customerId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_S,
  });
}

export async function getCustomerId(): Promise<string | null> {
  const c = (await cookies()).get(COOKIE)?.value;
  return c ? verifySession(c) : null;
}

export async function clearCustomerCookie() {
  (await cookies()).delete(COOKIE);
}

export async function requireCustomerApi(): Promise<string | NextResponse> {
  const id = await getCustomerId();
  if (!id) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  return id;
}
