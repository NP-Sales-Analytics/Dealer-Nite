import { canAdjustTarget, canReadDealerNight } from '@/lib/access';
import type { SessionUser } from '@/lib/auth';

export class TargetAccessError extends Error {
  constructor(public readonly code: 'DEALER_NIGHT_REQUIRED' | 'FORBIDDEN') {
    super(code === 'DEALER_NIGHT_REQUIRED' ? 'Dealer Night wajib dipilih.' : 'Tidak punya akses ke Dealer Night ini.');
    this.name = 'TargetAccessError';
  }
}

export function resolveDealerNightId(
  user: Pick<SessionUser, 'role' | 'dealerNightId'>,
  requestedId: string | null,
): string {
  if (user.role === 'dn_user') {
    if (!user.dealerNightId) throw new TargetAccessError('FORBIDDEN');
    if (requestedId && requestedId !== user.dealerNightId) throw new TargetAccessError('FORBIDDEN');
    return user.dealerNightId;
  }
  if (!requestedId) throw new TargetAccessError('DEALER_NIGHT_REQUIRED');
  return requestedId;
}

export function requireTargetRead(
  user: Pick<SessionUser, 'role' | 'dealerNightId'>,
  dealerNightId: string,
) {
  if (!canReadDealerNight(user, dealerNightId)) throw new TargetAccessError('FORBIDDEN');
}

export function requireTargetAdjustment(
  user: Pick<SessionUser, 'role' | 'dealerNightId'>,
  dealerNightId: string,
) {
  if (!canAdjustTarget(user, dealerNightId)) throw new TargetAccessError('FORBIDDEN');
}
