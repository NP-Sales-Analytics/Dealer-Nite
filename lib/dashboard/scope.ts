import type { SessionUser } from '@/lib/auth';
import { resolveDealerNightId } from '@/lib/target/access';

export function resolveDashboardDealerNight(
  user: Pick<SessionUser, 'role' | 'dealerNightId'>,
  requestedId: string | null,
) {
  return resolveDealerNightId(user, requestedId);
}
