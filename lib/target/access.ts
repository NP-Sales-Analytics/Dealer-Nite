import { aksesSemuaDealerNight, bolehDepot, canAdjustTarget, canReadDealerNight } from '@/lib/access';
import type { SessionUser } from '@/lib/auth';

export class TargetAccessError extends Error {
  constructor(public readonly code: 'DEALER_NIGHT_REQUIRED' | 'FORBIDDEN') {
    super(code === 'DEALER_NIGHT_REQUIRED' ? 'Dealer Night wajib dipilih.' : 'Tidak punya akses ke Dealer Night ini.');
    this.name = 'TargetAccessError';
  }
}

type Principal = Pick<SessionUser, 'role' | 'dealerNightIds'> & Partial<Pick<SessionUser, 'depotCodes'>>;

export function resolveDealerNightId(user: Principal, requestedId: string | null): string {
  if (requestedId) {
    if (!canReadDealerNight(user, requestedId)) throw new TargetAccessError('FORBIDDEN');
    return requestedId;
  }
  if (!aksesSemuaDealerNight(user) && user.dealerNightIds!.length === 1) return user.dealerNightIds![0];
  throw new TargetAccessError('DEALER_NIGHT_REQUIRED');
}

export function requireTargetRead(
  user: Principal,
  dealerNightId: string,
  depotCode?: string,
) {
  if (!canReadDealerNight(user, dealerNightId)) throw new TargetAccessError('FORBIDDEN');
  if (depotCode !== undefined && !bolehDepot(user, depotCode)) throw new TargetAccessError('FORBIDDEN');
}

export function requireTargetAdjustment(
  user: Principal,
  dealerNightId: string,
  depotCode?: string,
) {
  if (!canAdjustTarget(user, dealerNightId)) throw new TargetAccessError('FORBIDDEN');
  if (depotCode !== undefined && !bolehDepot(user, depotCode)) throw new TargetAccessError('FORBIDDEN');
}
