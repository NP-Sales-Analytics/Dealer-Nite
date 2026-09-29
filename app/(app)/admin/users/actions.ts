'use server';

import { randomUUID } from 'node:crypto';
import { and, eq, ne } from 'drizzle-orm';
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

async function bacaDealerNight(formData: FormData, role: Role): Promise<string | null> {
  if (role !== 'dn_user') return null;

  const id = String(formData.get('dealerNightId') ?? '').trim();
  if (!id) throw new Error('Dealer Night wajib dipilih untuk Akun DN.');
  const [dealerNight] = await db
    .select({ id: dealerNights.id })
    .from(dealerNights)
    .where(eq(dealerNights.id, id))
    .limit(1);
  if (!dealerNight) throw new Error('Dealer Night tidak valid.');
  return dealerNight.id;
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

  let dealerNightId: string | null;
  try {
    dealerNightId = await bacaDealerNight(formData, role);
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
    dealerNightId,
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

  let dealerNightId: string | null;
  try {
    dealerNightId = await bacaDealerNight(formData, role);
  } catch (error) {
    return error instanceof Error ? error.message : 'Dealer Night tidak valid.';
  }

  const values: {
    email: string | null;
    fullName: string;
    role: Role;
    allowedPages: string[];
    dealerNightId: string | null;
    bolehUnduh: boolean;
    passwordHash?: string;
  } = {
    email: email || null,
    fullName,
    role,
    allowedPages: bacaHalaman(formData),
    dealerNightId,
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
