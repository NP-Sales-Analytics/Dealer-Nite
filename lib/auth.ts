import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { cache } from 'react';
import { halamanEfektif } from '@/lib/access';
import { db } from '@/lib/db';
import { customers, profiles } from '@/lib/db/schema';
import { getSession } from '@/lib/session';
import { ttlCache } from '@/lib/ttl-cache';

export type Role = 'superadmin' | 'admin_rsvp' | 'marketing' | 'rsm' | 'customer';
export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  allowedPages: string[];
  dataScope: string | null;
};

export const HOME_BY_ROLE: Record<Role, string> = {
  superadmin: '/reservation',
  admin_rsvp: '/reservation',
  marketing: '/dashboard',
  rsm: '/dashboard',
  customer: '/leaderboard',
};

// Profil (nama + role + akses) di-cache 60 detik per user. Identitas tetap berasal
// dari cookie sesi yang tanda tangannya diverifikasi ulang tiap request; yang
// disimpan hanya pemetaan id -> profil. Perubahan role berlaku penuh dalam <=60
// detik pada instance yang belum menyentuhnya; instance yang mengubah membersihkan
// cachenya lewat lupakanProfil().
const cacheProfil = ttlCache(async (userId: string) => {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return profile ?? null;
}, 60_000);
export const lupakanProfil = (userId?: string) => cacheProfil.clear(userId);

// Sama untuk identitas customer (nama toko + kode_sap). Data toko jarang berubah.
const cacheCustomer = ttlCache(async (id: string) => {
  const [c] = await db
    .select({ id: customers.id, namaToko: customers.namaToko, kodeSap: customers.kodeSap })
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  return c ?? null;
}, 60_000);
export const lupakanCustomer = (id?: string) => cacheCustomer.clear(id);

// cache() men-dedup per request: layout (app) memanggilnya untuk sidebar dan tiap
// halaman memanggilnya lagi lewat requireHalaman/requireRole.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getSession();
  if (!session) return null;

  if (session.kind === 'team') {
    const profile = await cacheProfil.get(session.id);
    if (!profile) return null;
    return {
      id: profile.id,
      email: profile.email ?? '',
      fullName: profile.fullName,
      role: profile.role as Role,
      allowedPages: profile.allowedPages ?? [],
      dataScope: profile.dataScope,
    };
  }

  // Customer: identitas dari tabel customers, akses = preset role 'customer'
  // (HALAMAN_BAWAAN), cakupan data terkunci ke kode_sap-nya (terapkanScope).
  const c = await cacheCustomer.get(session.id);
  if (!c) return null;
  return {
    id: c.id,
    email: '',
    fullName: c.namaToko,
    role: 'customer',
    allowedPages: [],
    dataScope: c.kodeSap,
  };
});

/**
 * Gerbang per-halaman. Yang ditegakkan adalah daftar halaman milik akun
 * (allowed_pages / preset role), bukan sekadar rolenya.
 */
export async function requireHalaman(href: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!halamanEfektif(user.role, user.allowedPages).includes(href)) redirect('/no-access');
  return user;
}

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
