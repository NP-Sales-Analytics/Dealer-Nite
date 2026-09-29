import { describe, expect, it } from 'vitest';
import { labelDealerNightAccess } from '@/lib/access';

describe('labelDealerNightAccess', () => {
  it('labels global roles as all Dealer Nights', () => {
    expect(labelDealerNightAccess('management', null, null)).toBe('Semua Dealer Night');
  });

  it('shows the assigned Dealer Night for a DN account', () => {
    expect(labelDealerNightAccess('dn_user', 'dn-bogor', 'DN Bogor')).toBe('DN Bogor');
  });

  it('makes missing DN assignment visible', () => {
    expect(labelDealerNightAccess('dn_user', null, null)).toBe('Belum ditentukan');
  });
});
