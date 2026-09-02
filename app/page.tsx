import { redirect } from 'next/navigation';
import { getSessionUser, HOME_BY_ROLE } from '@/lib/auth';

export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? HOME_BY_ROLE[user.role] : '/login');
}
