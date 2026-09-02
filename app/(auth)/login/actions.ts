'use server';

import { redirect } from 'next/navigation';
import { getSessionUser, HOME_BY_ROLE } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function signIn(_prev: string | null, formData: FormData): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  });
  if (error) return 'Email atau password salah.';

  const user = await getSessionUser();
  redirect(user ? HOME_BY_ROLE[user.role] : '/no-access');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
