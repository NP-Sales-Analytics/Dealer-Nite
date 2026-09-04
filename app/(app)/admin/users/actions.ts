'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { butuhScope, HALAMAN, SEMUA_ROLE } from '@/lib/access';
import { lupakanProfil, requireRole, type Role } from '@/lib/auth';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { hashPassword } from '@/lib/password';

const HREF_SAH = HALAMAN.map((h) => h.href);

/**
 * Membaca halaman terpilih dari FormData, disaring terhadap daftar yang sah.
 * FormData datang dari klien dan bisa berisi path apa pun, sedangkan nilai ini
 * jadi dasar keputusan akses di requireHalaman().
 */
function bacaHalaman(formData: FormData): string[] {
  return formData.getAll('pages').map(String).filter((h) => HREF_SAH.includes(h));
}

/** Cakupan data hanya disimpan untuk role yang memang dibatasi. */
function bacaScope(formData: FormData, role: Role): string | null {
  if (!butuhScope(role)) return null;
  const v = String(formData.get('dataScope') ?? '').trim();
  return v === '' ? null : v;
}

/** Password wajib unik: dialah pengenal saat login "password saja". */
async function passwordDipakai(hash: string, kecualiUserId?: string): Promise<boolean> {
  const cond = kecualiUserId
    ? and(eq(profiles.passwordHash, hash), ne(profiles.id, kecualiUserId))
    : eq(profiles.passwordHash, hash);
  const [row] = await db.select({ id: profiles.id }).from(profiles).where(cond).limit(1);
  return !!row;
}

export async function createUser(_prev: string | null, formData: FormData): Promise<string | null> {
  await requireRole(['superadmin']);

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();
  const fullName = String(formData.get('fullName') ?? '').trim();
  const role = String(formData.get('role') ?? '') as Role;

  if (email !== '' && !email.includes('@')) return 'Email tidak valid.';
  if (password.length < 8) return 'Password minimal 8 karakter.';
  if (!SEMUA_ROLE.includes(role)) return 'Role tidak valid.';

  const passwordHash = hashPassword(password);
  if (await passwordDipakai(passwordHash)) return 'Password sudah dipakai user lain. Pakai yang berbeda.';

  await db.insert(profiles).values({
    email: email || null,
    fullName,
    role,
    passwordHash,
    allowedPages: bacaHalaman(formData),
    dataScope: bacaScope(formData, role),
  });

  revalidatePath('/admin/users');
  return null;
}

export async function updateUser(_prev: string | null, formData: FormData): Promise<string | null> {
  const me = await requireRole(['superadmin']);

  const userId = String(formData.get('userId') ?? '');
  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();
  const role = String(formData.get('role') ?? '') as Role;

  if (!userId) return 'User tidak ditemukan.';
  if (email !== '' && !email.includes('@')) return 'Email tidak valid.';
  // Password kosong = jangan diubah. Kalau diisi, minimal 8 dan tetap harus unik.
  if (password !== '' && password.length < 8) return 'Password minimal 8 karakter.';
  if (!SEMUA_ROLE.includes(role)) return 'Role tidak valid.';

  // Superadmin terakhir tidak boleh menurunkan rolenya sendiri lalu terkunci.
  if (me.id === userId && role !== 'superadmin') {
    return 'Tidak bisa mengubah role akun sendiri.';
  }

  const set: {
    email: string | null;
    fullName: string;
    role: Role;
    allowedPages: string[];
    dataScope: string | null;
    passwordHash?: string;
  } = {
    email: email || null,
    fullName,
    role,
    allowedPages: bacaHalaman(formData),
    dataScope: bacaScope(formData, role),
  };

  if (password !== '') {
    const passwordHash = hashPassword(password);
    if (await passwordDipakai(passwordHash, userId)) {
      return 'Password sudah dipakai user lain. Pakai yang berbeda.';
    }
    set.passwordHash = passwordHash;
  }

  await db.update(profiles).set(set).where(eq(profiles.id, userId));

  // Tanpa ini, role dan akses lama masih dipakai sampai cache 60 detik habis.
  lupakanProfil(userId);
  revalidatePath('/admin/users');
  return null;
}

export async function deleteUser(userId: string) {
  const me = await requireRole(['superadmin']);
  if (me.id === userId) throw new Error('Tidak bisa menghapus akun sendiri');
  await db.delete(profiles).where(eq(profiles.id, userId));
  lupakanProfil(userId);
  revalidatePath('/admin/users');
}
