import type { Role } from '@/lib/auth';

/** Nama role sebagaimana ditulis di UI. Satu sumber untuk tabel dan dropdown. */
export const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'Super Admin',
  admin_rsvp: 'Admin RSVP',
  marketing: 'Marketing',
  rsm: 'RSM',
  customer: 'Customer',
};

export const SEMUA_ROLE = Object.keys(ROLE_LABEL) as Role[];

/** Halaman yang bisa diberikan ke sebuah akun. Urut per modul: Kehadiran, Order, Setting. */
export const HALAMAN: { href: string; label: string }[] = [
  { href: '/dashboard', label: 'Dashboard Kehadiran' },
  { href: '/reservation', label: 'Pencatatan Kehadiran' },
  { href: '/kehadiran', label: 'Detail Toko Hadir' },
  { href: '/leaderboard', label: 'Leaderboard Top Spender' },
  { href: '/order', label: 'Tambah Order' },
  { href: '/order/detail', label: 'Detail Order' },
  { href: '/admin/users', label: 'User Management' },
  { href: '/setting/waktu', label: 'Waktu Penambahan' },
];

/**
 * Preset per role, dipakai saat allowed_pages sebuah akun masih kosong.
 *
 * Sengaja tidak dipakai sebagai batas keras: begitu superadmin menyimpan
 * pilihannya, isian kolomlah yang berlaku. Preset hanya titik awal supaya akun
 * yang dibuat sebelum kolom ini ada tidak mendadak kehilangan akses.
 */
export const HALAMAN_BAWAAN: Record<Role, string[]> = {
  superadmin: [
    '/dashboard', '/reservation', '/kehadiran',
    '/leaderboard', '/order', '/order/detail',
    '/admin/users', '/setting/waktu',
  ],
  admin_rsvp: ['/reservation', '/kehadiran', '/leaderboard', '/order', '/order/detail'],
  // Marketing & RSM: Detail Order hanya untuk dilihat - tombol ubah/hapus/tambah
  // disembunyikan di UI dan ditolak di route mutasinya.
  marketing: ['/dashboard', '/kehadiran', '/leaderboard', '/order/detail'],
  rsm: ['/dashboard', '/kehadiran', '/leaderboard', '/order/detail'],
  // Customer cukup SATU halaman. Papan peringkat dan penambahan order sudah
  // menyatu di /leaderboard, jadi tidak ada lagi yang perlu dicari lewat menu -
  // dan menu samping pun tinggal satu entri.
  customer: ['/leaderboard'],
};

/** Halaman efektif sebuah akun: pilihan tersimpan, atau preset bila belum diatur. */
export const halamanEfektif = (role: Role, allowedPages: string[]) =>
  allowedPages.length > 0 ? allowedPages : HALAMAN_BAWAAN[role];

/**
 * Cakupan data hanya berlaku untuk role yang memang dibatasi.
 *
 * Super Admin, Admin RSVP, dan Marketing melihat seluruh data - menyimpan
 * pembatas untuk mereka hanya akan jadi jebakan yang diam-diam menyembunyikan
 * baris tanpa alasan yang terlihat di UI.
 */
export const SCOPE_PER_ROLE: Partial<Record<Role, { label: string; contoh: string }>> = {
  rsm: { label: 'Region', contoh: 'Misal: 3A' },
  customer: { label: 'Kode SAP', contoh: 'Misal: 600001' },
};

export const butuhScope = (role: Role) => role in SCOPE_PER_ROLE;

/** Ringkasan cakupan data untuk ditampilkan di tabel dan panel detail. */
export function labelScope(role: Role, dataScope: string | null) {
  if (!butuhScope(role)) return 'Semua data';
  if (!dataScope) return 'Semua data';
  return `${SCOPE_PER_ROLE[role]!.label} ${dataScope}`;
}
