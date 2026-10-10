import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { cache } from 'react';
import { HALAMAN, halamanEfektif } from '@/lib/access';
import { db } from '@/lib/db';
import { profiles, type DbRole } from '@/lib/db/schema';
import { getSession } from '@/lib/session';
import { dnIdsWilayah } from '@/lib/target/dealer-night-options';
import { ttlCache } from '@/lib/ttl-cache';

export type Role = DbRole;
export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  allowedPages: string[];
  dealerNightIds: string[] | null;
  depotCodes: string[] | null;
  bolehUnduh: boolean;
  /** Khusus superadmin: null = pusat (semua wilayah), selain itu Super Admin wilayah. */
  wilayah: string | null;
};

export const HOME_BY_ROLE: Record<Role, string> = {
  superadmin: '/reservation',
  admin: '/reservation',
  marketing: '/dashboard',
  management: '/dashboard',
  dn_user: '/leaderboard',
};

/**
 * Halaman pertama setelah login: halaman bawaan role bila diizinkan, selain itu
 * halaman pertama yang diizinkan sesuai urutan sidebar.
 */
export function halamanAwal(role: Role, allowedPages: string[]): string {
  const boleh = halamanEfektif(role, allowedPages);
  if (boleh.includes(HOME_BY_ROLE[role])) return HOME_BY_ROLE[role];
  return HALAMAN.find((item) => boleh.includes(item.href))?.href ?? '/no-access';
}

const cacheProfil = ttlCache(async (userId: string) => {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return profile ?? null;
}, 60_000);

export const lupakanProfil = (userId?: string) => cacheProfil.clear(userId);

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const profile = await cacheProfil.get(session.id);
  if (!profile) return null;
  const superadmin = profile.role === 'superadmin';
  const wilayah = superadmin ? profile.wilayah ?? null : null;
  return {
    id: profile.id,
    email: profile.email ?? '',
    fullName: profile.fullName,
    role: profile.role,
    allowedPages: profile.allowedPages ?? [],
    // Super Admin pusat = semua DN (null). Super Admin wilayah = DN wilayahnya saja,
    // jadi semua pemeriksaan cakupan DN yang sudah ada otomatis ikut membatasinya.
    dealerNightIds: superadmin ? (wilayah ? await dnIdsWilayah.get(wilayah) : null) : profile.dealerNightIds ?? null,
    depotCodes: !superadmin && profile.depotCodes?.length ? profile.depotCodes : null,
    bolehUnduh: profile.bolehUnduh,
    wilayah,
  };
});

export async function requireHalaman(href: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!bolehHalaman(user, href)) redirect('/no-access');
  return user;
}

export async function requireRole(allowed: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!allowed.includes(user.role)) redirect('/no-access');
  return user;
}

export const bolehHalaman = (user: SessionUser, href: string) =>
  halamanEfektif(user.role, user.allowedPages).includes(href);

/** Izin API mengikuti halaman yang diberikan di User Management, bukan role. */
export async function requireHalamanApi(href: string): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  if (!bolehHalaman(user, href)) return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
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
