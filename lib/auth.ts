import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

export type Role = 'superadmin' | 'admin_rsvp' | 'rsm' | 'customer';
export type SessionUser = { id: string; email: string; fullName: string; role: Role };

export const HOME_BY_ROLE: Record<Role, string> = {
  superadmin: '/reservation',
  admin_rsvp: '/reservation',
  rsm: '/dashboard',
  customer: '/no-access',
};

// cache() men-dedup per request: layout (app) memanggilnya untuk sidebar dan tiap
// halaman memanggilnya lagi lewat requireRole. Tanpa ini setiap halaman melakukan
// dua kali auth.getUser() + query profiles.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (!profile) return null;

  return {
    id: user.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role as Role,
  };
});

export async function requireRole(allowed: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!allowed.includes(user.role)) redirect('/no-access');
  return user;
}

export async function requireRoleApi(allowed: Role[]): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  if (!allowed.includes(user.role)) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
  }
  return user;
}
