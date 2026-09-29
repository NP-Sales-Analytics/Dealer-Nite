import { TargetLeaderboard } from '@/components/target/target-leaderboard';
import { requireHalaman } from '@/lib/auth';
import { dealerNightOptionsFor } from '@/lib/target/dealer-night-options';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const user = await requireHalaman('/leaderboard');
  const dealerNights = await dealerNightOptionsFor(user);
  return (
    <TargetLeaderboard
      dealerNights={dealerNights}
      initialDealerNightId={user.dealerNightId ?? dealerNights[0]?.id ?? ''}
      fixedDealerNight={user.role === 'dn_user'}
    />
  );
}
