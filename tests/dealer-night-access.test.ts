import { describe, expect, it } from 'vitest';
import { canAdjustTarget, canReadDealerNight } from '@/lib/access';

describe('Dealer Night authorization', () => {
  it('limits dn_user to its assigned Dealer Night', () => {
    const user = { role: 'dn_user', dealerNightId: 'bogor' } as const;
    expect(canReadDealerNight(user, 'bogor')).toBe(true);
    expect(canReadDealerNight(user, 'bandung')).toBe(false);
    expect(canAdjustTarget(user, 'bogor')).toBe(false);
  });

  it.each(['superadmin', 'admin'] as const)('%s may adjust every Dealer Night', (role) => {
    expect(canReadDealerNight({ role, dealerNightId: null }, 'bogor')).toBe(true);
    expect(canAdjustTarget({ role, dealerNightId: null }, 'bogor')).toBe(true);
  });

  it.each(['marketing', 'management'] as const)('%s is read-only', (role) => {
    expect(canReadDealerNight({ role, dealerNightId: null }, 'bogor')).toBe(true);
    expect(canAdjustTarget({ role, dealerNightId: null }, 'bogor')).toBe(false);
  });

  it('rejects an unassigned dn_user', () => {
    const user = { role: 'dn_user', dealerNightId: null } as const;
    expect(canReadDealerNight(user, 'bogor')).toBe(false);
    expect(canAdjustTarget(user, 'bogor')).toBe(false);
  });
});
