'use server';

import { randomUUID } from 'node:crypto';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { HALAMAN, SEMUA_ROLE } from '@/lib/access';
import { lupakanProfil, requireRole, type Role } from '@/lib/auth';
import { db } from '@/lib/db';
import { dealerNights, profiles } from '@/lib/db/schema';
import { hashPassword } from '@/lib/password';

const HREF_SAH = HALAMAN.map((item) => item.href);

function bacaHalaman(formData: FormData): string[] {
  return formData.getAll('pages').map(String).filter((href) => HREF_SAH.includes(href));
}

/** null = semua Dealer Night. Superadmin selalu semua. */
async function bacaCakupanDealerNight(formData: FormData, role: Role): Promise<string[] | null> {
  if (role === 'superadmin' || formData.get('dealerNightScope') === 'all') return null;

  const ids = [...new Set(formData.getAll('dealerNightIds').map((value) => String(value).trim()).filter(Boolean))];
  if (ids.length === 0) throw new Error('Pilih minimal satu Dealer Night, atau Semua Dealer Night.');
  const found = await db.select({ id: dealerNights.id }).from(dealerNights).where(inArray(dealerNights.id, ids));
  if (found.length !== ids.length) throw new Error('Dealer Night tidak valid.');
  return ids;
}

async function passwordDipakai(hash: string, kecualiUserId?: string): Promise<boolean> {
  const condition = kecualiUserId
    ? and(eq(profiles.passwordHash, hash), ne(profiles.id, kecualiUserId))
    : eq(profiles.passwordHash, hash);
  const [row] = await db.select({ id: profiles.id }).from(profiles).where(condition).limit(1);
  return !!row;
}

export async function createUser(_prev: string | null, formData: FormData): Promise<string | null> {
  await requireRole(['superadmin']);

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();
  const fullName = String(formData.get('fullName') ?? '').trim();
  const role = String(formData.get('role') ?? '') as Role;

  if (email && !email.includes('@')) return 'Email tidak valid.';
  if (!fullName) return 'Nama lengkap wajib diisi.';
  if (password.length < 8) return 'Password minimal 8 karakter.';
  if (!SEMUA_ROLE.includes(role)) return 'Role tidak valid.';

  const passwordHash = hashPassword(password);
  if (await passwordDipakai(passwordHash)) return 'Password sudah dipakai user lain. Pakai yang berbeda.';

  let dealerNightIds: string[] | null;
  try {
    dealerNightIds = await bacaCakupanDealerNight(formData, role);
  } catch (error) {
    return error instanceof Error ? error.message : 'Dealer Night tidak valid.';
  }

  await db.insert(profiles).values({
    id: randomUUID(),
    email: email || null,
    fullName,
    role,
    passwordHash,
    allowedPages: bacaHalaman(formData),
    dealerNightIds,
    bolehUnduh: formData.get('bolehUnduh') === 'on',
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
  if (email && !email.includes('@')) return 'Email tidak valid.';
  if (!fullName) return 'Nama lengkap wajib diisi.';
  if (password && password.length < 8) return 'Password minimal 8 karakter.';
  if (!SEMUA_ROLE.includes(role)) return 'Role tidak valid.';
  if (me.id === userId && role !== 'superadmin') return 'Tidak bisa mengubah role akun sendiri.';

  let dealerNightIds: string[] | null;
  try {
    dealerNightIds = await bacaCakupanDealerNight(formData, role);
  } catch (error) {
    return error instanceof Error ? error.message : 'Dealer Night tidak valid.';
  }

  const values: {
    email: string | null;
    fullName: string;
    role: Role;
    allowedPages: string[];
    dealerNightIds: string[] | null;
    bolehUnduh: boolean;
    passwordHash?: string;
  } = {
    email: email || null,
    fullName,
    role,
    allowedPages: bacaHalaman(formData),
    dealerNightIds,
    bolehUnduh: formData.get('bolehUnduh') === 'on',
  };

  if (password) {
    const passwordHash = hashPassword(password);
    if (await passwordDipakai(passwordHash, userId)) {
      return 'Password sudah dipakai user lain. Pakai yang berbeda.';
    }
    values.passwordHash = passwordHash;
  }

  await db.update(profiles).set(values).where(eq(profiles.id, userId));
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
