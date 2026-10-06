'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { HOME_BY_ROLE, type Role } from '@/lib/auth';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { hashPassword, normalisasiNama } from '@/lib/password';
import { rateLimit } from '@/lib/rate-limit';
import { clearSessionCookie, setSessionCookie } from '@/lib/session';

const GAGAL = 'Username atau password salah.';

export async function signIn(_prev: string | null, formData: FormData): Promise<string | null> {
  const username = normalisasiNama(String(formData.get('username') ?? ''));
  const password = String(formData.get('password') ?? '').trim();
  if (!username || !password) return 'Masukkan username dan password.';

  // Dikunci per username, BUKAN per IP. Di venue seluruh tamu berbagi satu IP
  // NAT wifi, jadi kunci per-IP akan mengunci SATU RUANGAN sekaligus tepat pada
  // jam kedatangan. Yang perlu direm adalah tebak-tebakan password terhadap
  // satu akun, dan itu persis yang dihitung di sini.
  const { ok } = await rateLimit(`login:${username}`);
  if (!ok) return 'Terlalu banyak percobaan. Coba lagi sebentar.';

  // Password unik (unique index) jadi akun dicari lewat hash-nya, lalu username
  // harus cocok dengan nama lengkap akun itu. Satu pesan untuk semua kegagalan
  // supaya tidak membocorkan mana yang benar: username atau password.
  const [akun] = await db
    .select({ id: profiles.id, role: profiles.role, fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.passwordHash, hashPassword(password)))
    .limit(1);
  if (!akun || normalisasiNama(akun.fullName) !== username) return GAGAL;

  await setSessionCookie(akun.id);
  redirect(HOME_BY_ROLE[akun.role as Role]);
}

export async function signOut() {
  await clearSessionCookie();
  redirect('/login');
}
