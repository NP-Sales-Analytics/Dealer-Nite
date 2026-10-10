'use server';

import { randomUUID } from 'node:crypto';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { canReadDealerNight, HALAMAN, SEMUA_ROLE, superAdminPusat } from '@/lib/access';
import { lupakanProfil, requireRole, type Role, type SessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { dealerNights, profiles } from '@/lib/db/schema';
import { hashPassword, normalisasiNama } from '@/lib/password';
import { depotDealerNight } from '@/lib/target/dealer-night-options';
import { WILAYAH, type Wilayah } from '@/lib/target/dn-bawaan';

const HREF_SAH = HALAMAN.map((item) => item.href);

function bacaHalaman(formData: FormData): string[] {
  return formData.getAll('pages').map(String).filter((href) => HREF_SAH.includes(href));
}

/** Depot dalam DN terpilih; kosong atau DN "semua" = seluruh depot (null). */
async function bacaCakupanDepot(formData: FormData, dealerNightIds: string[] | null): Promise<string[] | null> {
  if (!dealerNightIds) return null;
  const kode = [...new Set(formData.getAll('depotCodes').map((value) => String(value).trim()).filter(Boolean))];
  if (kode.length === 0) return null;
  const rows = await db.select({ id: dealerNights.id, depotCodes: dealerNights.depotCodes })
    .from(dealerNights).where(inArray(dealerNights.id, dealerNightIds));
  const sah = new Set([...(await depotDealerNight(rows)).values()].flat().map((item) => item.kode));
  if (kode.some((k) => !sah.has(k))) throw new Error('Ada depot yang bukan bagian Dealer Night terpilih.');
  return kode;
}

/**
 * null = semua Dealer Night. Superadmin tidak memakai daftar DN (dibatasi lewat
 * wilayah). Super Admin wilayah hanya boleh memberi DN di wilayahnya sendiri.
 */
async function bacaCakupanDealerNight(formData: FormData, role: Role, me: SessionUser): Promise<string[] | null> {
  if (role === 'superadmin') return null;
  const pusat = superAdminPusat(me);
  if (pusat && formData.get('dealerNightScope') === 'all') return null;

  const ids = [...new Set(formData.getAll('dealerNightIds').map((value) => String(value).trim()).filter(Boolean))];
  if (ids.length === 0) throw new Error(pusat ? 'Pilih minimal satu Dealer Night, atau Semua Dealer Night.' : 'Pilih minimal satu Dealer Night.');
  const found = await db.select({ id: dealerNights.id }).from(dealerNights).where(inArray(dealerNights.id, ids));
  if (found.length !== ids.length) throw new Error('Dealer Night tidak valid.');
  if (!pusat && ids.some((id) => !canReadDealerNight(me, id))) throw new Error('Ada Dealer Night di luar wilayah Anda.');
  return ids;
}

type Target = { id: string; wilayah: string | null };

/** Wilayah Super Admin. Wilayah akun sendiri tidak bisa diubah, supaya tidak terkunci atau naik hak. */
function bacaWilayah(formData: FormData, role: Role, me: SessionUser, target?: Target): string | null {
  if (role !== 'superadmin') return null;
  if (target?.id === me.id) return target.wilayah;
  const nilai = String(formData.get('wilayah') ?? '');
  if (!nilai) return null;
  if (!WILAYAH.includes(nilai as Wilayah)) throw new Error('Wilayah tidak valid.');
  return nilai;
}

/**
 * Super Admin pusat mengelola semua user; Super Admin wilayah hanya user yang
 * ia buat dan akunnya sendiri. null = tidak ada atau bukan haknya.
 */
async function targetKelola(me: SessionUser, userId: string): Promise<Target | null> {
  const [target] = await db.select({ id: profiles.id, wilayah: profiles.wilayah, createdBy: profiles.createdBy })
    .from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (!target) return null;
  return superAdminPusat(me) || target.id === me.id || target.createdBy === me.id ? target : null;
}

const SUPERADMIN_PUSAT_SAJA = 'Hanya Super Admin pusat yang bisa membuat atau mengubah akun Super Admin.';

async function passwordDipakai(hash: string, kecualiUserId?: string): Promise<boolean> {
  const condition = kecualiUserId
    ? and(eq(profiles.passwordHash, hash), ne(profiles.id, kecualiUserId))
    : eq(profiles.passwordHash, hash);
  const [row] = await db.select({ id: profiles.id }).from(profiles).where(condition).limit(1);
  return !!row;
}

/** Nama lengkap dipakai sebagai username login, jadi harus unik (tanpa beda huruf besar). */
async function namaDipakai(fullName: string, kecualiUserId?: string): Promise<boolean> {
  const sama = sql`LOWER(TRIM(${profiles.fullName})) = ${normalisasiNama(fullName)}`;
  const condition = kecualiUserId ? and(sama, ne(profiles.id, kecualiUserId)) : sama;
  const [row] = await db.select({ id: profiles.id }).from(profiles).where(condition).limit(1);
  return !!row;
}

const NAMA_GANDA = 'Nama lengkap sudah dipakai user lain. Nama ini menjadi username login, jadi harus unik.';

export async function createUser(_prev: string | null, formData: FormData): Promise<string | null> {
  const me = await requireRole(['superadmin']);

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();
  const fullName = String(formData.get('fullName') ?? '').trim();
  const role = String(formData.get('role') ?? '') as Role;

  if (email && !email.includes('@')) return 'Email tidak valid.';
  if (!fullName) return 'Nama lengkap wajib diisi.';
  if (password.length < 8) return 'Password minimal 8 karakter.';
  if (!SEMUA_ROLE.includes(role)) return 'Role tidak valid.';
  if (role === 'superadmin' && !superAdminPusat(me)) return SUPERADMIN_PUSAT_SAJA;
  if (await namaDipakai(fullName)) return NAMA_GANDA;

  const passwordHash = hashPassword(password);
  if (await passwordDipakai(passwordHash)) return 'Password sudah dipakai user lain. Pakai yang berbeda.';

  let dealerNightIds: string[] | null;
  let depotCodes: string[] | null;
  let wilayah: string | null;
  try {
    dealerNightIds = await bacaCakupanDealerNight(formData, role, me);
    depotCodes = await bacaCakupanDepot(formData, dealerNightIds);
    wilayah = bacaWilayah(formData, role, me);
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
    depotCodes,
    bolehUnduh: formData.get('bolehUnduh') === 'on',
    wilayah,
    createdBy: me.id,
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
  const target = await targetKelola(me, userId);
  if (!target) return 'User tidak ditemukan atau bukan user yang Anda buat.';
  if (role === 'superadmin' && me.id !== userId && !superAdminPusat(me)) return SUPERADMIN_PUSAT_SAJA;
  if (await namaDipakai(fullName, userId)) return NAMA_GANDA;

  let dealerNightIds: string[] | null;
  let depotCodes: string[] | null;
  let wilayah: string | null;
  try {
    dealerNightIds = await bacaCakupanDealerNight(formData, role, me);
    depotCodes = await bacaCakupanDepot(formData, dealerNightIds);
    wilayah = bacaWilayah(formData, role, me, target);
  } catch (error) {
    return error instanceof Error ? error.message : 'Dealer Night tidak valid.';
  }

  const values: {
    email: string | null;
    fullName: string;
    role: Role;
    allowedPages: string[];
    dealerNightIds: string[] | null;
    depotCodes: string[] | null;
    bolehUnduh: boolean;
    wilayah: string | null;
    passwordHash?: string;
  } = {
    email: email || null,
    fullName,
    role,
    allowedPages: bacaHalaman(formData),
    dealerNightIds,
    depotCodes,
    bolehUnduh: formData.get('bolehUnduh') === 'on',
    wilayah,
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
  if (!(await targetKelola(me, userId))) throw new Error('User tidak ditemukan atau bukan user yang Anda buat.');
  await db.delete(profiles).where(eq(profiles.id, userId));
  lupakanProfil(userId);
  revalidatePath('/admin/users');
}
