import type { SessionUser } from '@/lib/auth';
import { resolveDealerNightId } from '@/lib/target/access';

export function resolveDashboardDealerNight(
  user: Pick<SessionUser, 'role' | 'dealerNightIds'>,
  requestedId: string | null,
) {
  return resolveDealerNightId(user, requestedId);
}
