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
  { href: '/kupon', label: 'Detail Kupon' },
  { href: '/admin/users', label: 'User Management' },
  { href: '/setting/pax', label: 'Setting Target DN' },
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

type DealerNightPrincipal = { role: Role; dealerNightIds: readonly string[] | null };

/**
 * Untuk SessionUser: superadmin pusat sudah berisi null, Super Admin wilayah
 * berisi DN wilayahnya (lihat getSessionUser). Jangan pakai untuk baris profil
 * mentah dari DB - pakai cakupanDnAkun.
 */
export const aksesSemuaDealerNight = (user: DealerNightPrincipal) => user.dealerNightIds === null;

/** Super Admin tanpa batas wilayah: satu-satunya yang mengelola seluruh user dan setelan. */
export const superAdminPusat = (user: { role: Role; wilayah?: string | null }) =>
  user.role === 'superadmin' && !user.wilayah;

/**
 * Cakupan DN sebuah akun untuk tampilan (dari baris profil DB): teks tunggal
 * untuk cakupan menyeluruh, atau daftar nama DN.
 */
export function cakupanDnAkun(
  user: DealerNightPrincipal & { wilayah?: string | null },
  options: { id: string; name: string }[],
): { semua: string } | { nama: string[] } {
  if (user.role === 'superadmin') return { semua: user.wilayah ? `Semua DN ${user.wilayah}` : 'Semua Dealer Night' };
  if (user.dealerNightIds === null) return { semua: 'Semua Dealer Night' };
  if (user.dealerNightIds.length === 0) return { semua: 'Belum ditentukan' };
  const names = new Map(options.map((item) => [item.id, item.name]));
  return { nama: user.dealerNightIds.map((id) => names.get(id) ?? id) };
}

export function canReadDealerNight(user: DealerNightPrincipal, dealerNightId: string): boolean {
  return aksesSemuaDealerNight(user) || user.dealerNightIds!.includes(dealerNightId);
}

/** Mencatat pembuatan/pemberian kupon (selain izin halaman Detail Kupon). */
export const bisaKelolaKupon = (user: { role: Role }) => user.role === 'superadmin' || user.role === 'admin';

/** Kode depot yang boleh diakses; null = semua depot dalam DN yang diizinkan. */
export function cakupanDepot(user: { role: Role; depotCodes?: readonly string[] | null }): readonly string[] | null {
  return user.role === 'superadmin' || !user.depotCodes || user.depotCodes.length === 0 ? null : user.depotCodes;
}

export const bolehDepot = (user: { role: Role; depotCodes?: readonly string[] | null }, depotCode: string) => {
  const cakupan = cakupanDepot(user);
  return !cakupan || cakupan.includes(depotCode);
};

export function canAdjustTarget(user: DealerNightPrincipal, dealerNightId: string): boolean {
  return (user.role === 'superadmin' || user.role === 'admin')
    && canReadDealerNight(user, dealerNightId);
}

export function labelDealerNightAccess(
  user: DealerNightPrincipal & { depotCodes?: readonly string[] | null; wilayah?: string | null },
  options: { id: string; name: string; depots?: { kode: string; depot: string }[] }[],
): string {
  const cakupan = cakupanDnAkun(user, options);
  if ('semua' in cakupan) return cakupan.semua;
  const dn = cakupan.nama.join(', ');
  if (!user.depotCodes?.length) return dn;
  const depot = new Map(options.flatMap((item) => (item.depots ?? []).map((d) => [d.kode, d.depot] as const)));
  return `${dn} · ${user.depotCodes.map((kode) => depot.get(kode) ?? kode).join(', ')}`;
}
