import { LeaderboardClient } from '@/components/leaderboard/leaderboard-client';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  await requireHalaman('/leaderboard');
  return <LeaderboardClient />;
}
