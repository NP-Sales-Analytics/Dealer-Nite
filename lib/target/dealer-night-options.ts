import { and, asc, eq } from 'drizzle-orm';
import type { SessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { dealerNights } from '@/lib/db/schema';

export async function dealerNightOptionsFor(user: SessionUser) {
  const condition = user.role === 'dn_user'
    ? and(eq(dealerNights.active, true), eq(dealerNights.id, user.dealerNightId!))
    : eq(dealerNights.active, true);
  return db
    .select({ id: dealerNights.id, name: dealerNights.name })
    .from(dealerNights)
    .where(condition)
    .orderBy(asc(dealerNights.name));
}
