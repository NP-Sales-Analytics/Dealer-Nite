import { LeaderboardClient } from '@/components/leaderboard/leaderboard-client';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const user = await requireHalaman('/leaderboard');
  // Perannya ditentukan di server, bukan ditebak dari bentuk payload: customer
  // dan tim kini memakai endpoint yang berbeda, jadi klien harus tahu sejak awal
  // mana yang harus dipanggil.
  return <LeaderboardClient tampilanCustomer={user.role === 'customer'} />;
}
