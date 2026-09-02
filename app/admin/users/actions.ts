'use server';

import { createClient as createAdminClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireRole, type Role } from '@/lib/auth';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';

const ROLES: Role[] = ['superadmin', 'admin_rsvp', 'rsm', 'customer'];

// Service role key hanya hidup di server action ini.
function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function createUser(_prev: string | null, formData: FormData): Promise<string | null> {
  await requireRole(['superadmin']);

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('fullName') ?? '').trim();
  const role = String(formData.get('role') ?? '') as Role;

  if (!email.includes('@')) return 'Email tidak valid.';
  if (password.length < 8) return 'Password minimal 8 karakter.';
  if (!ROLES.includes(role)) return 'Role tidak valid.';

  const { error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (error) return error.message;

  revalidatePath('/admin/users');
  return null;
}

export async function changeRole(userId: string, role: Role) {
  await requireRole(['superadmin']);
  if (!ROLES.includes(role)) throw new Error('Role tidak valid');
  await db.update(profiles).set({ role }).where(eq(profiles.id, userId));
  revalidatePath('/admin/users');
}

export async function deleteUser(userId: string) {
  const me = await requireRole(['superadmin']);
  if (me.id === userId) throw new Error('Tidak bisa menghapus akun sendiri');
  const { error } = await adminClient().auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/users');
}
