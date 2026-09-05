'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { HOME_BY_ROLE, type Role } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers, profiles } from '@/lib/db/schema';
import { hashPassword } from '@/lib/password';
import { rateLimit } from '@/lib/rate-limit';
import { clearSessionCookie, setSessionCookie } from '@/lib/session';

export async function signIn(_prev: string | null, formData: FormData): Promise<string | null> {
  const credential = String(formData.get('credential') ?? '').trim();
  if (!credential) return 'Masukkan password atau Kode SAP.';

  // Dikunci pada kredensial yang dicoba, BUKAN pada IP. Di venue seluruh tamu
  // berbagi satu IP NAT wifi, jadi kunci per-IP akan mengunci SATU RUANGAN
  // sekaligus tepat pada jam kedatangan. Yang memang perlu direm adalah
  // tebak-tebakan terhadap satu kredensial, dan itu persis yang dihitung di sini.
  //
  // Yang dipakai hash-nya, bukan kredensial mentah: kunci Redis bisa terlihat di
  // dashboard/log, dan kredensial itu password sungguhan.
  const { ok } = await rateLimit(`login:${hashPassword(credential)}`);
  if (!ok) return 'Terlalu banyak percobaan. Coba lagi sebentar.';

  // Tim: password unik = pengenal. Dicek lebih dulu; kalau cocok, ini akun tim.
  const [team] = await db
    .select({ id: profiles.id, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.passwordHash, hashPassword(credential)))
    .limit(1);
  if (team) {
    await setSessionCookie('team', team.id);
    redirect(HOME_BY_ROLE[team.role as Role]);
  }

  // Customer: kode_sap.
  const [cust] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.kodeSap, credential))
    .limit(1);
  if (cust) {
    await setSessionCookie('customer', cust.id);
    redirect('/leaderboard');
  }

  return 'Password atau Kode SAP salah.';
}

export async function signOut() {
  await clearSessionCookie();
  redirect('/login');
}
