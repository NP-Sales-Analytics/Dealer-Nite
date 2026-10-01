import { describe, expect, it } from 'vitest';
import { labelDealerNightAccess } from '@/lib/access';

const options = [{ id: 'dn-bogor', name: 'DN Bogor' }, { id: 'dn-bandung', name: 'DN Bandung' }];

describe('labelDealerNightAccess', () => {
  it('labels unscoped accounts as all Dealer Nights', () => {
    expect(labelDealerNightAccess({ role: 'management', dealerNightIds: null }, options)).toBe('Semua Dealer Night');
  });

  it('lists the assigned Dealer Nights by name', () => {
    expect(labelDealerNightAccess({ role: 'admin', dealerNightIds: ['dn-bogor', 'dn-bandung'] }, options))
      .toBe('DN Bogor, DN Bandung');
  });

  it('makes missing assignment visible', () => {
    expect(labelDealerNightAccess({ role: 'dn_user', dealerNightIds: [] }, options)).toBe('Belum ditentukan');
  });
});
