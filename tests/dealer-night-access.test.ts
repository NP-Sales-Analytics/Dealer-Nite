import { describe, expect, it } from 'vitest';
import { canAdjustTarget, canReadDealerNight } from '@/lib/access';

describe('Dealer Night authorization', () => {
  it('limits a scoped account to its Dealer Nights', () => {
    const user = { role: 'dn_user', dealerNightIds: ['bogor'] } as const;
    expect(canReadDealerNight(user, 'bogor')).toBe(true);
    expect(canReadDealerNight(user, 'bandung')).toBe(false);
    expect(canAdjustTarget(user, 'bogor')).toBe(false);
  });

  it('lets a scoped admin adjust only its own Dealer Night', () => {
    const user = { role: 'admin', dealerNightIds: ['bandung'] } as const;
    expect(canAdjustTarget(user, 'bandung')).toBe(true);
    expect(canAdjustTarget(user, 'bogor')).toBe(false);
  });

  it('supports several Dealer Nights on one account', () => {
    const user = { role: 'marketing', dealerNightIds: ['bogor', 'bandung'] } as const;
    expect(canReadDealerNight(user, 'bandung')).toBe(true);
    expect(canReadDealerNight(user, 'medan')).toBe(false);
  });

  it.each(['superadmin', 'admin'] as const)('%s with all scope may adjust every Dealer Night', (role) => {
    expect(canReadDealerNight({ role, dealerNightIds: null }, 'bogor')).toBe(true);
    expect(canAdjustTarget({ role, dealerNightIds: null }, 'bogor')).toBe(true);
  });

  it('superadmin ignores a stale scope list', () => {
    expect(canReadDealerNight({ role: 'superadmin', dealerNightIds: [] }, 'bogor')).toBe(true);
  });

  it.each(['marketing', 'management'] as const)('%s is read-only', (role) => {
    expect(canReadDealerNight({ role, dealerNightIds: null }, 'bogor')).toBe(true);
    expect(canAdjustTarget({ role, dealerNightIds: null }, 'bogor')).toBe(false);
  });

  it('rejects an account without any Dealer Night', () => {
    const user = { role: 'dn_user', dealerNightIds: [] } as const;
    expect(canReadDealerNight(user, 'bogor')).toBe(false);
    expect(canAdjustTarget(user, 'bogor')).toBe(false);
  });
});
