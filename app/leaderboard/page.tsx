import { LeaderboardClient } from '@/components/leaderboard/leaderboard-client';
import { QueryProvider } from '@/components/shared/query-provider';

export default function LeaderboardPage() {
  return (
    <QueryProvider>
      <LeaderboardClient />
    </QueryProvider>
  );
}
