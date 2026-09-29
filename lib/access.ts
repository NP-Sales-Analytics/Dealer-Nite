import type { Role } from '@/lib/auth';

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  marketing: 'Marketing',
  management: 'Management',
  dn_user: 'Akun DN',
};

export const SEMUA_ROLE = Object.keys(ROLE_LABEL) as Role[];

export const HALAMAN: { href: string; label: string }[] = [
  { href: '/dashboard', label: 'Dashboard Kehadiran' },
  { href: '/reservation', label: 'Pencatatan Kehadiran' },
  { href: '/kehadiran', label: 'Detail Toko Hadir' },
  { href: '/leaderboard', label: 'Leaderboard Target DN' },
  { href: '/order/detail', label: 'Detail Target DN' },
  { href: '/admin/users', label: 'User Management' },
  { href: '/setting/pax', label: 'Setting Pax' },
];

export const HALAMAN_BAWAAN: Record<Role, string[]> = {
  superadmin: HALAMAN.map((item) => item.href),
  admin: ['/dashboard', '/reservation', '/kehadiran', '/leaderboard', '/order/detail', '/setting/pax'],
  marketing: ['/dashboard', '/kehadiran', '/leaderboard', '/order/detail'],
  management: ['/dashboard', '/kehadiran', '/leaderboard', '/order/detail'],
  dn_user: ['/dashboard', '/kehadiran', '/leaderboard', '/order/detail'],
};

export const halamanEfektif = (role: Role, allowedPages: string[]) =>
  allowedPages.length > 0 ? allowedPages : HALAMAN_BAWAAN[role];

type DealerNightPrincipal = { role: Role; dealerNightId: string | null };

export function canReadDealerNight(user: DealerNightPrincipal, dealerNightId: string): boolean {
  return user.role === 'dn_user' ? user.dealerNightId === dealerNightId : true;
}

export function canAdjustTarget(user: DealerNightPrincipal, dealerNightId: string): boolean {
  return (user.role === 'superadmin' || user.role === 'admin')
    && canReadDealerNight(user, dealerNightId);
}

export function labelDealerNightAccess(
  role: Role,
  dealerNightId: string | null,
  dealerNightName: string | null,
): string {
  if (role !== 'dn_user') return 'Semua Dealer Night';
  if (!dealerNightId) return 'Belum ditentukan';
  return dealerNightName || dealerNightId;
}
