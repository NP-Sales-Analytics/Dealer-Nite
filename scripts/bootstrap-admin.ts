import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, mysqlPool } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { hashPassword } from '@/lib/password';

async function main() {
  const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD ?? '').trim();
  const fullName = String(process.env.BOOTSTRAP_ADMIN_NAME ?? 'Super Admin').trim();
  if (password.length < 8) throw new Error('BOOTSTRAP_ADMIN_PASSWORD minimal 8 karakter.');
  if (!fullName) throw new Error('BOOTSTRAP_ADMIN_NAME wajib diisi.');

  const passwordHash = hashPassword(password);
  const [passwordOwner] = await db
    .select({ id: profiles.id, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.passwordHash, passwordHash))
    .limit(1);
  const [existingAdmin] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.role, 'superadmin'))
    .limit(1);

  if (passwordOwner && passwordOwner.id !== existingAdmin?.id) {
    throw new Error('Password bootstrap sudah dipakai akun lain.');
  }

  if (existingAdmin) {
    await db.update(profiles).set({
      fullName,
      passwordHash,
      role: 'superadmin',
      dealerNightIds: null,
    }).where(eq(profiles.id, existingAdmin.id));
  } else {
    await db.insert(profiles).values({
      id: randomUUID(),
      email: null,
      fullName,
      passwordHash,
      role: 'superadmin',
      allowedPages: [],
      dealerNightIds: null,
      bolehUnduh: true,
    });
  }

  console.log('Akun superadmin siap.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mysqlPool.end());
